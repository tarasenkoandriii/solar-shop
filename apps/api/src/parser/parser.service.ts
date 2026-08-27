import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AdapterRegistry } from './adapter-registry';
import { MatchingService } from './matching.service';
import { ProductPricingService } from '../products/product-pricing.service';
import type { RawListing } from './adapter.interface';
import { createParserRunCache, mapWithConcurrency, type CachedExchangeRate, type ParserRunCache } from './parser-run-cache';
import { roundToCents } from '../common/money';

export interface ParserRunResult {
  vendorName: string;
  fetched: number;
  created: number;
  updated: number;
  priceChanged: number;
  stockChanged: number;
  matchAttempted: number;
  /** Позиції, що впали з помилкою і були пропущені (решта оброблена). */
  failed?: number;
  /** Позиції, пропущені через відсутній курс або нерозбірну ціну. */
  skipped?: number;
  error?: string;
}

// Скільки листингів обробляється одночасно. Обробка одного — це майже
// суцільне очікування мережі (round-trip'и до Supabase через пулер), тому
// паралелізм тут множить пропускну здатність, не навантажуючи ні CPU
// функції, ні Postgres. Дефолт свідомо низький: Supabase free tier має
// жорсткий ліміт зʼєднань пулера, і парсер ділить його з живим трафіком
// сайту. Піднімати варто разом з планом Supabase.
const DEFAULT_LISTING_CONCURRENCY = 4;

// Скільки рядків беремо на перерахунок за прогін. Обмежує і час, і обсяг
// запиту; недороблене підхопить наступний прогін.
const REPAIR_BATCH_SIZE = 1_000;

// Стеля колонки priceUsd — Decimal(10,2).
const MAX_PRICE_USD = 99_999_999.99;

// Яку валюту шукати в ExchangeRate для ціни в даній валюті. Для гривні —
// курс долара (гривень за долар), на який ділимо.
function rateCurrencyFor(rawCurrency: string): string {
  return rawCurrency === 'UAH' ? 'USD' : rawCurrency;
}

// Скільки звернень до Grok дозволено за один прогін парсера.
const DEFAULT_LLM_CALLS_PER_RUN = 25;

function llmCallBudget(): number {
  // Порожній рядок — це НЕ нуль. Багато платформ матеріалізують оголошену,
  // але не заповнену змінну як "", а Number("") === 0 — тобто друкарська
  // помилка в налаштуваннях мовчки вимкнула б Grok назавжди. Нуль лишаємо
  // валідним значенням, але тільки якщо його справді написали.
  const configured = process.env.PARSER_LLM_CALLS_PER_RUN?.trim();
  if (!configured) return DEFAULT_LLM_CALLS_PER_RUN;
  const raw = Number(configured);
  if (!Number.isFinite(raw) || raw < 0) return DEFAULT_LLM_CALLS_PER_RUN;
  return Math.floor(raw);
}

function listingConcurrency(): number {
  const raw = Number(process.env.PARSER_CONCURRENCY);
  if (!Number.isFinite(raw) || raw < 1) return DEFAULT_LISTING_CONCURRENCY;
  return Math.min(Math.floor(raw), 16);
}

@Injectable()
export class ParserService {
  private readonly logger = new Logger(ParserService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly registry: AdapterRegistry,
    private readonly matching: MatchingService,
    private readonly pricing: ProductPricingService,
  ) {}

