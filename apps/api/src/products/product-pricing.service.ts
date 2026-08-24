import { Injectable } from '@nestjs/common';
import { computeProductPricing } from '@solar-shop/db';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ProductPricingService {
  constructor(private readonly prisma: PrismaService) {}

  // Пересчёт кэша одного товара — вызывается после: апдейта SourceListing
  // парсером (цена/наличие изменились), связывания/отвязывания siblings в
  // модерации (ТЗ п.13.2), смены порога акций (ТЗ п.18.2).
  async recalculate(productId: string): Promise<void> {
    const threshold = await this.getThresholdForProduct(productId);

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

  private async getThresholdForProduct(productId: string): Promise<number> {
    const product = await this.prisma.client.product.findUnique({
      where: { id: productId },
      select: { category: true },
    });

    const [categoryOverride, global] = await Promise.all([
      product
        ? this.prisma.client.promoSettings.findUnique({ where: { category: product.category } })
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
