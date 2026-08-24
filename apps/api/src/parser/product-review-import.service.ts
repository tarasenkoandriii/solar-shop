import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ReviewAdapterRegistry } from './review-adapter-registry';
import { normalizeRating, hashReviewContent } from './adapters/scrape-utils';

export interface ProductReviewImportResult {
  productsChecked: number;
  listingsChecked: number;
  listingsSkippedByTimeBudget: number;
  reviewsFound: number;
  reviewsCreated: number;
  vendorsWithNoAdapter: string[];
  elapsedMs: number;
  // За прямим запитом користувача — той самий принцип "діагностика
  // замість чергового здогаду", що вже для RSS-картинок статей
  // (розділ README) — коли адаптер НЕ знаходить ЖОДНОГО відгуку на
  // сторінці товару (де листинг реально існує), варто зафіксувати це
  // для подальшого калібрування селекторів на реальних даних, а не
  // мовчки пропустити.
  emptyResultUrls: { vendorName: string; url: string }[];
}

@Injectable()
export class ProductReviewImportService {
  private readonly logger = new Logger(ProductReviewImportService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly adapters: ReviewAdapterRegistry,
  ) {}

  // За прямим запитом користувача — "добавить парсер отзывов на
  // товары відповідно до магазину... сделаем дебаг через консоль -
  // крон завис в раннинг". РЕАЛЬНИЙ прояв: цей метод БУВ послідовним
  // циклом БЕЗ тайм-боксування (на відміну від pvgis_country_grid/
  // business_plan_batch_processor — той самий клас проблеми, якого
  // архітектура проєкту вже свідомо уникає в інших джобах, тут
  // недогледіли при першій реалізації розділу README про парсер
  // відгуків). Кожен окремий HTTP-запит вже обмежений (15с + до 2
  // ретраїв у fetchWithRetry, до 20с headless-фолбек) — АЛЕ за
  // десятки listings послідовно це підсумовується в хвилини-годину,
  // що і виглядає як "завис" у списку кронів. Виправлено тим самим
  // тайм-боксованим підходом (~200с бюджет, safety margin під
  // найгірший випадок одного URL).
  async runImport(timeBudgetMs = 200_000): Promise<ProductReviewImportResult> {
    const startedAt = Date.now();
    // Найгірший випадок одного listing: fetchCategoryPageHtml
    // (retries=2, timeoutMs=15_000 → до ~46.5с) + можливий headless-
    // фолбек (до 20с) ≈ 67с. Запас 70с — трохи більше цього
    // найгіршого випадку, не довільне число (той самий принцип
    // обґрунтування, що вже SAFETY_MARGIN_MS у solar-map.service.ts).
    const SAFETY_MARGIN_MS = 70_000;

    const result: ProductReviewImportResult = {
      productsChecked: 0,
      listingsChecked: 0,
      listingsSkippedByTimeBudget: 0,
      reviewsFound: 0,
      reviewsCreated: 0,
      vendorsWithNoAdapter: [],
      elapsedMs: 0,
      emptyResultUrls: [],
    };

    const listings = await this.prisma.client.productListing.findMany({
      include: { product: true, sourceListing: { include: { vendor: true } } },
    });

    const seenVendorsWithoutAdapter = new Set<string>();
    const seenProductIds = new Set<string>();

    for (const listing of listings) {
      if (Date.now() - startedAt >= timeBudgetMs - SAFETY_MARGIN_MS) {
        result.listingsSkippedByTimeBudget = listings.length - result.listingsChecked;
        this.logger.log(
          `Time budget reached, stopping early: ${result.listingsChecked}/${listings.length} listings checked, ${result.listingsSkippedByTimeBudget} left for next run`,
        );
        break;
      }

      seenProductIds.add(listing.productId);
      result.listingsChecked++;

      const vendorName = listing.sourceListing.vendor.name;
      const adapter = this.adapters.getByVendorName(vendorName);
      if (!adapter) {
        if (!seenVendorsWithoutAdapter.has(vendorName)) {
          seenVendorsWithoutAdapter.add(vendorName);
          result.vendorsWithNoAdapter.push(vendorName);
        }
        continue;
      }

      let scraped: Awaited<ReturnType<typeof adapter.scrapeReviews>>;
      try {
        scraped = await adapter.scrapeReviews(listing.sourceListing.sourceUrl);
      } catch (err) {
        this.logger.warn(`Review scrape failed for ${listing.sourceListing.sourceUrl}: ${err instanceof Error ? err.message : err}`);
        continue;
      }

      if (scraped.length === 0) {
        result.emptyResultUrls.push({ vendorName, url: listing.sourceListing.sourceUrl });
        continue;
      }

      result.reviewsFound += scraped.length;

      for (const r of scraped) {
        const contentHash = hashReviewContent(r.authorName, r.reviewText);
        const existing = await this.prisma.client.importedProductReview.findUnique({
          where: { productId_vendorName_contentHash: { productId: listing.productId, vendorName, contentHash } },
        });
        if (existing) continue;

        await this.prisma.client.importedProductReview.create({
          data: {
            productId: listing.productId,
            vendorName,
            sourceUrl: listing.sourceListing.sourceUrl,
            authorName: r.authorName,
            ratingRaw: r.ratingRaw,
            ratingNormalized: r.ratingRaw !== undefined ? normalizeRating(r.ratingRaw, r.ratingScaleMax ?? 5) : undefined,
            reviewText: r.reviewText,
            publishedAtRaw: r.publishedAtRaw,
            contentHash,
          },
        });
        result.reviewsCreated++;
      }
    }

    result.productsChecked = seenProductIds.size;
    result.elapsedMs = Date.now() - startedAt;
    return result;
  }
}