  // За прямим запитом користувача — "менеджмент времени... 200 секунд,
  // идемпотентный крон и тд как с данными PVGIS". На відміну від PVGIS
  // (точка-за-точкою резюмовність), тут granularity — ЦІЛИЙ вендор за
  // раз: fetchListings() у кожного адаптера виконує ВСЮ роботу (усі
  // сторінки, усі категорії) за один виклик, нема проміжного cursor'а
  // для паузи на середині — переписувати ISourceAdapter під
  // сторінка-за-сторінкою резюмовність вийшло б за межі цього запиту.
  // Замість цього: вендори сортуються по lastFullyParsedAt (найдавніше
  // оброблений/ще ніколи не оброблений — першим), обробляються по
  // одному, поки не вичерпається бюджет часу — той самий природний
  // "кеш і є прогресом" принцип, що вже в SolarYieldEstimate, тут через
  // Vendor.lastFullyParsedAt.
  async runAll(timeBudgetMs = 260_000): Promise<{ results: (ParserRunResult & { isComplete?: boolean })[]; vendorsSkippedDueToBudget: string[]; isComplete: boolean }> {
    const startedAt = Date.now();
    // За прямим запитом користувача — "добавить тайм менеджмент"
    // (повторний запит на РЕАЛЬНИЙ production-збій: попередній фікс
    // тайм-боксував лише фазу СКРЕЙПІНГУ — ОБРОБКА зібраних даних
    // (upsert + matching engine, мінімум 2-3 послідовних DB-запити на
    // кожен listing через Supabase-пулер) НЕ мала жодного бюджету
    // взагалі, для сотень listings легко сумувалась у десятки-сотні
    // секунд ПОНАД уже витрачений на скрейпінг час). Тепер ОДИН
    // спільний дедлайн на ОБИДВІ фази (не окремі бюджети для кожної)
    // — і адаптер (збір), і runForVendor() (обробка) перевіряють той
    // самий deadlineAt, що обчислюється ОДИН раз тут.
    const SAFETY_MARGIN_MS = 30_000;
    const deadlineAt = startedAt + timeBudgetMs - SAFETY_MARGIN_MS;
    // Перерахунок цінових кешів (flushPendingPricing) свідомо має ВЛАСНИЙ,
    // трохи пізніший дедлайн: він завершує вже зроблену роботу (листинги
    // записані, товари звʼязані — лишилось оновити кеш ціни/наявності),
    // і кинути його недоробленим гірше, ніж обробити на кілька позицій
    // менше. Йому віддається дві третини страхового запасу.
    const pricingDeadlineAt = startedAt + timeBudgetMs - Math.round(SAFETY_MARGIN_MS / 3);

    // Кеш живе рівно один прогін — див. розгорнутий коментар у
    // parser-run-cache.ts. Спільний на всіх вендорів: курс НБУ, категорії
    // та пороги акцій від вендора не залежать.
    //
    // Бюджет на Grok: звернення припиняються на 60% прогону, щоб дорогий
    // виклик не міг з'їсти час, потрібний на запис уже зібраного. Ліміт
    // на кількість — страховка від деградованого Grok, коли кожен виклик
    // впирається в таймаут (10с × 3 спроби).
    const cache = createParserRunCache({
      // Math.min — щоб при малому бюджеті відсічка для LLM не опинилась
      // ПІЗНІШЕ за загальний дедлайн: інакше виклик, допущений перед
      // самим дедлайном, міг би відпрацьовувати свої 30с уже за ним.
      deadlineAt: Math.min(deadlineAt, startedAt + Math.round(timeBudgetMs * 0.6)),
      remaining: llmCallBudget(),
      skipped: 0,
    });

    // Ремонт рядків, записаних до того, як з'явився захист вище: у них
    // priceUsd насправді містить суму у ВИХІДНІЙ валюті, бо курсу на
    // момент запису не було. Маркер однозначний — priceRateDate IS NULL
    // при не-доларовій валюті: жоден коректний запис такого не має.
    //
    // Робимо це на початку прогону, до вендорів: перерахунок дешевий
    // (один UPDATE), а поки він не зроблений, каталог показує ціни,
    // завищені в десятки разів.
    await this.repairUnconvertedPrices(cache, deadlineAt).catch((err) => {
      this.logger.error(`Перерахунок неконвертованих цін не вдався: ${err instanceof Error ? err.message : String(err)}`);
    });

    const neverParsed = await this.prisma.client.vendor.findMany({
      where: { isActive: true, lastFullyParsedAt: null },
      orderBy: { createdAt: 'asc' },
    });
    const previouslyParsed = await this.prisma.client.vendor.findMany({
      where: { isActive: true, lastFullyParsedAt: { not: null } },
      orderBy: { lastFullyParsedAt: 'asc' },
    });
    const orderedVendors = [...neverParsed, ...previouslyParsed];

    const results: (ParserRunResult & { isComplete?: boolean })[] = [];
    const vendorsSkippedDueToBudget: string[] = [];

    try {
      for (const vendor of orderedVendors) {
        if (Date.now() >= deadlineAt) {
          vendorsSkippedDueToBudget.push(vendor.name);
          continue;
        }

        const adapter = this.registry.getByVendorName(vendor.name);
        if (!adapter) continue; // поставщик заведён в БД, но адаптер ещё не реализован — пропускаем, не роняем весь прогон

        console.log(`[ParserService] Обробляю вендора "${vendor.name}"...`);
        try {
          const { listings, isComplete: scrapeComplete } = await adapter.fetchListings(deadlineAt);
          const vendorResult = await this.runForVendor(vendor.id, adapter.vendorName, listings, deadlineAt, cache);
          results.push(vendorResult);
          // lastFullyParsedAt оновлюється ЛИШЕ якщо ОБИДВІ фази (і
          // скрейпінг, і обробка) реально завершились повністю —
          // часткові дані вже збережені (ідемпотентно, upsert по
          // sourceUrl), АЛЕ вендор лишається "не до кінця обробленим" і
          // знову буде першим у черзі наступного прогону (ordered by
          // lastFullyParsedAt).
          // Позиція, що впала, більше не валить вендора (див.
        // mapWithConcurrency) — але якщо впали ВСІ, це вже не "погана
        // сторінка", а системний збій (вичерпаний пул зʼєднань, поламана
        // міграція, недоступний Grok). Мовчати про це не можна: без цієї
        // гілки такий вендор відзвітував би як цілком успішний.
        if (vendorResult.failed && vendorResult.failed === vendorResult.fetched && vendorResult.fetched > 0) {
          vendorResult.error = `Усі ${vendorResult.failed} позицій впали з помилкою — див. warn-логи.`;
        }
        // Те саме для пропущених: якщо з вендора не записано НІЧОГО, бо
        // немає курсу, це не успішний прогін. Без цієї гілки повна
        // зупинка каталогу (не відпрацював nbu_rate_sync) виглядала б у
        // історії крона як бездоганний SUCCESS: лічильник failed нульовий,
        // vendorsSkippedDueToBudget порожній, lastFullyParsedAt проставлено.
        if (vendorResult.skipped && vendorResult.skipped === vendorResult.fetched && vendorResult.fetched > 0) {
          vendorResult.error = `Усі ${vendorResult.skipped} позицій пропущено (немає курсу або нерозбірна ціна) — нічого не записано.`;
        }
        const isVendorComplete = scrapeComplete && vendorResult.isComplete;
          if (isVendorComplete) {
            await this.prisma.client.vendor.update({
              where: { id: vendor.id },
              data: { lastFullyParsedAt: new Date() },
            });
          } else {
            console.log(`[ParserService] "${vendor.name}": бюджет часу вичерпано (${!scrapeComplete ? 'на скрейпінгу' : 'на обробці'}), зібрано ${listings.length} позицій — продовжимо з початку наступного разу.`);
            vendorsSkippedDueToBudget.push(vendor.name);
            // Час уже вичерпано — йти далі по решті вендорів цього
            // прогону немає сенсу, весь бюджет витрачено. Явно
            // позначаємо ВСІХ, хто ще не встиг навіть почати цього
            // прогону — інакше vendorsSkippedDueToBudget був би
            // неповним для діагностики (хоча загальний isComplete
            // флаг і так коректний завдяки одному запису вище).
            const remainingVendorNames = orderedVendors.slice(orderedVendors.indexOf(vendor) + 1).map((v) => v.name);
            vendorsSkippedDueToBudget.push(...remainingVendorNames);
            break;
          }
        } catch (err) {
          this.logger.error(`Adapter ${vendor.name} failed`, err as Error);
          results.push({
            vendorName: vendor.name,
            fetched: 0,
            created: 0,
            updated: 0,
            priceChanged: 0,
            stockChanged: 0,
            matchAttempted: 0,
            error: err instanceof Error ? err.message : String(err),
          });
          // Помилка адаптера — все одно позначаємо lastFullyParsedAt, щоб
          // вендор, що постійно падає, не блокував чергу назавжди попереду
          // решти (той самий вендор просто спробується знову в СВОЮ чергу
          // наступного разу, не одразу).
          await this.prisma.client.vendor.update({
            where: { id: vendor.id },
            data: { lastFullyParsedAt: new Date() },
          });
        }
      }
    } finally {
      // Відкладені перерахунки цін — по одному на КОЖЕН зачеплений товар,
      // а не на кожен листинг (див. linkListing у MatchingService).
      // Саме finally: якщо цикл вендорів впаде (напр. на vendor.update),
      // товари вже звʼязані, і лишити їх з протухлим ціновим кешем
      // назавжди — гірше, ніж витратити кілька секунд на перерахунок
      // перед тим, як пробросити помилку далі.
      await this.flushPendingPricing(cache, pricingDeadlineAt);
    }

    if (cache.missingRateCurrencies.size > 0) {
      console.log(
        `[ParserService] УВАГА: немає курсу для ${[...cache.missingRateCurrencies].join(', ')} — позиції в цих валютах пропущені, ` +
          'щоб не записати суму в чужій валюті як долари. Перевір, чи відпрацював джоб nbu_rate_sync.',
      );
    }

    if (cache.llm.skipped > 0) {
      console.log(
        `[ParserService] Бюджет звернень до Grok вичерпано — ${cache.llm.skipped} позицій сірої зони пішли одразу в ручну модерацію (спробуємо наступного прогону).`,
      );
    }

    const isComplete = vendorsSkippedDueToBudget.length === 0;
    console.log(`[ParserService] Завершено: ${results.length} вендорів оброблено за ${Math.round((Date.now() - startedAt) / 1000)}с${vendorsSkippedDueToBudget.length > 0 ? `, ${vendorsSkippedDueToBudget.length} відкладено на наступний прогін (бюджет часу)` : ''}.`);

    return { results, vendorsSkippedDueToBudget, isComplete };
  }

