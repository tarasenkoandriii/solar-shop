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
import { consumeLlmBudget, type CandidateProduct, type ParserRunCache } from './parser-run-cache';

export interface MatchCandidate {
  productId: string;
  productName: string;
  confidence: number;
}

// Мінімальний зріз SourceListing, потрібний матчингу. Дозволяє передати
// сюди вже завантажений (або щойно створений) рядок замість повторного
// читання з БД — див. коментар до matchListing().
export interface MatchableListing {
  id: string;
  rawTitle: string;
  rawCategory: string | null;
  siteCategoryLabel: string | null;
  images: string[];
}

export interface MatchListingOptions {
  /** Уже завантажений рядок — щоб не читати його з БД вдруге. */
  listing?: MatchableListing;
  /**
   * Листинг щойно створений цим самим прогоном. Тоді гарантовано НЕ існує
   * ні ProductListing-звʼязку, ні RejectedMatch для нього — обидва запити
   * можна не робити взагалі (вони б завжди повернули порожньо).
   */
  isFreshlyCreated?: boolean;

  /** Per-run кеш парсера. Без нього поведінка ідентична попередній. */
  cache?: ParserRunCache;
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
  //
  // За прямим запитом користувача (25.08.2026) — "оптимізувати, парсер не
  // встигає за бюджет часу". Сама логіка матчингу НЕ змінена: ті самі
  // кроки, пороги і результати. Змінено лише те, СКІЛЬКИ разів ці дані
  // читаються з БД — через опційний `opts` викликач може передати вже
  // відоме йому (сам рядок листингу, факт що він щойно створений) і
  // per-run кеш. Виклик без `opts` працює точно як раніше, тому
  // siblings.service / адмінка не зачеплені.
  async matchListing(sourceListingId: string, opts?: MatchListingOptions): Promise<void> {
    const cache = opts?.cache;

    const listing: MatchableListing =
      opts?.listing ??
      (await this.prisma.client.sourceListing.findUniqueOrThrow({
        where: { id: sourceListingId },
        select: { id: true, rawTitle: true, rawCategory: true, siteCategoryLabel: true, images: true },
      }));

    // Уже привязан к какому-то Product — повторно не матчим.
    // Для щойно створеного листинга звʼязку не може існувати за
    // визначенням (його id щойно згенеровано) — запит пропускаємо.
    // Свідомо НЕ довіряємо тут жодному снапшоту звʼязків, зробленому
    // раніше по ходу прогону: між батч-вибіркою на початку вендора і цим
    // моментом можуть пройти хвилини, за які адмін встиг привʼязати
    // листинг вручну через модерацію siblings. Дешевше зробити цей один
    // запит, ніж отримати другий ProductListing на той самий листинг
    // (@@unique там по парі (productId, sourceListingId), тож дубль з
    // ІНШИМ товаром пройшов би).
    if (!opts?.isFreshlyCreated) {
      const existingLink = await this.prisma.client.productListing.findFirst({ where: { sourceListingId: listing.id } });
      if (existingLink) return;
    }

    const extractedSpecs = extractSpecsFromTitle(listing.rawTitle);
    const skuCandidate = extractManufacturerSkuCandidate(listing.rawTitle);
    // За прямим запитом користувача ("сохранять сырые категории с сайтов и
    // матчить с существующими... если явного соответствия нет добавить
    // категорию на модерацию") — реальна перевірка через CategoryService:
    // якщо siteCategoryLabel (як сайт сам показує категорію) не збігається
    // з очікуваним — товар піде під ключем PENDING-категорії, не під
    // звичним SOLAR_PANEL/BATTERY/CONTROLLER.
    const category = await this.categories.resolveCategoryKey(listing.rawCategory ?? '', listing.siteCategoryLabel, cache);

    // 1. SKU_EXACT — совпадение по извлечённому manufacturerSku в рамках категории
    if (skuCandidate) {
      const skuMatch = await this.prisma.client.product.findFirst({
        where: { manufacturerSku: skuCandidate, ...(category ? { category } : {}) },
        select: { id: true, category: true },
      });
      if (skuMatch) {
        await this.linkListing(listing.id, skuMatch.id, MatchType.SKU_EXACT, 1, listing.images, skuMatch.category, cache);
        return;
      }
    }

    // 2. FUZZY_NAME кандидаты — среди опубликованных товаров той же категории
    // с совместимыми числовыми характеристиками (жёсткий фильтр, ТЗ п.13.2)
    //
    // RejectedMatch — явні "це різні товари" з модерації. Для щойно
    // створеного листинга їх не може бути (адмін фізично не міг його ще
    // побачити), тому запит робимо лише для вже наявних листингів.
    let rejectedIds: ReadonlySet<string> = EMPTY_ID_SET;
    if (!opts?.isFreshlyCreated) {
      const rejected = await this.prisma.client.rejectedMatch.findMany({
        where: { sourceListingId: listing.id },
        select: { productId: true },
      });
      rejectedIds = new Set(rejected.map((r) => r.productId));
    }

    const candidates = await this.getCandidates(category, cache);

    let best: MatchCandidate | null = null;
    for (const candidate of candidates) {
      if (rejectedIds.has(candidate.id)) continue;
      // candidate.specs передрозібрані один раз на прогін (див.
      // getCandidates) — раніше extractSpecsFromTitle() крутився для
      // кожного кандидата на КОЖНОМУ листингу.
      if (!specsCompatible(extractedSpecs, candidate.specs)) continue;

      const confidence = titleSimilarity(listing.rawTitle, candidate.name);
      if (!best || confidence > best.confidence) {
        best = { productId: candidate.id, productName: candidate.name, confidence };
      }
    }

    if (best && best.confidence >= MATCH_AUTO_THRESHOLD) {
      await this.linkListing(listing.id, best.productId, MatchType.FUZZY_NAME, best.confidence, listing.images, category || undefined, cache);
      return;
    }

    if (best && best.confidence >= MATCH_GREY_ZONE_MIN) {
      // Серая зона (ТЗ п.13.2) — прогоняем через Grok перед очередью модерации,
      // чтобы сократить объём ручной работы админа.
      //
      // Але не ціною всього прогону: у прогоні парсера цей виклик
      // списується з бюджету LLM (див. ParserRunCache.llm). Вичерпали —
      // поводимось РІВНО так само, як коли Grok недоступний: листинг іде
      // в чергу ручної модерації і буде спробуваний наступного прогону.
      // Гілка вже існує нижче, тому це не новий стан системи.
      if (cache && !consumeLlmBudget(cache)) return;

      const grokResult = await this.grok.matchListingToProduct(listing.rawTitle, best.productName).catch((err) => {
        this.logger.warn(`Grok match check failed, falling back to manual queue: ${err}`);
        return null;
      });

      if (grokResult?.isMatch && grokResult.confidence >= MATCH_AUTO_THRESHOLD) {
        await this.linkListing(listing.id, best.productId, MatchType.GROK_LLM, grokResult.confidence, listing.images, category || undefined, cache);
        return;
      }
      // Иначе остаётся неcвязанным — попадёт в очередь модерации
      // (SiblingsService.getCandidates), reasoning от Grok не сохраняем
      // отдельным полем в Фазе 2 (упрощение), только конфиденс уже виден в UI.
      return;
    }

    // 3. Совпадения не найдено вообще — новый Product в DRAFT (ТЗ п.13.2, шаг 5)
    await this.createDraftProductFromListing(listing.id, listing.rawTitle, category, extractedSpecs, skuCandidate, listing.images, cache);
  }

