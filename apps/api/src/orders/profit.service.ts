import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NovaPoshtaService } from '../nova-poshta/nova-poshta.service';

// За прямим запитом користувача — "выводить на вкладке profit обе
// цены и разницу которую мы заработаем, и статус заказа".
export interface OrderProfitRow {
  orderId: string;
  status: string;
  createdAt: Date;
  contactName: string;
  costUsd: number; // сума собівартості (внутрішня)
  publicUsd: number; // сума публічної ціни (те, за чим порахував калькулятор/виставлено рахунок)
  profitUsd: number;
  // Скільки позицій замовлення не мають відомої собівартості (старі
  // замовлення до цієї фічі) — profitUsd для НИХ занижений/неточний,
  // чесно позначено, не приховано мовчазним нулем.
  itemsWithUnknownCost: number;
  hasNoProfitItems: boolean;
}

// За прямим запитом користувача — реалізація doc/TZ_ImportScout.md
// розділ 3.1/3.2: "визначення кандидатів на основі вже наявних даних
// проєкту". Обидва нижче — НОВА агрегація на рівні ТОВАРУ (не
// замовлення, як OrderProfitRow вище).
export interface ProductProfitRow {
  productId: string;
  productName: string;
  totalProfitUsd: number;
  unitsSold: number;
}

export interface ProductSalesRow {
  productId: string;
  productName: string;
  unitsSold: number;
  ordersCount: number;
}

@Injectable()
export class ProfitService {
  private readonly logger = new Logger(ProfitService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly novaPoshta: NovaPoshtaService,
  ) {}

  // За прямим запитом користувача — "считать заказ комплекта по
  // самому дешевому (внутренняя цена) и по этому второму варианту
  // (публичная цена)... выводить на вкладке profit обе цены и разницу
  // которую мы заработаем, и статус заказа".
  async getOrdersWithProfit(): Promise<OrderProfitRow[]> {
    const orders = await this.prisma.client.order.findMany({
      orderBy: { createdAt: 'desc' },
      include: { items: true },
    });

    return orders.map((order) => {
      let costUsd = 0;
      let publicUsd = 0;
      let itemsWithUnknownCost = 0;
      let hasNoProfitItems = false;

      for (const item of order.items) {
        const priceUsd = Number(item.priceUsd);
        publicUsd += priceUsd * item.quantity;

        if (item.costPriceUsd === null) {
          itemsWithUnknownCost++;
          continue;
        }
        const cost = Number(item.costPriceUsd);
        costUsd += cost * item.quantity;
        if (cost >= priceUsd) hasNoProfitItems = true;
      }

      return {
        orderId: order.id,
        status: order.status,
        createdAt: order.createdAt,
        contactName: order.contactName,
        costUsd: Math.round(costUsd * 100) / 100,
        publicUsd: Math.round(publicUsd * 100) / 100,
        profitUsd: Math.round((publicUsd - costUsd) * 100) / 100,
        itemsWithUnknownCost,
        hasNoProfitItems,
      };
    });
  }

  // За прямим запитом користувача — "все позиции заказа без прибыли
  // делегируем другим поставщикам и генерируем отдельно ТТН для
  // каждого из них". ЧЕСНО про реальність архітектури: Vendor НЕ має
  // власних Nova Poshta Sender Ref (лише текстовий contactAddress) —
  // API Нової Пошти вимагає ЗАРЕЄСТРОВАНОГО відправника в ЇХНІЙ
  // системі, простого текстового адресу постачальника недостатньо.
  // Тому "делегування" тут означає: обрати АЛЬТЕРНАТИВНЕ джерело
  // товару (інший listing/vendor) для позицій без прибутку, і
  // відправити їх ОКРЕМОЮ посилкою (власний ТТН) — фізичний
  // відправник у Новій Пошті лишається НАШ (SenderRef з .env), НЕ
  // справжній drop-shipping від імені стороннього постачальника.

