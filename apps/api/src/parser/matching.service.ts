import { Injectable, Logger } from '@nestjs/common';
import {
  extractManufacturerSkuCandidate,
  extractSpecsFromTitle,
  MATCH_AUTO_THRESHOLD,
  MATCH_GREY_ZONE_MIN,
  MatchType,
  ProductStatus,
  specsCompatible,
  titleSimilarity,
  type ExtractedSpecs,
} from '@solar-shop/db';
import { PrismaService } from '../prisma/prisma.service';
import { GrokService } from '../grok/grok.service';
import { ProductPricingService } from '../products/product-pricing.service';
import { CategoryService } from '../products/category.service';

export interface MatchCandidate {
  productId: string;
  productName: string;
  confidence: number;
}

@Injectable()
export class MatchingService {
  private readonly logger = new Logger(MatchingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly grok: GrokService,
    private readonly pricing: ProductPricingService,
    private readonly categories: CategoryService,
  ) {}

  // Точка входа пайплайна парсера (ТЗ п.13.2, шаги 3-5) — вызывается для
  // каждого нового/изменившегося SourceListing после upsert'а.
  async matchListing(sourceListingId: string): Promise<void> {
    const listing = await this.prisma.client.sourceListing.findUniqueOrThrow({
      where: { id: sourceListingId },
    });

    // Уже привязан к какому-то Product — повторно не матчим.
    const existingLink = await this.prisma.client.productListing.findFirst({ where: { sourceListingId } });
    if (existingLink) return;

    const extractedSpecs = extractSpecsFromTitle(listing.rawTitle);
    const skuCandidate = extractManufacturerSkuCandidate(listing.rawTitle);
    // За прямим запитом користувача ("сохранять сырые категории с
    // сайтов и матчить с существующими... если явного соответствия нет
    // добавить категорию на модерацию") — раніше тут був прямий каст
    // `as 'SOLAR_PANEL'|'BATTERY'|'CONTROLLER'`, що сліпо довіряв
    // внутрішньому ключу пошуку. Тепер — реальна перевірка через
    // CategoryService: якщо siteCategoryLabel (як сайт сам показує
    // категорію) не збігається з очікуваним — товар піде під ключем
    // PENDING-категорії, не під звичним SOLAR_PANEL/BATTERY/CONTROLLER.
    const category = await this.categories.resolveCategoryKey(listing.rawCategory ?? '', listing.siteCategoryLabel);

    // 1. SKU_EXACT — совпадение по извлечённому manufacturerSku в рамках категории
    if (skuCandidate) {
      const skuMatch = await this.prisma.client.product.findFirst({
        where: { manufacturerSku: skuCandidate, ...(category ? { category } : {}) },
      });
      if (skuMatch) {
        await this.linkListing(listing.id, skuMatch.id, MatchType.SKU_EXACT, 1, listing.images);
        return;
      }
    }

    // 2. FUZZY_NAME кандидаты — среди опубликованных товаров той же категории
    // с совместимыми числовыми характеристиками (жёсткий фильтр, ТЗ п.13.2)
    const rejected = await this.prisma.client.rejectedMatch.findMany({
      where: { sourceListingId: listing.id },
      select: { productId: true },
    });
    const rejectedIds = new Set(rejected.map((r) => r.productId));

    const candidates = await this.prisma.client.product.findMany({
      where: { status: ProductStatus.PUBLISHED, ...(category ? { category } : {}) },
    });

    let best: MatchCandidate | null = null;
    for (const candidate of candidates) {
      if (rejectedIds.has(candidate.id)) continue;
      const candidateSpecs = extractSpecsFromTitle(candidate.name);
      if (!specsCompatible(extractedSpecs, candidateSpecs)) continue;

      const confidence = titleSimilarity(listing.rawTitle, candidate.name);
      if (!best || confidence > best.confidence) {
        best = { productId: candidate.id, productName: candidate.name, confidence };
      }
    }

    if (best && best.confidence >= MATCH_AUTO_THRESHOLD) {
      await this.linkListing(listing.id, best.productId, MatchType.FUZZY_NAME, best.confidence, listing.images);
      return;
    }

    if (best && best.confidence >= MATCH_GREY_ZONE_MIN) {
      // Серая зона (ТЗ п.13.2) — прогоняем через Grok перед очередью модерации,
      // чтобы сократить объём ручной работы админа.
      const grokResult = await this.grok.matchListingToProduct(listing.rawTitle, best.productName).catch((err) => {
        this.logger.warn(`Grok match check failed, falling back to manual queue: ${err}`);
        return null;
      });

      if (grokResult?.isMatch && grokResult.confidence >= MATCH_AUTO_THRESHOLD) {
        await this.linkListing(listing.id, best.productId, MatchType.GROK_LLM, grokResult.confidence, listing.images);
        return;
      }
      // Иначе остаётся неcвязанным — попадёт в очередь модерации
      // (SiblingsService.getCandidates), reasoning от Grok не сохраняем
      // отдельным полем в Фазе 2 (упрощение), только конфиденс уже виден в UI.
      return;
    }

    // 3. Совпадения не найдено вообще — новый Product в DRAFT (ТЗ п.13.2, шаг 5)
    await this.createDraftProductFromListing(listing.id, listing.rawTitle, category, extractedSpecs, skuCandidate, listing.images);
  }