  // Вибірка кандидатів на матчинг. Кешується на весь прогін парсера, і це
  // БЕЗПЕЧНО саме тут: фільтр — status: PUBLISHED, а парсер створює товари
  // виключно в DRAFT (createDraftProductFromListing нижче) і ніде не
  // міняє статус. Тобто набір опублікованих товарів за час прогону не
  // змінюється, і повторний запит гарантовано повертав би те саме.
  //
  // Раніше цей findMany виконувався для КОЖНОГО листинга і тягнув ПОВНІ
  // рядки Product (з description, specs, кешами цін) — при 184 позиціях це
  // 184 однакові важкі запити. Тепер один запит на категорію за прогін, і
  // лише два поля, потрібні матчингу.
  private async getCandidates(category: string, cache?: ParserRunCache): Promise<CandidateProduct[]> {
    const cacheKey = category || '';
    const cached = cache?.candidatesByCategory.get(cacheKey);
    if (cached) return cached;

    const rows = await this.prisma.client.product.findMany({
      where: { status: ProductStatus.PUBLISHED, ...(category ? { category } : {}) },
      select: { id: true, name: true },
    });
    const prepared: CandidateProduct[] = rows.map((r) => ({
      id: r.id,
      name: r.name,
      specs: extractSpecsFromTitle(r.name),
    }));

    cache?.candidatesByCategory.set(cacheKey, prepared);
    return prepared;
  }

  private async linkListing(
    sourceListingId: string,
    productId: string,
    matchType: MatchType,
    confidence: number,
    images: string[] = [],
    knownCategory?: string | null,
    cache?: ParserRunCache,
  ) {
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
    await this.backfillProductImages(productId, sourceListingId, images, cache);

    // Перерахунок цінового кешу товару. У режимі прогону парсера —
    // ВІДКЛАДЕНИЙ: recalculate() коштує 4 запити, а товар, до якого
    // привʼязано кілька листингів одного вендора, раніше перераховувався
    // стільки ж разів поспіль з однаковим результатом. Тепер ParserService
    // робить рівно один перерахунок на товар у кінці прогону вендора
    // (flushPendingPricing) — це і швидше, і прибирає race при
    // паралельній обробці листингів.
    if (cache) {
      cache.pendingPricingProductIds.add(productId);
      if (knownCategory !== undefined) cache.categoryByProductId.set(productId, knownCategory);
      return;
    }
    await this.pricing.recalculate(productId, { knownCategory });
  }