  // Перераховує priceUsd для рядків, збережених без курсу.
  //
  // Обмежено ГРИВНЕЮ навмисно. getRate для не-UAH валюти повертає її
  // власний курс до гривні, а формула нижче ділить на нього — для євро це
  // дало б заниження в 55 разів. У самому парсері це поки латентне (усі
  // чотири адаптери віддають UAH), але ремонт сканує ВСЮ таблицю, разом
  // із рядками, які могли прийти через імпорт з довільною валютою, і
  // проставляє priceRateDate — тобто назавжди прибирає рядок з-під
  // детекту. Псувати такі рядки мовчки не можна.
  private async repairUnconvertedPrices(cache: ParserRunCache, deadlineAt: number): Promise<void> {
    const broken: { id: string; rawPrice: unknown; rawCurrency: string }[] = await this.prisma.client.sourceListing.findMany({
      where: { priceRateDate: null, rawCurrency: 'UAH' },
      select: { id: true, rawPrice: true, rawCurrency: true },
      orderBy: { id: 'asc' },
      take: REPAIR_BATCH_SIZE,
    });
    if (broken.length === 0) return;

    const rate = await this.getRate('UAH', cache);
    if (!rate) {
      cache.missingRateCurrencies.add('USD');
      this.logger.warn(`${broken.length} цін чекають на перерахунок, але курсу немає — відкладаю до появи курсу.`);
      return;
    }

    const repairedIds: string[] = [];
    let skipped = 0;

    for (const row of broken) {
      // Дедлайн ПЕРЕВІРЯЄТЬСЯ і тут. Ремонт іде ДО обходу вендорів, і без
      // цієї перевірки він міг з'їсти весь бюджет прогону: у перший запуск
      // після деплою битих рядків — увесь каталог, а кожен це окремий
      // round-trip. Недороблене підхопить наступний прогін — рядок
      // лишається в тій самій вибірці, поки не перерахований.
      if (Date.now() >= deadlineAt) break;

      try {
        const priceUsd = roundToCents(Number(row.rawPrice) / rate.rateUah);
        if (!Number.isFinite(priceUsd) || priceUsd <= 0 || priceUsd > MAX_PRICE_USD) {
          // Найчастіше — спадок наївного розбору: склеєна сума, яка після
          // ділення все одно не влазить у Decimal(10,2). Логуємо, інакше
          // такий рядок мовчки сканувався б щопрогону вічно.
          this.logger.warn(`Листинг ${row.id}: ${String(row.rawPrice)} ${row.rawCurrency} дає некоректні $${priceUsd} — потрібен повторний парсинг, пропускаю.`);
          skipped++;
          continue;
        }

        await this.prisma.client.sourceListing.update({
          where: { id: row.id },
          data: {
            priceUsd,
            priceRateDate: rate.rateDate,
            // priceChangedAt НЕ чіпаємо: це виправлення нашої помилки, а
            // не зміна ціни постачальником. Інакше в історії цін з'явився
            // б стрибок у сорок разів без жодного відповідного запису в
            // PriceHistoryEntry.
          },
        });
        repairedIds.push(row.id);
      } catch (err) {
        // Ізоляція по рядку — як у обході листингів. Без неї один
        // проблемний рядок обривав ремонт, і все, що стоїть за ним у
        // порядку, не перераховувалось би НІКОЛИ.
        this.logger.warn(`Не вдалося перерахувати листинг ${row.id}: ${err instanceof Error ? err.message : String(err)}`);
        skipped++;
      }
    }

    if (repairedIds.length === 0) return;

    // Один запит на всіх, а не по одному на рядок.
    const links: { productId: string }[] = await this.prisma.client.productListing.findMany({
      where: { sourceListingId: { in: repairedIds } },
      select: { productId: true },
    });
    for (const link of links) cache.pendingPricingProductIds.add(link.productId);

    console.log(
      `[ParserService] Перераховано ${repairedIds.length} цін, збережених без курсу (сума в гривні лежала як долари)` +
        `${skipped > 0 ? `, ${skipped} пропущено` : ''}. Зачеплено ${new Set(links.map((l) => l.productId)).size} товарів — ` +
        'їхній ціновий кеш оновиться в кінці прогону.',
    );
  }

