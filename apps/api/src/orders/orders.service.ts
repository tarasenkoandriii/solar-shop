import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CartService } from '../cart/cart.service';
import { ProductsService } from '../products/products.service';
import { LoyaltyService } from '../loyalty/loyalty.service';
import { NovaPoshtaService } from '../nova-poshta/nova-poshta.service';
import { NotifyService } from '../notify/notify.service';
import { InvoiceService } from '../invoice/invoice.service';
import { DeliveryContactDto, BuyNowDto } from './dto/checkout.dto';
import { roundToCents } from '../common/money';

// Аудит 27.08.2026 — стеля знижки лояльності. Див. коментар у місці
// застосування: DTO тира не мав @Max(100) взагалі.
const MAX_LOYALTY_DISCOUNT_PERCENT = 90;

// Пороги свіжості курсу. Два, а не один, і це важливо.
//
// Перша версія цієї правки блокувала замовлення вже на трьох добах — і це
// був би регулярний простій магазину на порожньому місці: НБУ не
// встановлює курс у вихідні й свята, тож у понеділок вранці "вік"
// останнього запису штатно дорівнює ~81 годині, а на травневих чи
// новорічних — і більше. Ми б відмовляли покупцям у цілком робочій
// ситуації.
//
// Тому: 2 доби — гучний лог (щось із кроном не так, але курс ще
// правдоподібний, продаємо далі), 8 діб — відмова (це вже не свята, це
// зупинений крон, і рахувати по такому курсу не можна).
const RATE_STALE_WARN_MS = 2 * 24 * 60 * 60 * 1000;
const RATE_STALE_BLOCK_MS = 8 * 24 * 60 * 60 * 1000;