  private async backfillProductImages(productId: string, sourceListingId: string, images: string[], cache?: ParserRunCache) {
    if (images.length === 0) return;

    // Синхронна відсічка ДО будь-якого await: нижче класичний
    // check-then-write (count → createMany), і при паралельній обробці два
    // листинги, що зматчились в ОДИН товар, обидва побачили б count === 0
    // і обидва залили б той самий набір картинок (унікального індексу на
    // ProductImage.url немає). Між add() і count() немає точки
    // переключення, тому другий виклик гарантовано вийде тут.
    if (cache) {
      if (cache.imagesBackfilledProductIds.has(productId)) return;
      cache.imagesBackfilledProductIds.add(productId);
    }

    try {
      const existingCount = await this.prisma.client.productImage.count({ where: { productId } });
      if (existingCount > 0) return;

      await this.prisma.client.productImage.createMany({
        // sourceUrl = той самий url: спочатку картинка живе прямим
        // посиланням на постачальника (видно одразу), а окремий джоб
        // ProductImageMirrorService переносить її на Vercel Blob і
        // підмінює url. sourceUrl лишається назавжди — це і ключ
        // дедуплікації, і єдиний спосіб повторити невдале завантаження.
        data: images.map((url, i) => ({ productId, url, sourceUrl: url, sortOrder: i, sourceListingId })),
      });
    } catch (err) {
      // Знімаємо позначку назад: інакше одна невдала спроба заблокувала б
      // заливку картинок для цього товару до кінця прогону, і наступний
      // листинг, що в нього зматчиться, теж мовчки її пропустив би —
      // товар лишився б зовсім без фото.
      cache?.imagesBackfilledProductIds.delete(productId);
      throw err;
    }
  }

  private async createDraftProductFromListing(
    sourceListingId: string,
    rawTitle: string,
    category: string,
    specs: ExtractedSpecs,
    manufacturerSku: string | null,
    listingImages: string[] = [],
    cache?: ParserRunCache,
  ) {
    if (!category) return; // без категории не можем сгенерировать articleNumber — остаётся в очереди

    // За запитом користувача (категорії тепер таблиця, не жорсткий enum)
    // — префікс береться з Category.articleNumberPrefix замість
    // захардкодженого об'єкта. PENDING-категорії теж мають свій префікс
    // (перші 4 літери слага, CategoryService.slugifyLabel) — товар усе
    // одно отримує коректний артикул, навіть очікуючи модерації.
    // Префікс за категорією не міняється під час прогону — кешуємо.
    const cachedPrefix = cache?.categoryPrefixByKey.get(category);
    let prefix: string;
    if (cachedPrefix !== undefined) {
      prefix = cachedPrefix;
    } else {
      const categoryRow = await this.prisma.client.category.findUnique({
        where: { key: category },
        select: { articleNumberPrefix: true },
      });
      prefix = categoryRow?.articleNumberPrefix ?? 'XX';
      cache?.categoryPrefixByKey.set(category, prefix);
    }

    const seq = await this.nextArticleNumberSeq(category);
    const articleNumber = `${prefix}-${String(seq).padStart(6, '0')}`;
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
      cache?.imagesBackfilledProductIds.add(product.id);
      await this.prisma.client.productImage.createMany({
        // sourceUrl — див. backfillProductImages вище.
        data: listingImages.map((url, i) => ({ productId: product.id, url, sourceUrl: url, sortOrder: i, sourceListingId })),
      });
    }

    // images вже створені рядком вище — передаємо порожній масив, щоб
    // linkListing не робив зайвий productImage.count.
    await this.linkListing(sourceListingId, product.id, MatchType.MANUAL, 1, [], category, cache);
  }

  // Атомарний інкремент лічильника артикулів. `update ... lastSeq =
  // lastSeq + 1 RETURNING` атомарний на рівні Postgres, тому паралельні
  // виклики безпечні. Єдиний вразливий момент — САМИЙ ПЕРШИЙ товар
  // категорії, коли рядка ще нема: два паралельні upsert'и можуть обидва
  // піти гілкою create і один впаде на unique-constraint (P2002). Тоді
  // рядок уже точно існує — повторна спроба гарантовано йде гілкою
  // update. Одна спроба повтору, без циклу: другого разу гонки бути не
  // може за побудовою.
  private async nextArticleNumberSeq(category: string): Promise<number> {
    try {
      const seq = await this.prisma.client.articleNumberSequence.upsert({
        where: { category },
        create: { category, lastSeq: 1 },
        update: { lastSeq: { increment: 1 } },
      });
      return seq.lastSeq;
    } catch {
      const seq = await this.prisma.client.articleNumberSequence.update({
        where: { category },
        data: { lastSeq: { increment: 1 } },
      });
      return seq.lastSeq;
    }
  }
}

const EMPTY_ID_SET: ReadonlySet<string> = new Set<string>();