  // За прямим запитом користувача — реалізація doc/TZ_ImportScout.md
  // розділ 3.1: "SUM(profitUsd) GROUP BY productId за період". Той
  // самий принцип, що getOrdersWithProfit() вище — агрегація в JS
  // (не Prisma groupBy(), який не підтримує обчислений SUM((a-b)*c)
  // напряму), не raw SQL — узгоджено з рештою проєкту, де raw SQL
  // ніде не використовується.
  async getTopProductsByProfit(days = 90, limit = 10): Promise<ProductProfitRow[]> {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const items = await this.prisma.client.orderItem.findMany({
      where: { order: { status: { not: 'CANCELLED' }, createdAt: { gte: since } } },
      include: { product: { select: { name: true } } },
    });

    const byProduct = new Map<string, ProductProfitRow>();
    for (const item of items) {
      if (item.costPriceUsd === null) continue; // немає знімку собівартості — цю позицію не можна включити в прибуток чесно
      const profit = (Number(item.priceUsd) - Number(item.costPriceUsd)) * item.quantity;
      const row = byProduct.get(item.productId) ?? {
        productId: item.productId,
        productName: item.product.name,
        totalProfitUsd: 0,
        unitsSold: 0,
      };
      row.totalProfitUsd += profit;
      row.unitsSold += item.quantity;
      byProduct.set(item.productId, row);
    }

    return [...byProduct.values()]
      .map((r) => ({ ...r, totalProfitUsd: Math.round(r.totalProfitUsd * 100) / 100 }))
      .sort((a, b) => b.totalProfitUsd - a.totalProfitUsd)
      .slice(0, limit);
  }

  // За прямим запитом користувача — реалізація doc/TZ_ImportScout.md
  // розділ 3.2: "COUNT(OrderItem) GROUP BY productId за той самий
  // період".
  async getTopProductsBySales(days = 90, limit = 10): Promise<ProductSalesRow[]> {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const items = await this.prisma.client.orderItem.findMany({
      where: { order: { status: { not: 'CANCELLED' }, createdAt: { gte: since } } },
      include: { product: { select: { name: true } } },
    });

    const byProduct = new Map<string, ProductSalesRow & { orderIds: Set<string> }>();
    for (const item of items) {
      const row = byProduct.get(item.productId) ?? {
        productId: item.productId,
        productName: item.product.name,
        unitsSold: 0,
        ordersCount: 0,
        orderIds: new Set<string>(),
      };
      row.unitsSold += item.quantity;
      row.orderIds.add(item.orderId);
      byProduct.set(item.productId, row);
    }

    return [...byProduct.values()]
      .map(({ orderIds, ...r }) => ({ ...r, ordersCount: orderIds.size }))
      .sort((a, b) => b.unitsSold - a.unitsSold)
      .slice(0, limit);
  }