  private async runForVendor(vendorId: string, vendorName: string, rawListings: RawListing[], deadlineAt: number, cache: ParserRunCache): Promise<ParserRunResult & { isComplete: boolean }> {
    let created = 0;
    let updated = 0;
    let priceChanged = 0;
    let stockChanged = 0;
    let matchAttempted = 0;
    let skipped = 0;

    // Дедуплікація за sourceUrl — ОБОВʼЯЗКОВА, а не косметична. Стан "чи
    // є вже такий листинг" тепер читається ОДИН раз батчем до циклу
    // (нижче), тож два входження одного URL в одному наборі обидва
    // побачили б "не існує" і обидва пішли б у create — а там
    // @@unique([vendorId, sourceUrl]), тобто гарантований P2002. Раніше
    // це сходило з рук лише тому, що findUnique стояв усередині циклу і
    // друге входження бачило щойно створений рядок.
    //
    // Дублікати тут цілком реальні: адаптери конкатенують кілька
    // категорій (sunshop.adapter.ts), а сайт може віддати ту саму
    // сторінку на неіснуючий номер пагінації. Лишаємо ОСТАННЄ входження
    // — воно відповідає останньому побаченому стану ціни/наявності.
    const deduped = dedupeBySourceUrl(rawListings);
    if (deduped.length !== rawListings.length) {
      console.log(`[ParserService] "${vendorName}": ${rawListings.length - deduped.length} дублів sourceUrl у видачі адаптера — залишено по одному.`);
    }

    // Один запит замість N. Раніше для КОЖНОГО з 184 листингів робився
    // окремий findUnique по (vendorId, sourceUrl) — 184 послідовні
    // round-trip'и лише щоб дізнатись, що з них уже є в базі. Тепер —
    // одна вибірка по всьому набору sourceUrl цього вендора.
    const existingByUrl = await this.loadExistingListings(vendorId, deduped);

    const { failed, isComplete } = await mapWithConcurrency(
      deduped,
      listingConcurrency(),
      // За прямим запитом користувача — "добавить тайм менеджмент"
      // (повторний запит на РЕАЛЬНИЙ production-збій: попередній фікс
      // тайм-боксував лише фазу СКРЕЙПІНГУ, АЛЕ ОБРОБКА зібраних даних
      // не мала бюджету взагалі). Один спільний дедлайн на ОБИДВІ фази —
      // перевіряється тут так само, як усередині кожного адаптера.
      // Перевірка стоїть ПЕРЕД запуском кожної наступної позиції: уже
      // розпочаті доводяться до кінця, щоб не лишити напівзаписаний стан.
      () => Date.now() >= deadlineAt,
      async (raw) => {
        const outcome = await this.processListing(vendorId, raw, existingByUrl.get(raw.sourceUrl) ?? null, cache);
        if (outcome.created) created++;
        if (outcome.updated) updated++;
        if (outcome.priceChanged) priceChanged++;
        if (outcome.stockChanged) stockChanged++;
        if (outcome.matchAttempted) matchAttempted++;
        if (outcome.skipped) skipped++;
      },
      // Збій ОКРЕМОЇ позиції більше не валить обробку всього вендора:
      // решта позицій — незалежні одна від одної, і втратити 183 через
      // одну зіпсовану сторінку було б гірше, ніж пропустити її.
      (err, raw) => {
        this.logger.warn(`Listing ${raw.sourceUrl} failed: ${err instanceof Error ? err.message : String(err)}`);
      },
    );

    if (failed > 0) {
      console.log(`[ParserService] "${vendorName}": ${failed} позицій не оброблено через помилки (деталі — у warn-логах).`);
    }

    return {
      vendorName,
      fetched: deduped.length,
      created,
      updated,
      priceChanged,
      stockChanged,
      matchAttempted,
      failed,
      skipped,
      isComplete,
    };
  }

