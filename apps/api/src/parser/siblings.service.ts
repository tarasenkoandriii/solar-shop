import { Injectable } from '@nestjs/common';
import {
  computeProductPricing,
  extractSpecsFromTitle,
  MATCH_GREY_ZONE_MIN,
  MATCH_AUTO_THRESHOLD,
  MatchType,
  ProductStatus,
  specsCompatible,
  titleSimilarity,
} from '@solar-shop/db';
import { PrismaService } from '../prisma/prisma.service';
import { ProductPricingService } from '../products/product-pricing.service';

export interface SiblingCandidate {
  sourceListingId: string;
  rawTitle: string;
  vendorName: string;
  productId: string;
  productName: string;
  confidence: number;
  // За прямим запитом користувача — "модифицировать логику siblings".
  // Раз саме НАБІР listings товару тепер визначає собівартість/
  // публічну ціну/прибуток (розділ README про cachedCostPriceUsd) —
  // модератор має бачити, ЯК прив'язка КОНКРЕТНО ЦЬОГО кандидата
  // вплине на ціни ДО прийняття рішення, не дізнаватись про це
  // постфактум.
  priceImpact: {
    currentCostUsd: number | null;
    currentPublicUsd: number | null;
    projectedCostUsd: number | null;
    projectedPublicUsd: number | null;
  };
}

@Injectable()
export class SiblingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly pricing: ProductPricingService,
  ) {}

  // Экран «Кандидаты в siblings» (ТЗ п.13.2 шаг 4) — незаматченные листинги
  // с confidence в серой зоне против опубликованных товаров. Вычисляется
  // на лету (см. AUDIT.md по поводу масштабируемости при росте каталога).
  async getCandidates(): Promise<SiblingCandidate[]> {
    // За запитом користувача — seed-дані як окремий "постачальник" із
    // excludeFromMatching: true (packages/db/prisma/seed.ts) — явний
    // захист, щоб його листинги ніколи не потрапляли в чергу модерації.
    // Насправді вони й так одразу матчаться в самому seed.ts (MANUAL,
    // без confidence), тому цей фільтр — оборона на майбутнє, не
    // виправлення реальної помилки, що вже траплялась.
    const unmatchedListings = await this.prisma.client.sourceListing.findMany({
      where: { products: { none: {} }, vendor: { excludeFromMatching: false } },
      include: { vendor: true },
    });
    if (unmatchedListings.length === 0) return [];

    const products = await this.prisma.client.product.findMany({ where: { status: ProductStatus.PUBLISHED } });
    const rejectedRows = await this.prisma.client.rejectedMatch.findMany();
    const rejectedSet = new Set(rejectedRows.map((r) => `${r.sourceListingId}:${r.productId}`));

    // За прямим запитом користувача — "модифицировать логику
    // siblings" — один batch-запит замість N+1 (розділ AUDIT.md вже
    // попереджає про масштабованість цього екрану) для превью впливу
    // на ціну.
    const existingListings = await this.prisma.client.productListing.findMany({
      where: { productId: { in: products.map((p) => p.id) } },
      include: { sourceListing: { include: { vendor: true } } },
    });
    const listingsByProductId = new Map<string, typeof existingListings>();
    for (const l of existingListings) {
      const arr = listingsByProductId.get(l.productId) ?? [];
      arr.push(l);
      listingsByProductId.set(l.productId, arr);
    }

    const candidates: SiblingCandidate[] = [];

    for (const listing of unmatchedListings) {
      const specs = extractSpecsFromTitle(listing.rawTitle);
      let best: SiblingCandidate | null = null;

      for (const product of products) {
        if (rejectedSet.has(`${listing.id}:${product.id}`)) continue;
        if (!specsCompatible(specs, extractSpecsFromTitle(product.name))) continue;

        const confidence = titleSimilarity(listing.rawTitle, product.name);
        if (confidence < MATCH_GREY_ZONE_MIN || confidence >= MATCH_AUTO_THRESHOLD) continue; // авто-порог уже отработал в MatchingService

        if (!best || confidence > best.confidence) {
          const existing = listingsByProductId.get(product.id) ?? [];
          const currentPricing = computeProductPricing(
            existing.map((l) => ({
              priceUsd: Number(l.sourceListing.priceUsd),
              inStock: l.sourceListing.inStock,
              vendorWarehouseCities: l.sourceListing.vendor.warehouseCities,
            })),
            10, // спрощений дефолтний поріг для превью — точний per-category розрахунок відбудеться при confirmMatch()
          );
          const projectedPricing = computeProductPricing(
            [
              ...existing.map((l) => ({
                priceUsd: Number(l.sourceListing.priceUsd),
                inStock: l.sourceListing.inStock,
                vendorWarehouseCities: l.sourceListing.vendor.warehouseCities,
              })),
              { priceUsd: Number(listing.rawPrice), inStock: listing.inStock, vendorWarehouseCities: listing.vendor.warehouseCities },
            ],
            10,
          );

          best = {
            sourceListingId: listing.id,
            rawTitle: listing.rawTitle,
            vendorName: listing.vendor.name,
            productId: product.id,
            productName: product.name,
            confidence,
            priceImpact: {
              currentCostUsd: currentPricing.cachedCostPriceUsd,
              currentPublicUsd: currentPricing.cachedPriceUsd,
              projectedCostUsd: projectedPricing.cachedCostPriceUsd,
              projectedPublicUsd: projectedPricing.cachedPriceUsd,
            },
          };
        }
      }

      if (best) candidates.push(best);
    }

    return candidates.sort((a, b) => b.confidence - a.confidence);
  }

  // «Это один товар» — создаёт ProductListing с MANUAL (ТЗ п.13.2 шаг 4)
  //
  // Знайдено 20.08.2026 за прямим запитом користувача ("учитывают ли эти
  // парсеры товаров изменения по загрузке изображений") — той самий
  // пробіл, що вже виправлений у MatchingService.linkListing(): картинки
  // SourceListing ніколи не копіювались на Product при ручному
  // підтвердженні матчу адміном. Backfill лише якщо товар ще не має
  // жодної картинки — не перезаписуємо вручну підібрані фото.
  async confirmMatch(sourceListingId: string, productId: string) {
    await this.prisma.client.productListing.create({
      data: { sourceListingId, productId, matchType: MatchType.MANUAL, matchConfidence: null, isPrimary: false },
    });

    const listing = await this.prisma.client.sourceListing.findUnique({
      where: { id: sourceListingId },
      select: { images: true },
    });
    if (listing && listing.images.length > 0) {
      const existingCount = await this.prisma.client.productImage.count({ where: { productId } });
      if (existingCount === 0) {
        await this.prisma.client.productImage.createMany({
          data: listing.images.map((url, i) => ({ productId, url, sortOrder: i, sourceListingId })),
        });
      }
    }

    await this.pricing.recalculate(productId);
    return { ok: true };
  }

  // «Разные товары» — помечает отклонённым, чтобы не предлагать повторно
  async rejectMatch(sourceListingId: string, productId: string) {
    await this.prisma.client.rejectedMatch.upsert({
      where: { sourceListingId_productId: { sourceListingId, productId } },
      create: { sourceListingId, productId },
      update: {},
    });
    return { ok: true };
  }
}
