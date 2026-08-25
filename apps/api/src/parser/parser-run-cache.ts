import type { ExtractedSpecs } from '@solar-shop/db';

// За прямим запитом користувача — "оптимізувати парсер, не встигає за
// бюджет часу" (реальний production-збій, Vercel logs 25.08.2026:
// "sunshop.com.ua": бюджет часу вичерпано (на обробці), зібрано 184
// позицій" при 237с прогону і ліміті функції 300с).
//
// Діагноз: обробка ОДНОГО listing коштувала ~20 ПОСЛІДОВНИХ запитів до
// Supabase через пулер (кожен — окремий мережевий round-trip, ~40-60мс).
// 184 позиції × 20 × 50мс ≈ 180с ЛИШЕ на латентність — власне SQL тут
// майже безкоштовний, вузьке місце суто мережеве.
//
// Ключове спостереження: більшість цих запитів поверталися ОДНАКОВИМ
// результатом для всіх 184 позицій одного прогону:
//   - exchangeRate.findFirst — курс НБУ один на весь прогін;
//   - product.findMany (кандидати на матчинг) — вибірка по
//     status: PUBLISHED, а парсер СТВОРЮЄ товари лише в DRAFT, тому
//     набір кандидатів за прогін не змінюється взагалі;
//   - category.findUnique / findMany у resolveCategoryKey —
//     siteCategoryLabel однаковий для всієї сторінки категорії
//     (див. коментар у adapter.interface.ts), тобто для десятків
//     позиційпоспіль питання ідентичне;
//   - promoSettings — поріг акцій міняється в адмінці, не під час прогону.
//
// Звідси цей кеш: НЕ загальний кеш застосунку (він би розсинхронився з
// БД), а строго per-run — живе рівно один виклик ParserService.runAll()
// і вмирає разом з ним. Той самий принцип, що вже застосований для
// lastFullyParsedAt: стан прогону, а не стан системи.
export interface CandidateProduct {
  id: string;
  name: string;
  // extractSpecsFromTitle() — чистий CPU-розбір регулярками, але раніше
  // викликався для КОЖНОГО кандидата на КОЖНОМУ listing (184 × N
  // кандидатів разів за прогін). Розбираємо один раз при завантаженні
  // кандидатів.
  specs: ExtractedSpecs;
}

export interface CachedExchangeRate {
  rateUah: number;
  rateDate: Date;
}

export interface ParserRunCache {
  /** currency -> курс (null = курсу для цієї валюти в БД немає) */
  exchangeRateByCurrency: Map<string, CachedExchangeRate | null>;
  /** categoryKey -> опубліковані товари-кандидати з передрозібраними specs */
  candidatesByCategory: Map<string, CandidateProduct[]>;
  /** Ключ — пара (internalKey, siteCategoryLabel), див. categoryCacheKey. */
  // Зберігається саме PROMISE, а не готове значення: при паралельній
  // обробці перші N листингів стартують ОДНОЧАСНО, тому всі вони
  // промахнулись би повз кеш зі значенням і всі одночасно пішли б
  // створювати ту саму PENDING-категорію — а Category.key під
  // unique-constraint, тож N-1 з них впали б з P2002. Записуючи проміс
  // ДО await'у, ми даємо конкурентам приєднатися до вже запущеного
  // резолву замість запуску власного.
  categoryKeyByLabel: Map<string, Promise<string>>;
  /** categoryKey -> articleNumberPrefix */
  categoryPrefixByKey: Map<string, string>;
  // Бюджет на звернення до Grok у сірій зоні матчингу.
  //
  // Це єдина частина обробки листинга, що коштує НЕ мережевий round-trip
  // до Supabase, а повноцінний виклик LLM: GrokService.chatJson —
  // таймаут 10с і retries: 2, тобто до ~30с на ОДНУ позицію. Непривʼязані
  // листинги (а сіра зона за побудовою лишає їх непривʼязаними) пробуються
  // щопрогону, і їх кількість з часом лише зростає — тож без обмеження
  // саме цей виклик з'їдає весь бюджет прогону.
  //
  // Обмежуємо САМЕ виклик LLM, а не повторний матчинг: дешеві кроки
  // (SKU, нечітке порівняння з кешованими кандидатами) хай працюють
  // завжди. Вичерпаний бюджет — не втрата: листинг просто лишається в
  // черзі ручної модерації рівно так само, як коли Grok недоступний, і
  // буде спробуваний наступного прогону. Тобто ПРОПУСК ТУТ НІКОЛИ НЕ
  // СТАЄ ПОСТІЙНИМ — на відміну від спроб вгадати "чи міг результат
  // змінитись", де хибно-негативне спрацювання ховає листинг назавжди.
  llm: LlmBudget;
  /** categoryKey -> поріг акції (%) з PromoSettings */
  promoThresholdByCategory: Map<string, number | null>;
  /** глобальний поріг; undefined = ще не завантажували, null = запису немає */
  globalPromoThreshold: number | null | undefined;
  // Відкладений перерахунок цін. Раніше pricing.recalculate() (4 запити)
  // викликався ОДРАЗУ в linkListing() — тобто товар, до якого прив'язано
  // 5 листингів, перераховувався 5 разів поспіль однаково. Тепер
  // productId лише накопичується тут, а ParserService робить ОДИН
  // перерахунок на товар у кінці прогону вендора. Побічно це прибирає
  // race при паралельній обробці: recalculate() читає всі листинги
  // товару і перезаписує кеш, тож два одночасні виклики для одного
  // товару могли б затерти один одного.
  pendingPricingProductIds: Set<string>;
  /** productId -> category (щоб flush не робив зайвий product.findUnique) */
  categoryByProductId: Map<string, string | null>;
  // Товари, яким цей прогін уже заливав картинки. backfillProductImages —
  // класичний check-then-write (count, потім createMany), і при
  // паралельній обробці два листинги, що зматчились у ОДИН товар, могли
  // обидва побачити count === 0 і обидва створити той самий набір
  // ProductImage (унікального індексу на ProductImage.url немає). У межах
  // прогону відсікаємо це синхронно, ДО будь-якого await.
  imagesBackfilledProductIds: Set<string>;
}