  private async linkListing(sourceListingId: string, productId: string, matchType: MatchType, confidence: number, images: string[] = []) {
    await this.prisma.client.productListing.create({
      data: { sourceListingId, productId, matchType, matchConfidence: confidence },
    });
    // Знайдено 20.08.2026 за прямим запитом користувача ("учитывают ли эти
    // парсеры товаров изменения по загрузке изображений") — SourceListing.
    // images заповнювався адаптерами (raw.images), але НІКОЛИ не
    // копіювався на реальний Product.images (ProductImage) при матчингу —
    // товари, створені через реальний парсер, завжди мали 0 картинок,
    // тільки seed-товари мали фото. Той самий "verify existing entries and
    // backfill" принцип, що вже застосований для картинок програм
    // кредитування (README) — картинку підтягуємо ЛИШЕ якщо товар ще не
    // має жодної, не перезаписуємо вручну підібрані адміном фото.
    await this.backfillProductImages(productId, sourceListingId, images);
    await this.pricing.recalculate(productId);
  }

  private async backfillProductImages(productId: string, sourceListingId: string, images: string[]) {
    if (images.length === 0) return;
    const existingCount = await this.prisma.client.productImage.count({ where: { productId } });
    if (existingCount > 0) return;

    await this.prisma.client.productImage.createMany({
      data: images.map((url, i) => ({ productId, url, sortOrder: i, sourceListingId })),
    });
  }

  private async createDraftProductFromListing(
    sourceListingId: string,
    rawTitle: string,
    category: string,
    specs: ExtractedSpecs,
    manufacturerSku: string | null,
    listingImages: string[] = [],
  ) {
    if (!category) return; // без категории не можем сгенерировать articleNumber — остаётся в очереди

    // За запитом користувача (категорії тепер таблиця, не жорсткий enum)
    // — префікс береться з Category.articleNumberPrefix замість
    // захардкодженого об'єкта. PENDING-категорії теж мають свій префікс
    // (перші 4 літери слага, CategoryService.slugifyLabel) — товар усе
    // одно отримує коректний артикул, навіть очікуючи модерації.
    const categoryRow = await this.prisma.client.category.findUnique({ where: { key: category } });
    const prefix = categoryRow?.articleNumberPrefix ?? 'XX';
    const seq = await this.prisma.client.articleNumberSequence.upsert({
      where: { category },
      create: { category, lastSeq: 1 },
      update: { lastSeq: { increment: 1 } },
    });
    const articleNumber = `${prefix}-${String(seq.lastSeq).padStart(6, '0')}`;
    const slug = `${rawTitle
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')}-${articleNumber.toLowerCase()}`;

    const product = await this.prisma.client.product.create({
      data: {
        slug,
        articleNumber,
        category,
        name: rawTitle,
        manufacturerSku: manufacturerSku ?? undefined,
        shortDescription: '', // заполняется Grok-генерацией (см. GrokService.generateProductDescription) или вручную при модерации
        description: '',
        specs: specs as unknown as object,
        status: ProductStatus.DRAFT, // ждёт модерации в админке
      },
    });

    // Знайдено 20.08.2026 разом з linkListing() вище — той самий пробіл,
    // тут щойно СТВОРЕНИЙ товар, тому просто одразу створюємо
    // ProductImage без окремого backfill-запиту (він і так порожній).
    if (listingImages.length > 0) {
      await this.prisma.client.productImage.createMany({
        data: listingImages.map((url, i) => ({ productId: product.id, url, sortOrder: i, sourceListingId })),
      });
    }

    await this.linkListing(sourceListingId, product.id, MatchType.MANUAL, 1);
  }
}