  // Prisma не має batch-варіанта findUnique по складеному ключу, тому
  // беремо всі листинги вендора за списком sourceUrl. Розбито на порції:
  // дуже довгий IN-список Postgres приймає, але план запиту деградує, а
  // деякі пулери мають ліміт на розмір запиту.
  private async loadExistingListings(vendorId: string, rawListings: RawListing[]) {
    const CHUNK = 500;
    const urls = [...new Set(rawListings.map((r) => r.sourceUrl))];
    const map = new Map<string, ExistingListing>();

    for (let i = 0; i < urls.length; i += CHUNK) {
      const rows = await this.prisma.client.sourceListing.findMany({
        where: { vendorId, sourceUrl: { in: urls.slice(i, i + CHUNK) } },
        select: {
          id: true,
          sourceUrl: true,
          priceUsd: true,
          inStock: true,
          rawCategory: true,
          // Статус привʼязки їде тим самим запитом — раніше це був
          // окремий productListing.findFirst на кожен змінений листинг.
          products: { select: { productId: true }, take: 1 },
        },
      });
      for (const row of rows) {
        map.set(row.sourceUrl, {
          id: row.id,
          sourceUrl: row.sourceUrl,
          priceUsd: row.priceUsd,
          inStock: row.inStock,
          rawCategory: row.rawCategory,
          linkedProductId: row.products[0]?.productId ?? null,
        });
      }
    }
    return map;
  }

