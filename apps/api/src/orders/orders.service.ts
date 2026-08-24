import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CartService } from '../cart/cart.service';
import { ProductsService } from '../products/products.service';
import { LoyaltyService } from '../loyalty/loyalty.service';
import { NovaPoshtaService } from '../nova-poshta/nova-poshta.service';
import { NotifyService } from '../notify/notify.service';
import { InvoiceService } from '../invoice/invoice.service';
import { DeliveryContactDto, BuyNowDto } from './dto/checkout.dto';

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cart: CartService,
    private readonly products: ProductsService,
    private readonly loyalty: LoyaltyService,
    private readonly novaPoshta: NovaPoshtaService,
    private readonly notify: NotifyService,
    private readonly invoice: InvoiceService,
  ) {}

  // ТЗ п.19.2 — оформление из корзины, доступно и гостю.
  async checkoutFromCart(userId: string | null, sessionId: string | null, dto: DeliveryContactDto) {
    this.assertConsent(dto);

    const cart = await this.cart.getCart(userId, sessionId);
    if (!cart.items || cart.items.length === 0) throw new BadRequestException('Cart is empty');

    const items = cart.items.map((i) => ({
      productId: i.productId,
      listingId: i.listingId,
      quantity: i.quantity,
      priceUsd: Number(i.priceSnapshot),
    }));

    const order = await this.createOrder(userId, items, dto);
    await this.cart.clearCart(cart.id);
    return order;
  }

  // ТЗ п.3.3/19.2 — "Купить в 1 клик", создаёт Order из одной позиции без корзины.
  async buyNow(userId: string | null, dto: BuyNowDto) {
    this.assertConsent(dto);

    const cheapest = await this.products.getCheapestInStockListing(dto.productId);
    if (!cheapest) throw new BadRequestException('Product has no in-stock listing right now');

    const items = [
      {
        productId: dto.productId,
        listingId: cheapest.sourceListingId,
        quantity: dto.quantity ?? 1,
        priceUsd: Number(cheapest.sourceListing.priceUsd),
      },
    ];

    return this.createOrder(userId, items, dto);
  }

  private assertConsent(dto: DeliveryContactDto) {
    // ТЗ п.28.6 — обязательный чекбокс согласия на обработку ПД, валидация и на бэке
    if (!dto.consentGiven) {
      throw new BadRequestException('Consent to personal data processing is required');
    }
  }

  private async createOrder(
    userId: string | null,
    items: { productId: string; listingId: string | null; quantity: number; priceUsd: number }[],
    dto: DeliveryContactDto,
  ) {
    const subtotalUsd = items.reduce((sum, i) => sum + i.priceUsd * i.quantity, 0);
    const loyaltyDiscountPercent = await this.loyalty.getDiscountForUser(userId);

    // За прямим запитом користувача — "считать заказ комплекта по
    // самому дешевому (внутренняя цена) и по этому второму варианту
    // (публичная цена)... выводить на вкладке profit обе цены".
    // Знімок cachedCostPriceUsd САМЕ на момент оформлення замовлення —
    // ціни постачальників змінюються з часом, для вкладки "Прибуток"
    // по СТАРОМУ замовленню потрібна ціна ТОДІ, не поточна.
    const products = await this.prisma.client.product.findMany({
      where: { id: { in: items.map((i) => i.productId) } },
      select: { id: true, cachedCostPriceUsd: true },
    });
    const costByProductId = new Map(products.map((p) => [p.id, p.cachedCostPriceUsd]));

    const rate = await this.prisma.client.exchangeRate.findFirst({
      where: { currency: 'USD' },
      orderBy: { rateDate: 'desc' },
    });
    const exchangeRateUah = rate ? Number(rate.rateUah) : 41.5; // безопасный фолбэк, если курс ещё не засеян

    const totalUsd = subtotalUsd * (1 - loyaltyDiscountPercent / 100);
    const totalUah = totalUsd * exchangeRateUah;

    const order = await this.prisma.client.order.create({
      data: {
        userId: userId ?? undefined,
        contactName: dto.contactName,
        contactPhone: dto.contactPhone,
        comment: dto.comment,
        subtotalUsd,
        loyaltyDiscountPercent,
        totalUsd,
        exchangeRateUah,
        totalUah,
        source: dto.source,
        consentGivenAt: new Date(),
        npCityRef: dto.npCityRef,
        npCityName: dto.npCityName,
        npWarehouseRef: dto.npWarehouseRef,
        npWarehouseName: dto.npWarehouseName,
        npRecipientName: dto.contactName,
        npRecipientPhone: dto.contactPhone,
        items: {
          create: items.map((i) => ({
            productId: i.productId,
            listingId: i.listingId,
            quantity: i.quantity,
            priceUsd: i.priceUsd,
            costPriceUsd: costByProductId.get(i.productId) ?? undefined,
          })),
        },
      },
      include: { items: { include: { product: true } } },
    });

    // ТЗ п.22.2 — ТТН создаётся сразу, до оплаты; ошибка НЕ блокирует заказ.
    // Адаптер (портирован из SilverFinance) сам не бросает исключение при
    // сбое — возвращает { status: 'failed' }, поэтому try/catch здесь не
    // нужен, но notifyTtnCreationFailed всё равно вызываем при неудаче.
    if (dto.npCityName && (dto.npWarehouseRef || dto.npWarehouseName)) {
      const ttn = await this.novaPoshta.createTtn({
        recipientName: dto.contactName,
        recipientPhone: dto.contactPhone,
        cityName: dto.npCityName,
        warehouseRef: dto.npWarehouseRef,
        branchName: dto.npWarehouseName ?? '',
        description: order.items.map((i) => i.product.articleNumber).join(', '),
        costUah: totalUah,
      });
      if (ttn.status === 'created' && ttn.ttn) {
        await this.prisma.client.order.update({
          where: { id: order.id },
          data: { ttnNumber: ttn.ttn, ttnRef: ttn.uuid, ttnStatus: 'RESERVED' },
        });
      } else {
        this.logger.warn(`TTN auto-creation failed for order ${order.id}: ${ttn.error}`);
        await this.notify.notifyTtnCreationFailed(order.id, ttn.error ?? 'unknown error');
      }
    }

    await this.notify.notifyNewOrder({
      id: order.id,
      contactName: order.contactName,
      contactPhone: order.contactPhone,
      totalUah: Number(order.totalUah),
      itemsSummary: order.items.map((i) => `${i.product.name} × ${i.quantity}`).join(', '),
    });

    return this.findById(order.id);
  }

  async findById(id: string) {
    const order = await this.prisma.client.order.findUnique({
      where: { id },
      include: { items: { include: { product: true } } },
    });
    if (!order) throw new NotFoundException('Order not found');
    return order;
  }

  // ТЗ п.23.1 — /account/orders, только свои заказы
  findMyOrders(userId: string) {
    return this.prisma.client.order.findMany({
      where: { userId },
      include: { items: { include: { product: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  findAllForAdmin(status?: string) {
    return this.prisma.client.order.findMany({
      where: status ? { status: status as never } : undefined,
      include: { items: { include: { product: true } }, user: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ТЗ п.19.3 — NEW → INVOICED → PAID → SHIPPED, ручной переключатель менеджера.
  async updateStatus(id: string, status: 'NEW' | 'INVOICED' | 'PAID' | 'SHIPPED' | 'CANCELLED') {
    const order = await this.findById(id);

    const data: { status: typeof status; ttnStatus?: 'READY_TO_SHIP' } = { status };
    if (status === 'PAID' && order.ttnStatus === 'RESERVED') {
      data.ttnStatus = 'READY_TO_SHIP'; // сигнал складу, что можно передавать перевозчику (ТЗ п.22.2 шаг 5)
    }

    const updated = await this.prisma.client.order.update({ where: { id }, data });

    if (status === 'PAID') {
      if (order.userId) await this.loyalty.recalculateLifetimeSpend(order.userId);
      await this.notify.notifyOrderPaid(id);
    }

    return updated;
  }

  // ТЗ п.21 — "Сформировать счёт" (если не сгенерирован автоматически)
  async generateInvoice(id: string) {
    const order = await this.findById(id);
    const url = await this.invoice.generateAndStore(id);
    await this.prisma.client.order.update({
      where: { id },
      data: { invoicePdfUrl: url, status: order.status === 'NEW' ? 'INVOICED' : undefined },
    });
    return { invoicePdfUrl: url };
  }

  // ТЗ п.22.4 — ручное создание ТТН, если автосоздание не сработало
  async createTtnManually(id: string) {
    const order = await this.findById(id);
    if (!order.npCityName || (!order.npWarehouseRef && !order.npWarehouseName)) {
      throw new BadRequestException('Order has no delivery city/warehouse set');
    }
    const ttn = await this.novaPoshta.createTtn({
      recipientName: order.contactName,
      recipientPhone: order.contactPhone,
      cityName: order.npCityName,
      warehouseRef: order.npWarehouseRef ?? undefined,
      branchName: order.npWarehouseName ?? '',
      description: order.items.map((i) => i.product.articleNumber).join(', '),
      costUah: Number(order.totalUah),
    });
    if (ttn.status !== 'created' || !ttn.ttn) {
      throw new BadRequestException(`Nova Poshta: ${ttn.error ?? 'failed to create TTN'}`);
    }
    return this.prisma.client.order.update({
      where: { id },
      data: { ttnNumber: ttn.ttn, ttnRef: ttn.uuid, ttnStatus: 'RESERVED' },
    });
  }

  async printLabel(id: string) {
    const order = await this.findById(id);
    if (!order.ttnRef) throw new BadRequestException('Order has no TTN yet');
    const url = await this.novaPoshta.getPrintLabelUrl([order.ttnRef]);
    await this.prisma.client.order.update({ where: { id }, data: { ttnLabelUrl: url } });
    return { ttnLabelUrl: url };
  }

  async cancelTtn(id: string) {
    const order = await this.findById(id);
    if (!order.ttnRef) throw new BadRequestException('Order has no TTN to cancel');
    await this.novaPoshta.deleteTtn(order.ttnRef);
    return this.prisma.client.order.update({ where: { id }, data: { ttnStatus: 'CANCELLED' } });
  }
}
