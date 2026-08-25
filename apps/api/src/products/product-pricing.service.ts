import { Injectable } from '@nestjs/common';
import { computeProductPricing } from '@solar-shop/db';
import { PrismaService } from '../prisma/prisma.service';
import type { ParserRunCache } from '../parser/parser-run-cache';

@Injectable()
export class ProductPricingService {
  constructor(private readonly prisma: PrismaService) {}

  // Пересчёт кэша одного товара — вызывается после: апдейта SourceListing
  // парсером (цена/наличие изменились), связывания/отвязывания siblings в
  // модерации (ТЗ п.13.2), смены порога акций (ТЗ п.18.2).
  //
  // `opts` (опційно) — контекст прогону парсера. `knownCategory` прибирає
  // зайвий product.findUnique (парсер уже знає категорію товару з
  // матчингу), `cache` тримає пороги PromoSettings, які за час прогону не
  // змінюються. Без opts поведінка ідентична попередній.
  async recalculate(
    productId: string,
    opts?: { knownCategory?: string | null; cache?: ParserRunCache },
  ): Promise<void> {
    const threshold = await this.getThresholdForProduct(productId, opts);

    const listings = await this.prisma.client.productListing.findMany({
      where: { productId },
      include: { sourceListing: { include: { vendor: true } } },
    });

    const pricing = computeProductPricing(
      listings.map((l) => ({
        priceUsd: Number(l.sourceListing.priceUsd),
        inStock: l.sourceListing.inStock,
        vendorWarehouseCities: l.sourceListing.vendor.warehouseCities,
      })),
      threshold,
    );

    await this.prisma.client.product.update({
      where: { id: productId },
      data: {
        cachedCostPriceUsd: pricing.cachedCostPriceUsd,
        cachedPriceUsd: pricing.cachedPriceUsd,
        cachedInStock: pricing.cachedInStock,
        cachedWarehouseCities: pricing.cachedWarehouseCities,
        cachedIsPromo: pricing.cachedIsPromo,
        cachedDiscountPercent: pricing.cachedDiscountPercent,
        pricingUpdatedAt: new Date(),
      },
    });
  }

  // Массовый пересчёт (после смены порога акций в админке или суточного
  // promo_recalc крон-джоба, ТЗ п.18.2/п.27.1) — по всем товарам с >=1 листингом.
  async recalculateAll(): Promise<{ processed: number }> {
    const products = await this.prisma.client.product.findMany({
      where: { listings: { some: {} } },
      select: { id: true },
    });
    for (const p of products) {
      await this.recalculate(p.id);
    }
    return { processed: products.length };
  }

  private async getThresholdForProduct(
    productId: string,
    opts?: { knownCategory?: string | null; cache?: ParserRunCache },
  ): Promise<number> {
    const cache = opts?.cache;

    // Категорія: або вже відома викликаючому (матчинг парсера її щойно
    // вирішив), або кешована з попереднього перерахунку цього ж прогону,
    // або, як і раніше, окремий запит.
    let category: string | null;
    if (opts && 'knownCategory' in opts && opts.knownCategory !== undefined) {
      category = opts.knownCategory;
    } else if (cache?.categoryByProductId.has(productId)) {
      category = cache.categoryByProductId.get(productId) ?? null;
    } else {
      const product = await this.prisma.client.product.findUnique({
        where: { id: productId },
        select: { category: true },
      });
      category = product?.category ?? null;
    }
    cache?.categoryByProductId.set(productId, category);

    // Порог з кешу прогону — PromoSettings міняються в адмінці, не під
    // час прогону парсера, тож достатньо одного запиту на категорію.
    if (cache) {
      const cachedCategoryThreshold = category === null ? undefined : cache.promoThresholdByCategory.get(category);
      const needCategoryFetch = category !== null && cachedCategoryThreshold === undefined;
      const needGlobalFetch = cache.globalPromoThreshold === undefined;

      if (needCategoryFetch || needGlobalFetch) {
        const [fetchedCategory, fetchedGlobal] = await Promise.all([
          needCategoryFetch
            ? this.prisma.client.promoSettings.findUnique({ where: { category: category as string } })
            : null,
          needGlobalFetch ? this.prisma.client.promoSettings.findFirst({ where: { category: null } }) : null,
        ]);
        if (needCategoryFetch) {
          cache.promoThresholdByCategory.set(category as string, fetchedCategory?.thresholdPercent ?? null);
        }
        if (needGlobalFetch) {
          cache.globalPromoThreshold = fetchedGlobal?.thresholdPercent ?? null;
        }
      }

      const categoryThreshold = category === null ? null : cache.promoThresholdByCategory.get(category) ?? null;
      return categoryThreshold ?? cache.globalPromoThreshold ?? 10;
    }

    const [categoryOverride, global] = await Promise.all([
      category !== null
        ? this.prisma.client.promoSettings.findUnique({ where: { category } })
        : null,
      // Знайдено при реальній Docker-збірці: `category` — nullable
      // (`ProductCategory?`), а `findUnique` по nullable unique-полю НЕ
      // приймає `null` як шукане значення (SQL: кілька рядків можуть мати
      // NULL, тому NULL не ідентифікує рядок однозначно — Prisma
      // забороняє це на рівні типів навіть попри те, що сам стовпець
      // nullable). `findFirst` не має цього обмеження — семантично те
      // саме тут (глобальний override — один рядок за конвенцією
      // застосунку, хоч і не гарантовано на рівні БД).
      this.prisma.client.promoSettings.findFirst({ where: { category: null } }),
    ]);

    return categoryOverride?.thresholdPercent ?? global?.thresholdPercent ?? 10;
  }
}