// АУДИТ 27.08.2026. Дві речі одразу.
//
// 1. `include: { product: true }` тягнув увесь рядок Product разом із
//    cachedCostPriceUsd — нашою закупівельною ціною. Це і є те, що
//    toCustomerView() вимушено чистив постфактум.
// 2. Водночас images НЕ підвантажувалися взагалі, а сторінка замовлення
//    в особистому кабінеті читає `item.product.images[0]` — тобто падала
//    на `undefined[0]`. Дві протилежні помилки в одному include: зайве
//    віддавали, потрібне ні.
//
// Явний select лікує обидві та ще й робить toCustomerView() страховкою,
// а не єдиним захистом.
const ORDER_PRODUCT_SELECT = {
  id: true,
  slug: true,
  name: true,
  articleNumber: true,
  category: true,
  images: { orderBy: { sortOrder: 'asc' as const } },
};

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

    // Аудит 27.08.2026: наявність перевірялася ЛИШЕ при додаванні в кошик,
    // а тут позиції бралися як є. Товар, розібраний постачальником за той
    // час, поки кошик лежав, усе одно оформлявся. ("Купити в 1 клік" цієї
    // проблеми не мав — там листинг запитується на кожному чекауті.)
    //
    // Ціну беремо зі снапшота, а не поточну: кошик — це домовленість, і
    // мовчки дорожчати між "додав" і "оформив" не повинен. Перевіряємо
    // саме наявність.
    //
    // Паралельно, а не послідовним циклом: getPurchaseTerms — це мінімум
    // два запити до БД на позицію, і на кошику з 20 позицій послідовне
    // очікування додало б ~40 round-trip'ів підряд ще ДО синхронного
    // виклику Нової Пошти. Позиції між собою не залежать.
    const stockChecks = await Promise.all(
      cart.items.map(async (item) => ({
        item,
        terms: await this.products.getPurchaseTerms(item.productId),
      })),
    );
    const outOfStock = stockChecks.filter((c) => !c.terms).map((c) => c.item.product?.name ?? c.item.productId);
    if (outOfStock.length > 0) {
      throw new BadRequestException(`Немає в наявності: ${outOfStock.join(', ')}. Прибери ці позиції з кошика й спробуй ще раз.`);
    }

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

    // Аудит 27.08.2026: тут бралася ціна найдешевшого листинга, тобто наша
    // собівартість замість вітринної ціни — див. ProductsService.getPurchaseTerms().
    const terms = await this.products.getPurchaseTerms(dto.productId);
    if (!terms) throw new BadRequestException('Product has no in-stock listing right now');

    const items = [
      {
        productId: dto.productId,
        listingId: terms.listingId,
        quantity: dto.quantity ?? 1,
        priceUsd: terms.priceUsd,
      },
    ];

    return this.createOrder(userId, items, dto);
  }

  // АУДИТ 27.08.2026. Було так:
  //   const rate = await findFirst({ orderBy: { rateDate: 'desc' } });
  //   const exchangeRateUah = rate ? Number(rate.rateUah) : 41.5;
  //
  // Дві проблеми в двох рядках. Перша: findFirst повертає ОСТАННІЙ запис,
  // хоч би якої давності — перевірки свіжості не було, тож зупинений крон
  // nbu_rate_sync означав замовлення за курсом місячної давності, і ніде
  // жодного сліду. Друга: захардкоджений фолбек 41.5 при порожній таблиці —
  // тобто на новому оточенні перше ж замовлення рахувалося за вигаданим
  // курсом. Обидві гілки були мовчазні, і це на тлі вже впійманої історії
  // з гривнями, записаними як долари.
  //
  // Тепер два пороги — див. коментар до RATE_STALE_WARN_MS/BLOCK_MS: на
  // порожню таблицю й на справді мертвий курс відмовляємо, на "два дні
  // тиші" гучно пишемо в лог, але продаємо далі (вихідні й свята — це
  // штатна ситуація, а не привід зупиняти магазин).
  private async resolveExchangeRate(): Promise<number> {
    const rate = await this.prisma.client.exchangeRate.findFirst({
      where: { currency: 'USD' },
      orderBy: { rateDate: 'desc' },
    });

    if (!rate) {
      this.logger.error('Таблиця ExchangeRate порожня — курс USD невідомий. Запусти крон nbu_rate_sync (адмінка → Крони) або засій курс вручну.');
      throw new BadRequestException('Курс валют тимчасово недоступний. Спробуй, будь ласка, за кілька хвилин або зателефонуй нам.');
    }

    const ageMs = Date.now() - new Date(rate.rateDate).getTime();
    const days = Math.floor(ageMs / (24 * 60 * 60 * 1000));
    const on = new Date(rate.rateDate).toISOString().slice(0, 10);

    if (ageMs > RATE_STALE_BLOCK_MS) {
      this.logger.error(`Курс USD востаннє оновлювався ${days} дн. тому (${on}). Це вже не вихідні — крон nbu_rate_sync не відпрацьовує. Замовлення заблоковані, щоб не рахувати їх за застарілим курсом.`);
      // Менеджер має дізнатися про це не з логів: тут магазин фактично
      // перестав приймати замовлення.
      await this.notify.notifyCronFailed('nbu_rate_sync', `Курс USD не оновлювався ${days} дн. (останній — ${on}). ОФОРМЛЕННЯ ЗАМОВЛЕНЬ ЗУПИНЕНО.`).catch(() => undefined);
      throw new BadRequestException('Курс валют тимчасово недоступний. Спробуй, будь ласка, за кілька хвилин або зателефонуй нам.');
    }

    if (ageMs > RATE_STALE_WARN_MS) {
      this.logger.error(`Курс USD востаннє оновлювався ${days} дн. тому (${on}). Якщо це не свята — перевір крон nbu_rate_sync. Замовлення поки приймаємо.`);
    }

    return Number(rate.rateUah);
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
    const subtotalUsd = roundToCents(items.reduce((sum, i) => sum + i.priceUsd * i.quantity, 0));
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

    const exchangeRateUah = await this.resolveExchangeRate();

    // Аудит 27.08.2026: знижка не мала верхньої межі НІДЕ — ні в
    // LoyaltyTier DTO (@Min(0) без @Max), ні в сервісі, ні тут. Тир зі
    // знижкою 150% давав відʼємну суму замовлення. Обрізаємо на місці
    // застосування, а не тільки в DTO: тири могли бути заведені до цієї
    // правки, і зіпсовані дані вже лежать у базі.
    const safeDiscountPercent = Math.min(Math.max(loyaltyDiscountPercent, 0), MAX_LOYALTY_DISCOUNT_PERCENT);
    if (safeDiscountPercent !== loyaltyDiscountPercent) {
      this.logger.error(`Знижка лояльності ${loyaltyDiscountPercent}% виходить за межі 0..${MAX_LOYALTY_DISCOUNT_PERCENT} — обрізано до ${safeDiscountPercent}%. Перевір налаштування тирів лояльності.`);
    }

    // Аудит 27.08.2026: округлення до копійок саме тут, у точці запису.
    // Колонки — Decimal(10,2), але вся арифметика над ними йде через
    // Number(), тобто через плаваючу кому: 1000 * (1 - 90/100) дає
    // 99.99999999999997, а не 100 (перевірено). Prisma такий "хвіст"
    // мовчки обріже при записі, тож у базі опиниться одне число, а в
    // листі покупцю й у розрахунку прибутку — інше. Округлюємо явно й
    // однаково для всіх трьох сум.
    const totalUsd = roundToCents(subtotalUsd * (1 - safeDiscountPercent / 100));
    const totalUah = roundToCents(totalUsd * exchangeRateUah);

    const order = await this.prisma.client.order.create({
      data: {
        userId: userId ?? undefined,
        contactName: dto.contactName,
        contactPhone: dto.contactPhone,
        comment: dto.comment,
        subtotalUsd,
        // Саме safeDiscountPercent, а не вихідний loyaltyDiscountPercent:
        // інакше в базі опинявся б заказ зі знижкою "150%" і сумою,
        // порахованою по 90% — самосуперечливий запис, який ще й
        // друкується покупцю в PDF-рахунку ("враховано знижку постійного
        // клієнта: 150%") поруч із сумою, що йому не відповідає.
        loyaltyDiscountPercent: safeDiscountPercent,
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
      include: { items: { include: { product: { select: ORDER_PRODUCT_SELECT } } } },
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

    return this.toCustomerView(await this.findById(order.id));
  }

  // УВАГА: віддає замовлення ЯК Є, разом із внутрішніми полями
  // (OrderItem.costPriceUsd, Product.cachedCostPriceUsd, delegation).
  // Призначений для адмінки та внутрішніх викликів (рахунок, ТТН, статус).
  // Для будь-якої відповіді покупцю обгортай у toCustomerView() — див.
  // коментар там.
  async findById(id: string) {
    const order = await this.prisma.client.order.findUnique({
      where: { id },
      include: { items: { include: { product: { select: ORDER_PRODUCT_SELECT } } } },
    });
    if (!order) throw new NotFoundException('Order not found');
    return order;
  }

  // АУДИТ 27.08.2026: відповідь на POST /orders/checkout і /orders/buy-now
  // (обидва під OptionalAuthGuard, тобто доступні гостю) поверталася прямо
  // з findById — а там `include: { product: true }` тягне ВЕСЬ рядок
  // Product, включно з cachedCostPriceUsd ("внутрішня собівартість, НІКОЛИ
  // не показується публічно", schema.prisma:207-210), плюс власний
  // OrderItem.costPriceUsd. Покупець бачив закупівельну ціну й нашу маржу
  // по кожній позиції, просто відкривши вкладку "Мережа" при оформленні.
  //
  // Чистимо на виході, а не в запиті, свідомо: findById переюзаний
  // адмінкою й внутрішніми викликами, де ці поля ПОТРІБНІ, і рознесення
  // на два різні include розійшлося б при першій же зміні схеми.
  private toCustomerView<T extends { items: Record<string, unknown>[] }>(order: T): T {
    return {
      ...order,
      items: order.items.map((item) => {
        // delegationId — теж внутрішнє: покупцю не треба знати, що його
        // позицію відвантажує інший постачальник (і який саме).
        const { costPriceUsd: _cost, delegationId: _delegation, product, ...publicItem } = item as Record<string, unknown> & {
          product?: Record<string, unknown> | null;
        };
        return {
          ...publicItem,
          product: product ? this.toPublicProduct(product) : product,
        };
      }),
    } as T;
  }

  private toPublicProduct(product: Record<string, unknown>): Record<string, unknown> {
    const { cachedCostPriceUsd: _cost, ...rest } = product;
    return rest;
  }

  // ТЗ п.23.1 — /account/orders, только свои заказы
  async findMyOrders(userId: string) {
    const orders = await this.prisma.client.order.findMany({
      where: { userId },
      include: { items: { include: { product: { select: ORDER_PRODUCT_SELECT } } } },
      orderBy: { createdAt: 'desc' },
    });
    return orders.map((o) => this.toCustomerView(o));
  }

  // Те саме замовлення, але для особистого кабінету — без внутрішніх полів.
  async findByIdForCustomer(id: string, userId: string) {
    const order = await this.findById(id);
    // Чужі замовлення не існують з погляду кабінету — саме 404, а не 403:
    // інакше перебором id можна дізнатися, які замовлення взагалі є.
    if (order.userId !== userId) throw new NotFoundException('Order not found');
    return this.toCustomerView(order);
  }

  findAllForAdmin(status?: string) {
    return this.prisma.client.order.findMany({
      where: status ? { status: status as never } : undefined,
      include: { items: { include: { product: { select: ORDER_PRODUCT_SELECT } } }, user: true },
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

  // Аудит 27.08.2026: повертає САМ PDF, а не посилання. Раніше тут
  // будувався URL із NOVA_POSHTA_API_KEY усередині, віддавався в браузер і
  // ще й зберігався в Order.ttnLabelUrl — ключ від створення й видалення
  // накладних лежав у базі та в історії браузера. Колонку ttnLabelUrl
  // більше не пишемо; старі значення варто затерти разовим апдейтом:
  //   UPDATE "Order" SET "ttnLabelUrl" = NULL WHERE "ttnLabelUrl" IS NOT NULL;
  // і — оскільки ключ уже засвітився — перевипустити його в кабінеті НП.
  async printLabel(id: string): Promise<Buffer> {
    const order = await this.findById(id);
    if (!order.ttnRef) throw new BadRequestException('Order has no TTN yet');
    return this.novaPoshta.fetchPrintLabelPdf([order.ttnRef]);
  }

  async cancelTtn(id: string) {
    const order = await this.findById(id);
    if (!order.ttnRef) throw new BadRequestException('Order has no TTN to cancel');
    await this.novaPoshta.deleteTtn(order.ttnRef);
    return this.prisma.client.order.update({ where: { id }, data: { ttnStatus: 'CANCELLED' } });
  }
}