  // Курс НБУ один на весь прогін — раніше exchangeRate.findFirst стояв
  // ВСЕРЕДИНІ циклу і виконувався для кожного листинга, повертаючи щоразу
  // той самий рядок. Кешуємо по валюті (валют у практиці одна-дві).
  private async getRate(rawCurrency: string, cache: ParserRunCache): Promise<CachedExchangeRate | null> {
    // Історична семантика збережена як є: для UAH-цін беремо курс USD
    // (ціна з сайту в гривні ділиться на курс долара → priceUsd).
    const currency = rateCurrencyFor(rawCurrency);
    const cached = cache.exchangeRateByCurrency.get(currency);
    if (cached !== undefined) return cached;

    const row = await this.prisma.client.exchangeRate.findFirst({
      where: { currency },
      orderBy: { rateDate: 'desc' },
    });
    const value = row ? { rateUah: Number(row.rateUah), rateDate: row.rateDate } : null;
    cache.exchangeRateByCurrency.set(currency, value);
    return value;
  }

  private async processListing(vendorId: string, raw: RawListing, existing: ExistingListing | null, cache: ParserRunCache): Promise<ListingOutcome> {
    const now = new Date();

    // Остання лінія оборони перед БД. Реальний випадок 25.08.2026:
    // селектор ціни зачепив не картку товару, усі цифри блоку склеїлись,
    // і в Prisma полетів rawPrice: Infinity. Перевірка стоїть тут, а не
    // лише в адаптерах, бо адаптерів чотири і кожен новий повторив би ту
    // саму помилку.
    if (!Number.isFinite(raw.rawPrice) || raw.rawPrice <= 0) {
      this.logger.warn(`Пропускаю ${raw.sourceUrl}: некоректна ціна (${raw.rawPrice}) — адаптер не зміг її розібрати.`);
      return { skipped: true };
    }

    const rate = await this.getRate(raw.rawCurrency, cache);

    // Курсу немає — позицію НЕ зберігаємо взагалі.
    //
    // Знайдено 25.08.2026 за скаргою користувача ("парсились цены в
    // гривнах — а конвертация показала цены типа в долларах"). Тут стояло
    // `rate ? rawPrice / rate : rawPrice`, тобто за відсутності курсу
    // ГРИВНЕВА сума лягала в priceUsd як є. У каталозі це давало
    // "$33 300" за акумулятор ціною 33 300 ₴ (близько $800) — помилка в
    // сорок разів, яка тихо розтікалась далі: у націнку, в акції, у
    // бюджет калькулятора і в рахунки. Найгірше, що відрізнити таке
    // число від справжньої ціни постфактум нічим.
    //
    // Пропустити позицію на один прогін нешкідливо: курс приїде добовим
    // джобом nbu_rate_sync, і наступний прогін збереже її вже правильно.
    if (!rate && raw.rawCurrency !== 'USD') {
      // Записуємо валюту, рядка якої НЕМАЄ в ExchangeRate (для
      // гривневих цін це USD), а не валюту прайсу — інакше лог відправляв
      // би шукати курс UAH, якого там ніколи й не було.
      cache.missingRateCurrencies.add(rateCurrencyFor(raw.rawCurrency));
      return { skipped: true };
    }

    // Округлюємо ОДИН раз і використовуємо це саме значення і для запису,
    // і для порівняння. Спроба зберігати повне значення, а порівнювати
    // округлене, виглядає точнішою, але насправді гірша: Postgres округляє
    // numeric(10,2) десятковим half-up, а JS — двійковим, і на межі
    // півкопійки вони розходяться назавжди (8.005 → БД пише 8.01, JS
    // рахує 8.00), даючи вічне хибне "ціна змінилась" на тих самих
    // позиціях щопрогону. Спільна арифметика прибирає цілий клас
    // розходжень; ціна — рівно та сама з точністю до копійки.
    //
    // rawCurrency === 'USD' — ціна вже в доларах, ділити її на курс
    // гривні не можна (латентна помилка: getRate для 'USD' повертає
    // гривневий курс долара, і ціна зменшилась би вдесятеро).
    const priceUsd = roundToCents(raw.rawCurrency === 'USD' ? raw.rawPrice : raw.rawPrice / rate!.rateUah);

    if (!existing) {
      const listing = await this.prisma.client.sourceListing.create({
        data: {
          vendorId,
          sourceUrl: raw.sourceUrl,
          sourceSku: raw.sourceSku,
          rawTitle: raw.rawTitle,
          rawCategory: raw.rawCategory,
          siteCategoryLabel: raw.siteCategoryLabel,
          rawPrice: raw.rawPrice,
          rawCurrency: raw.rawCurrency,
          priceUsd,
          priceRateDate: rate?.rateDate,
          priceCheckedAt: now,
          priceChangedAt: now,
          inStock: raw.inStock,
          stockCheckedAt: now,
          stockChangedAt: now,
          images: raw.images,
          firstSeenAt: now,
          lastParsedAt: now,
        },
        select: {
          id: true,
          rawTitle: true,
          rawCategory: true,
          siteCategoryLabel: true,
          images: true,
        },
      });
      await this.prisma.client.priceHistoryEntry.create({
        data: { sourceListingId: listing.id, priceUsd, inStock: raw.inStock },
      });
      // Передаємо щойно створений рядок і прапорець isFreshlyCreated —
      // матчинг тоді не перечитує його з БД і не питає про звʼязок/
      // відхилені збіги, яких у новоствореного листинга бути не може.
      await this.matching.matchListing(listing.id, {
        listing,
        isFreshlyCreated: true,
        cache,
      });
      return { created: true, matchAttempted: true };
    }

    // ТЗ п.13.5: priceCheckedAt/stockCheckedAt обновляются ВСЕГДА при
    // успешном парсинге, priceChangedAt/stockChangedAt — только при
    // реальном изменении значения.
    // Обидва боки тепер в одній арифметиці — див. roundToCents вище.
    // Знайдено 25.08.2026: раніше збережене (вже округлене базою до двох
    // знаків) значення порівнювалось із НЕокругленим результатом ділення,
    // тож "ціна змінилась" спрацьовувало майже на кожній позиції кожного
    // прогону — зайвий PriceHistoryEntry і зайвий перерахунок цін на
    // кожен листинг, а справжня історія цін тонула в цьому шумі.
    const priceHasChanged = Number(existing.priceUsd) !== priceUsd;
    const stockHasChanged = existing.inStock !== raw.inStock;

    await this.prisma.client.sourceListing.update({
      where: { id: existing.id },
      data: {
        rawTitle: raw.rawTitle,
        siteCategoryLabel: raw.siteCategoryLabel,
        rawPrice: raw.rawPrice,
        priceUsd,
        priceRateDate: rate?.rateDate,
        priceCheckedAt: now,
        priceChangedAt: priceHasChanged ? now : undefined,
        inStock: raw.inStock,
        stockCheckedAt: now,
        stockChangedAt: stockHasChanged ? now : undefined,
        images: raw.images,
        lastParsedAt: now,
      },
    });

    if (priceHasChanged || stockHasChanged) {
      await this.prisma.client.priceHistoryEntry.create({
        data: { sourceListingId: existing.id, priceUsd, inStock: raw.inStock },
      });
    }

    // Листинг уже привязан к канону — просто пересчитать кэш цены/
    // наличия товара (matching.matchListing() тут не нужен, он для
    // ещё непривязанных листингов). Перерахунок відкладений: той самий
    // товар міг зачепитись і іншими листингами цього ж прогону.
    if (existing.linkedProductId) {
      if (priceHasChanged || stockHasChanged) cache.pendingPricingProductIds.add(existing.linkedProductId);
      return {
        updated: true,
        priceChanged: priceHasChanged,
        stockChanged: stockHasChanged,
      };
    }

    // Листинг НЕ привʼязаний. Раніше матчинг тут стояв під умовою "ціна
    // або наявність змінились" і працював лише завдяки описаному вище
    // хибному спрацьовуванню порівняння цін: воно було true майже завжди,
    // тож непривʼязані листинги фактично перематчувались щопрогону.
    // Полагодивши порівняння, ми б мовчки вимкнули цей ретрай — і листинг
    // із сірої зони не зматчився б уже НІКОЛИ, навіть після того, як адмін
    // опублікує потрібний товар.
    //
    // Ретрай СВІДОМО безумовний. Спроба вгадати "чи міг результат
    // змінитись" (напр. за _max(Product.updatedAt) по категорії) виглядає
    // ощадливо, але хибно-негативне спрацювання там ховає листинг
    // НАЗАВЖДИ, а джерел зміни забагато, щоб їх перелічити: резолв
    // категорії залежить ще й від назв самих Category, SKU-гілка бачить
    // і DRAFT-товари, а сама логіка матчингу міняється з деплоєм.
    // Натомість обмежуємо не ретрай, а те єдине, що в ньому справді
    // дорого — звернення до Grok у сірій зоні (див. ParserRunCache.llm).
    // Пропуск через вичерпаний бюджет самолікується наступного прогону,
    // пропуск через хибний гейт — ні.
    await this.matching.matchListing(existing.id, {
      listing: {
        id: existing.id,
        rawTitle: raw.rawTitle,
        // Саме збережений rawCategory: sourceListing.update вище свідомо
        // його не перезаписує, тож матчинг має бачити те саме значення,
        // що побачив би, перечитавши рядок з БД (як робив раніше).
        rawCategory: existing.rawCategory,
        siteCategoryLabel: raw.siteCategoryLabel ?? null,
        images: raw.images,
      },
      cache,
    });

    return {
      updated: true,
      priceChanged: priceHasChanged,
      stockChanged: stockHasChanged,
      matchAttempted: true,
    };
  }