  async delegateNoProfitOrders(): Promise<{
    ordersScanned: number;
    itemsDelegated: number;
    itemsWithNoAlternative: number;
    delegationsCreated: number;
    ttnCreated: number;
    ttnFailed: number;
  }> {
    const result = {
      ordersScanned: 0,
      itemsDelegated: 0,
      itemsWithNoAlternative: 0,
      delegationsCreated: 0,
      ttnCreated: 0,
      ttnFailed: 0,
    };

    // Тільки замовлення, що ще НЕ відправлені (SHIPPED/CANCELLED —
    // пізно щось делегувати, товар уже або в дорозі, або скасовано).
    const orders = await this.prisma.client.order.findMany({
      where: { status: { in: ['NEW', 'INVOICED', 'PAID'] } },
      include: { items: { include: { product: { include: { listings: { include: { sourceListing: { include: { vendor: true } } } } } } } } },
    });
    result.ordersScanned = orders.length;

    for (const order of orders) {
      // Групуємо позиції БЕЗ прибутку цього замовлення за ОБРАНИМ
      // альтернативним постачальником — одна делегація (і один ТТН)
      // на кожного постачальника В МЕЖАХ цього замовлення.
      const byVendor = new Map<string, { vendorId: string; itemIds: string[] }>();

      for (const item of order.items) {
        if (item.delegationId) continue; // вже делеговано раніше — не робимо повторно
        const cost = item.costPriceUsd !== null ? Number(item.costPriceUsd) : null;
        const isNoProfit = cost === null || cost >= Number(item.priceUsd);
        if (!isNoProfit) continue;

        // Шукаємо АЛЬТЕРНАТИВНИЙ listing (інший постачальник, НЕ той,
        // що вже прив'язаний до цієї позиції) — найдешевший серед
        // залишку в наявності.
        const alternatives = item.product.listings
          .filter((l) => l.sourceListing.inStock && l.sourceListingId !== item.listingId)
          .sort((a, b) => Number(a.sourceListing.priceUsd) - Number(b.sourceListing.priceUsd));

        if (alternatives.length === 0) {
          result.itemsWithNoAlternative++;
          this.logger.warn(
            `Order ${order.id}: item for product ${item.productId} has no profit and no alternative vendor to delegate to`,
          );
          continue;
        }

        const vendorId = alternatives[0].sourceListing.vendorId;
        const group: { vendorId: string; itemIds: string[] } = byVendor.get(vendorId) ?? { vendorId, itemIds: [] };
        group.itemIds.push(item.id);
        byVendor.set(vendorId, group);
        result.itemsDelegated++;
      }

      for (const group of byVendor.values()) {
        const delegation = await this.prisma.client.orderDelegation.create({
          data: {
            orderId: order.id,
            vendorId: group.vendorId,
            items: { connect: group.itemIds.map((id) => ({ id })) },
          },
        });
        result.delegationsCreated++;

        // За прямим запитом користувача — "генерируем отдельно ТТН
        // для каждого из них". Той самий createTtn(), що вже для
        // основної відправки замовлення (розділ вище) — окрема
        // посилка на цю групу позицій.
        const delegatedItems = order.items.filter((i) => group.itemIds.includes(i.id));
        const description = delegatedItems.map((i) => i.product.name).join(', ').slice(0, 100);
        const costUah = delegatedItems.reduce((sum, i) => sum + Number(i.priceUsd) * i.quantity, 0) * Number(order.exchangeRateUah);

        const ttnResult = await this.novaPoshta.createTtn({
          recipientName: order.npRecipientName ?? order.contactName,
          recipientPhone: order.npRecipientPhone ?? order.contactPhone,
          cityName: order.npCityName ?? '',
          warehouseRef: order.npWarehouseRef ?? undefined,
          branchName: order.npWarehouseName ?? '',
          description: description || 'Товари Solar Shop',
          costUah,
        });

        if (ttnResult.status === 'created') {
          await this.prisma.client.orderDelegation.update({
            where: { id: delegation.id },
            data: { ttnNumber: ttnResult.ttn, ttnRef: ttnResult.uuid, ttnStatus: 'RESERVED' },
          });
          result.ttnCreated++;
        } else {
          this.logger.warn(`TTN creation failed for delegation ${delegation.id}: ${ttnResult.error}`);
          result.ttnFailed++;
        }
      }
    }

    return result;
  }

  // За прямим запитом користувача — "OrderDelegation не имеет пути
  // просмотра — данные в БД есть, но нет GET-эндпоинта и UI для
  // просмотра, какому поставщику что делегировано. Исправь". Знахідка
  // з аудиту (розділ 112 README): дані реально зберігались у БД
  // одразу після `delegateNoProfitOrders()`, але без цього методу
  // менеджер бачив лише миттєву агреговану статистику результату дії
  // й БІЛЬШЕ НІКОЛИ не міг подивитись деталі.
  async getDelegations() {
    return this.prisma.client.orderDelegation.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        order: { select: { id: true, contactName: true, status: true } },
        vendor: { select: { id: true, name: true } },
        items: { include: { product: { select: { name: true, articleNumber: true } } } },
      },
    });
  }
}