export interface LlmBudget {
  /** Після цього моменту нових звернень до LLM не робимо. */
  deadlineAt: number;
  /** Скільки ще звернень дозволено цього прогону. */
  remaining: number;
  /** Скільки разів бюджет уже змусив пропустити звернення (для логів). */
  skipped: number;
}

// Чи можна зробити ще одне звернення до LLM. Списує квоту синхронно —
// між перевіркою і списанням немає await, тож паралельні позиції не
// можуть перевищити ліміт разом.
export function consumeLlmBudget(cache: ParserRunCache): boolean {
  if (cache.llm.remaining <= 0 || Date.now() >= cache.llm.deadlineAt) {
    // Рахуємо пропуски: інакше "сірої зони цього прогону не було" і
    // "бюджет скінчився на 25-му виклику, ще 400 позицій не подивились"
    // виглядали б у логах однаково — тиха відсутність роботи, яку ніхто
    // не помітить.
    cache.llm.skipped++;
    return false;
  }
  cache.llm.remaining--;
  return true;
}

export function createParserRunCache(llm: LlmBudget): ParserRunCache {
  return {
    exchangeRateByCurrency: new Map(),
    candidatesByCategory: new Map(),
    categoryKeyByLabel: new Map(),
    categoryPrefixByKey: new Map(),
    llm,
    promoThresholdByCategory: new Map(),
    globalPromoThreshold: undefined,
    pendingPricingProductIds: new Set(),
    categoryByProductId: new Map(),
    imagesBackfilledProductIds: new Set(),
  };
}

export function categoryCacheKey(internalKey: string, siteCategoryLabel: string | undefined | null): string {
  return `${internalKey}\u0000${siteCategoryLabel ?? ''}`;
}

// Обмежений пул паралелізму. Обробка listing'а — задача, що майже
// повністю СТОЇТЬ на мережевій латентності (десяток round-trip'ів до
// Supabase), тому кілька позицій "в польоті" одночасно множать пропускну
// здатність майже лінійно, не навантажуючи ні CPU функції, ні планувальник
// Postgres. Свідомо НЕВЕЛИКИЙ дефолт (4): Supabase free tier має жорсткий
// ліміт з'єднань пулера, і парсер тут не єдиний споживач — поруч живий
// трафік сайту. Піднімати через PARSER_CONCURRENCY варто лише разом з
// планом Supabase.
//
// `shouldStop` перевіряється ПЕРЕД запуском кожної нової задачі (а не
// всередині) — це зберігає ту саму семантику дедлайну, що була в
// послідовному циклі: вже розпочаті позиції доводяться до кінця
// (їх дані консистентні), нові не стартують.
//
// Помилка ОКРЕМОЇ позиції не валить увесь прогін. Це не косметика:
// `Promise.all` при відхиленні одного runner'а НЕ скасовує решту — вони
// продовжили б писати в БД уже ПІСЛЯ того, як функція, що їх запустила,
// повернула керування (зокрема — додавати товари в чергу перерахунку
// цін, яку вже очистили). Тому кожна позиція ловить свою помилку сама,
// а виклик отримує їх кількість і вирішує, що з цим робити.
export async function mapWithConcurrency<T>(
  items: T[],
  concurrency: number,
  shouldStop: () => boolean,
  worker: (item: T, index: number) => Promise<void>,
  onItemError?: (err: unknown, item: T, index: number) => void,
): Promise<{ processed: number; failed: number; isComplete: boolean }> {
  let nextIndex = 0;
  let processed = 0;
  let failed = 0;
  let stopped = false;

  const runners = Array.from({ length: Math.max(1, Math.min(concurrency, items.length)) }, async () => {
    for (;;) {
      // Порядок перевірок важливий: спершу "робота скінчилась", і лише
      // потім "час скінчився". Інакше прогін, що встиг обробити ВСЕ рівно
      // під дедлайн, помилково позначався б неповним — і вендор назавжди
      // лишався б без lastFullyParsedAt, вічно першим у черзі.
      if (nextIndex >= items.length) return;
      if (shouldStop()) {
        stopped = true;
        return;
      }
      // Між перевіркою і інкрементом немає await — на однопотоковому
      // event loop два runner'и не можуть отримати той самий індекс.
      const index = nextIndex++;
      try {
        await worker(items[index]!, index);
        processed++;
      } catch (err) {
        failed++;
        // Власний try/catch: якщо колбек-логер сам кине (напр. String(err)
        // на обʼєкті з норовливим toString), помилка вилетіла б з runner'а
        // — і ми повернулись би рівно до тієї проблеми з осиротілими
        // воркерами, заради якої цей catch і написаний.
        try {
          onItemError?.(err, items[index]!, index);
        } catch {
          /* логер не має права зупинити прогін */
        }
      }
    }
  });

  await Promise.all(runners);
  return { processed, failed, isComplete: !stopped && processed + failed === items.length };
}