  // Один перерахунок цінового кешу на товар за прогін. Раніше
  // pricing.recalculate() (4 запити) викликався одразу з linkListing() —
  // товар, до якого прив'язано 5 листингів, перераховувався 5 разів
  // поспіль з тим самим результатом.
  //
  // Якщо бюджет вичерпано і частина товарів лишилась неперерахованою —
  // це НЕ втрата даних: самі листинги і звʼязки вже записані, застарілим
  // лишається тільки кеш ціни/наявності на Product, який у будь-якому
  // разі повністю перебудовується добовим promo_recalc
  // (ProductPricingService.recalculateAll). Логуємо явно, щоб це було
  // видно в історії крона, а не вилізло як "ціна не оновилась".
  private async flushPendingPricing(cache: ParserRunCache, pricingDeadlineAt: number): Promise<void> {
    const productIds = [...cache.pendingPricingProductIds];
    cache.pendingPricingProductIds.clear();
    if (productIds.length === 0) return;

    const { processed, isComplete } = await mapWithConcurrency(
      productIds,
      listingConcurrency(),
      () => Date.now() >= pricingDeadlineAt,
      async (productId) => {
        await this.pricing.recalculate(productId, { cache }).catch((err) => {
          this.logger.warn(`Pricing recalculate failed for product ${productId}: ${err}`);
        });
      },
    );

    if (isComplete) {
      console.log(`[ParserService] Ціновий кеш перераховано для ${processed} товарів.`);
    } else {
      console.log(`[ParserService] Ціновий кеш перераховано для ${processed} з ${productIds.length} товарів — решта лишилась на добовий promo_recalc (бюджет часу).`);
    }
  }
}

// ПЕРШЕ входження виграє. Так само поводився й попередній код: перше
// створювало рядок, а друге йшло гілкою update, яка свідомо НЕ перезаписує
// rawCategory — тобто категорію фіксувало саме перше входження. Дублікати
// тут найчастіше і є той самий товар, виставлений одразу в двох категоріях
// сайту, тож вибір між ними не нейтральний.
function dedupeBySourceUrl(rawListings: RawListing[]): RawListing[] {
  const byUrl = new Map<string, RawListing>();
  for (const raw of rawListings) {
    if (!byUrl.has(raw.sourceUrl)) byUrl.set(raw.sourceUrl, raw);
  }
  return [...byUrl.values()];
}

interface ExistingListing {
  id: string;
  sourceUrl: string;
  priceUsd: unknown;
  inStock: boolean;
  // rawCategory береться зі ЗБЕРЕЖЕНОГО рядка, а не зі свіжого скрейпу —
  // sourceListing.update нижче свідомо його не перезаписує, тож матчинг
  // має бачити те саме значення, що бачив би, перечитавши рядок з БД.
  rawCategory: string | null;
  /** Чи привʼязаний листинг до якогось Product (з того ж батч-запиту). */
  linkedProductId: string | null;
}

interface ListingOutcome {
  skipped?: boolean;
  created?: boolean;
  updated?: boolean;
  priceChanged?: boolean;
  stockChanged?: boolean;
  matchAttempted?: boolean;
}
