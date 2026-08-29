import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PvgisService } from '../calculator/pvgis.service';
import { buildInterpolatedGrid, toCompact, type SamplePoint, type CompactPoint } from './idw-interpolation';

// [lat, lng, tiltDegrees, azimuthDegrees, annualKwhPerKwp] — компактний
// кортеж для експорту/імпорту сирих точок PVGIS, той самий принцип, що
// вже застосований для CompactPoint (interpolatedGrids) — не повторювати
// назви полів на кожен елемент масиву з тисяч точок.
type RawPointTuple = [lat: number, lng: number, tiltDegrees: number, azimuthDegrees: number, annualKwhPerKwp: number];

// За прямим запитом користувача — "заложи в архитектуре сразу что
// возможно масштабирование на другие страны... пока без конкретики по
// странам". COUNTRY_BOUNDS — довідник bounding box'ів по countryCode,
// зараз лише 'UA' заповнений — жодної Польщо-специфічної логіки, просто
// точка розширення: додати нову країну пізніше означає додати один
// рядок сюди, не переписувати сигнатури методів нижче (вони вже
// приймають countryCode параметром).
const COUNTRY_BOUNDS: Record<string, { latMin: number; latMax: number; lngMin: number; lngMax: number }> = {
  // Приблизительный bounding box Украины (без учёта временно оккупированных
  // территорий отдельно — PVGIS отдаёт данные по координатам независимо от
  // границ, это чисто климатологические данные)
  UA: { latMin: 44.3, latMax: 52.4, lngMin: 22.0, lngMax: 40.3 },
};
const DEFAULT_COUNTRY = 'UA';

// За прямим запитом користувача — "увеличим плотность в 2 раза по
// горизонтали и 2 раза по вертикали". Було 1° (171 точка на всю
// Україну — дуже рідко, ~111км між точками). 0.5° — крок вдвічі менший
// в ОБОХ вимірах → приблизно вчетверо більше точок (не просто вдвічі
// загалом, саме подвоєння по кожній осі окремо). Єдина константа, не 3
// окремих дефолтних значення в різних методах нижче (recomputeGrid,
// computeRawGridChunk, getRawGridCoverage) — щоб не розійшлись при
// майбутніх правках, усі три мають рахувати той самий totalPoints для
// коректної математики прогресу.
const DEFAULT_STEP_DEGREES = 0.5;

function getCountryBounds(countryCode: string): { latMin: number; latMax: number; lngMin: number; lngMax: number } {
  const bounds = COUNTRY_BOUNDS[countryCode];
  if (!bounds) throw new Error(`Немає bounding box для країни "${countryCode}" — додайте запис у COUNTRY_BOUNDS (solar-map.service.ts)`);
  return bounds;
}
const DEFAULT_INTERPOLATION_RESOLUTION = 60; // ~60 ячеек по большей стороне bounding box

// ТЗ п.34.2 — offline-этап: разовый прогон регулярной сетки точек по
// Украине через PVGIS API (расширение уже спроектированной модели
// SolarYieldEstimate, используется и калькулятором, и картой — общий кэш),
// затем IDW-интерполяция даёт непрерывный растр вместо дискретных точек.
//
// ОБНОВЛЕНО ПОСЛЕ ПОВТОРНОГО АУДИТА: точки хранятся/передаются в
// компактном формате-кортеже [lat, lng, value] (не {lat, lng, value}) —
// найдено, что объектный массив на тысячах точек означает многократное
// повторение одних и тех же ключей в JSON, реальные лишние байты на
// хранении (SolarMapInterpolatedGrid.cellsJson), в ответе публичного API
// (дёргается на каждой загрузке /solar-map) и в файле экспорта для
// миграции между окружениями (см. ниже). См. idw-interpolation.ts —
// toCompact()/fromCompact().
//
// ОСТАЮЩЕЕСЯ ЧЕСТНОЕ ОГРАНИЧЕНИЕ: результат интерполяции — плотный массив
// точек (JSON), не PMTiles-архив/растровые тайлы — построение реального
// PMTiles-конвейера требует GIS-тулинга (tippecanoe/GDAL-класса
// инструментов или растеризации через `canvas` с нативными биндингами),
// рискованного для serverless-деплоя на Vercel Hobby без возможности
// проверить сборку в этой среде.
@Injectable()
export class SolarMapService {
  private readonly logger = new Logger(SolarMapService.name);
  // Перебудови інтерполяції, що зараз виконуються, за ключем
  // "countryCode:resolution" — див. getGridPoints().
  private readonly interpolationInFlight = new Map<string, Promise<CompactPoint[]>>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly pvgis: PvgisService,
  ) {}

  // countryCode — фільтр по bounding box (не окреме поле в
  // SolarYieldEstimate, воно навмисно без countryCode, див. коментар у
  // schema.prisma) — без цього фільтра точки іншої країни потрапляли б у
  // той самий пул сэмплів для IDW-інтерполяції.
  private async getRawSamplePoints(countryCode: string): Promise<SamplePoint[]> {
    const bounds = getCountryBounds(countryCode);
    const rows = await this.prisma.client.solarYieldEstimate.findMany({
      where: {
        tiltDegrees: 35,
        azimuthDegrees: 0,
        lat: { gte: bounds.latMin, lte: bounds.latMax },
        lng: { gte: bounds.lngMin, lte: bounds.lngMax },
      },
      select: { lat: true, lng: true, annualKwhPerKwp: true },
    });
    return rows.map((r) => ({ lat: r.lat, lng: r.lng, value: Number(r.annualKwhPerKwp) }));
  }

  // Той самий фільтр, що getRawSamplePoints(), але лише COUNT — щоб на
  // кожен публічний запит карти не тягти 600 рядків із БД заради
  // порівняння з sourcePoints збереженої сітки (див. getGridPoints).
  private countRawSamplePoints(countryCode: string): Promise<number> {
    const bounds = getCountryBounds(countryCode);
    return this.prisma.client.solarYieldEstimate.count({
      where: {
        tiltDegrees: 35,
        azimuthDegrees: 0,
        lat: { gte: bounds.latMin, lte: bounds.latMax },
        lng: { gte: bounds.lngMin, lte: bounds.lngMax },
      },
    });
  }

  // Публичный метод для карты — возвращает интерполированную сетку
  // компактными кортежами [lat, lng, annualKwhPerKwp]. Если кэш ещё не
  // построен — строит на лету и кэширует. countryCode параметром —
  // підготовка до мультикраїнності, дефолт 'UA' зберігає поточну
  // поведінку без змін для всіх наявних викликів.
  //
  // АУДИТ 29.08.2026 — знайдено наживо. Крон pvgis_country_grid зібрав
  // 589 сирих точок і відзвітував "ПОВНІСТЮ ЗІБРАНО", а публічна карта
  // далі писала "Дані сітки ще не розраховані". Причина була саме тут:
  // збережена сітка віддавалась БЕЗУМОВНО, скільки б нових сирих точок
  // після неї не з'явилось. Крон додає точки в SolarYieldEstimate й
  // НІКОЛИ не перебудовує інтерполяцію (cron.service.ts, case
  // 'pvgis_country_grid' — там був лише computeRawGridChunk), а ручний
  // recompute-interpolation в адмінці ніхто не натискав. Тобто карта
  // назавжди залишалась знімком того моменту, коли її вперше хтось
  // запросив — у гіршому випадку порожнім знімком (див. нижче).
  //
  // Тому: sourcePoints збереженої сітки звіряється з поточною кількістю
  // сирих точок. Розійшлись — перебудовуємо. Це один COUNT на запит
  // (індексований, ~600 рядків), не 600 рядків даних, і воно робить
  // карту самовідновлюваною незалежно від того, чи хтось не забув
  // смикнути перерахунок.
  async getGridPoints(resolution = DEFAULT_INTERPOLATION_RESOLUTION, countryCode = DEFAULT_COUNTRY): Promise<CompactPoint[]> {
    const [cached, currentSamples] = await Promise.all([
      this.prisma.client.solarMapInterpolatedGrid.findUnique({
        where: { countryCode_resolution: { countryCode, resolution } },
      }),
      this.countRawSamplePoints(countryCode),
    ]);

    const cells = (cached?.cellsJson as unknown as CompactPoint[] | undefined) ?? [];
    const usableCells = Array.isArray(cells) && cells.length > 0 ? cells : null;

    if (cached && usableCells && cached.sourcePoints === currentSamples) return usableCells;

    if (cached) {
      // Дві різні причини перебудови — і в лозі вони мають виглядати
      // по-різному: "не збігається кількість точок" і "збережена сітка
      // порожня" діагностуються зовсім не однаково. Порожня збережена
      // сітка досяжна лише через importData з порожнім cells, але
      // наслідок ("карта не розрахована" назавжди) надто дорогий, щоб
      // покладатись на те, що такого файлу ніхто не заллє.
      this.logger.log(
        usableCells
          ? `Інтерпольована сітка (${countryCode}, resolution=${resolution}) застаріла: ${cached.sourcePoints} → ${currentSamples} сирих точок — перебудовую.`
          : `Інтерпольована сітка (${countryCode}, resolution=${resolution}) збережена порожньою — перебудовую.`,
      );
    }

    // Single-flight: паралельні запити до карти чекають ОДНУ перебудову,
    // а не запускають по своїй. Це публічна сторінка без rate-limit
    // (включно з /embed/solar-map у чужих iframe), а перебудова — це
    // ~1647 клітинок × ~600 семплів гаверсинусів на однопотоковому
    // event loop плюс upsert ~41 КБ JSON. Дедуп у межах інстанса, не
    // глобальний (serverless), але саме сплеск на одному інстансі й
    // коштує дорого.
    const key = `${countryCode}:${resolution}`;
    const inFlight = this.interpolationInFlight.get(key);
    if (inFlight) return inFlight;

    const promise = this.recomputeInterpolation(resolution, countryCode)
      .catch((err) => {
        // КЛЮЧОВЕ: перебудова падає (таймаут пулера Supabase під час
        // 200-секундного крону, statement timeout на upsert) — а в руках
        // у нас лежить цілком робоча збережена сітка. Віддати 500 і
        // показати відвідувачу "дані ще не розраховані" замість трохи
        // застарілої карти — це рівно той симптом, заради якого вся ця
        // правка й робилась. Тому: є що віддати — віддаємо.
        this.logger.error(`Не вдалось перебудувати інтерпольовану сітку (${key}): ${err}`);
        if (usableCells) return usableCells;
        throw err;
      })
      .finally(() => this.interpolationInFlight.delete(key));

    this.interpolationInFlight.set(key, promise);
    return promise;
  }

  async recomputeInterpolation(resolution = DEFAULT_INTERPOLATION_RESOLUTION, countryCode = DEFAULT_COUNTRY): Promise<CompactPoint[]> {
    const samples = await this.getRawSamplePoints(countryCode);
    if (samples.length === 0) return [];

    const grid = toCompact(buildInterpolatedGrid(samples, getCountryBounds(countryCode), resolution));

    await this.prisma.client.solarMapInterpolatedGrid.upsert({
      where: { countryCode_resolution: { countryCode, resolution } },
      create: { countryCode, resolution, cellsJson: grid as unknown as object, sourcePoints: samples.length },
      update: { cellsJson: grid as unknown as object, sourcePoints: samples.length, computedAt: new Date() },
    });

    return grid;
  }

  async recomputeGrid(stepDegrees = DEFAULT_STEP_DEGREES, countryCode = DEFAULT_COUNTRY): Promise<{ pointsComputed: number; pointsFailed: number; interpolatedCells: number }> {
    let computed = 0;
    let failed = 0;
    const bounds = getCountryBounds(countryCode);

    for (let lat = bounds.latMin; lat <= bounds.latMax; lat += stepDegrees) {
      for (let lng = bounds.lngMin; lng <= bounds.lngMax; lng += stepDegrees) {
        const roundedLat = Math.round(lat * 100) / 100;
        const roundedLng = Math.round(lng * 100) / 100;
        try {
          const value = await this.pvgis.getAnnualKwhPerKwp(roundedLat, roundedLng);
          if (value !== null) computed++;
          else failed++;
        } catch (err) {
          this.logger.warn(`Grid point (${roundedLat}, ${roundedLng}) failed: ${err}`);
          failed++;
        }
      }
    }

    const interpolated = await this.recomputeInterpolation(DEFAULT_INTERPOLATION_RESOLUTION, countryCode);

    return { pointsComputed: computed, pointsFailed: failed, interpolatedCells: interpolated.length };
  }

  // За прямим запитом користувача — "ітеративний ідемпотентний крон джоб
  // з менеджментом часу запуску в районі 200 секунд і прогрес
  // індикацією, рахувати PVGIS для всієї країни (сирі дані)". На
  // відміну від recomputeGrid() вище (один синхронний прохід БЕЗ бюджету
  // часу — для ручного адмінського кліку, де людина свідомо чекає), цей
  // метод:
  // - ІДЕМПОТЕНТНИЙ природно через кеш SolarYieldEstimate (той самий, що
  //   вже використовує getAnnualKwhPerKwp) — точки, які вже пораховані,
  //   пропускаються без виклику PVGIS. Явна перевірка тут (не покладання
  //   лише на внутрішній кеш-чек усередині getAnnualKwhPerKwp) — щоб не
  //   витрачати навіть дешевий DB-запит на кожну вже готову точку окремо,
  //   а звірити разом одним запитом на старті.
  // - ІТЕРАТИВНИЙ — обробляє точки, поки не вичерпається часовий бюджет,
  //   потім зупиняється; наступний виклик (наступний запуск крону)
  //   природно продовжує з того місця, де кеш закінчився — жодного
  //   явного "checkpoint"-поля в БД не потрібно, сам кеш і є прогресом.
  // - ЧАСОВИЙ БЮДЖЕТ — за замовчуванням 200с (як прямо попросив
  //   користувач). SAFETY_MARGIN_MS розрахований від реального
  //   найгіршого випадку одного виклику PVGIS: fetchWithRetry(retries:2,
  //   timeoutMs:15_000) → до 3 спроб по 15с + backoff (500мс·1 + 500мс·2)
  //   ≈ 46.5с найгірший випадок — тому НЕ починаємо нову точку, якщо
  //   лишилось менше 50с бюджету (не просто округлене число, а
  //   обчислене з реальної логіки ретраїв).
  // - ПРОГРЕС — повертає totalPoints/alreadyCachedAtStart/newlyComputed/
  //   remainingPoints/isComplete — досить деталей, щоб і крон-лог
  //   (debugLog), і адмінка могли показати, скільки лишилось.
  async computeRawGridChunk(
    stepDegrees = DEFAULT_STEP_DEGREES,
    timeBudgetMs = 200_000,
    countryCode = DEFAULT_COUNTRY,
  ): Promise<{
    totalPoints: number;
    alreadyCachedAtStart: number;
    newlyComputed: number;
    newlyFailed: number;
    // За прямим запитом користувача ("pvgis последние три прохода не
    // дотягивает данные") — реальні координати й причина падіння для
    // кожної невдалої точки, не лише лічильник. Прогони по ~1-2с для
    // тих самих 2 точок щоразу — явна ознака швидкого детермінованого
    // провалу (PVGIS повертає HTTP 200 з JSON-полем "message" при
    // некоректних/непокритих координатах, а не таймаут із ретраями,
    // який зайняв би значно довше), не флакі мережевої проблеми.
    failedPoints: { lat: number; lng: number; diagnostic: string; permanent: boolean }[];
    remainingPoints: number;
    isComplete: boolean;
    elapsedMs: number;
    progressPercent: number;
    // АУДИТ 29.08.2026 — раніше цей джоб лише наповнював сирий кеш і
    // мовчки лишав публічну карту такою, якою вона була — звідси
    // "589/629, ПОВНІСТЮ ЗІБРАНО" в адмінці проти "дані ще не
    // розраховані" на сайті. Тепер він її перебудовує й ЗВІТУЄ про це.
    //
    // Три стани, а не число з null: 'skipped' (нових точок не було —
    // нічого перебудовувати) і 'failed' (перебудова впала) — це зовсім
    // різні речі, і саме їх злиття в одне "нічого не написано в
    // зведенні" відтворило б ту саму розбіжність, заради якої поле й
    // додане.
    interpolation: { status: 'rebuilt'; cells: number } | { status: 'skipped' } | { status: 'failed'; error: string };
  }> {
    const startedAt = Date.now();
    // Найгірший випадок одного виклику PVGIS (fetchWithRetry всередині
    // getAnnualKwhPerKwp: retries=2, timeoutMs=15_000) — 3 спроби по 15с
    // + backoff 500·2^0 + 500·2^1 = 1500мс ≈ 46.5с. Запас 50с — трохи
    // більше цього найгіршого випадку, не довільне кругле число.
    const SAFETY_MARGIN_MS = 50_000;
    const bounds = getCountryBounds(countryCode);

    const allPoints: { lat: number; lng: number }[] = [];
    for (let lat = bounds.latMin; lat <= bounds.latMax; lat += stepDegrees) {
      for (let lng = bounds.lngMin; lng <= bounds.lngMax; lng += stepDegrees) {
        allPoints.push({ lat: Math.round(lat * 100) / 100, lng: Math.round(lng * 100) / 100 });
      }
    }
    const totalPoints = allPoints.length;

    // Один запит, звіряємо всі точки разом — не окремий DB-хіт на кожну
    // вже готову точку в циклі нижче.
    const cachedRows = await this.prisma.client.solarYieldEstimate.findMany({
      where: { tiltDegrees: 35, azimuthDegrees: 0 },
      select: { lat: true, lng: true },
    });
    const cachedSet = new Set(cachedRows.map((r) => `${r.lat},${r.lng}`));
    // АУДИТ 29.08.2026 — тут було `cachedSet.size`, тобто ВСІ рядки
    // PVGIS-кешу. А SolarYieldEstimate — кеш СПІЛЬНИЙ: калькулятор
    // (CalculatorService.exportPackage → getAnnualKwhPerKwp(city.lat,
    // city.lng)) пише туди координати міст Нової Пошти з тими самими
    // дефолтними tilt 35 / azimuth 0. Це довільні числа на кшталт
    // 50.4501 — вони НІКОЛИ не є точками сітки, але роздували лічильник
    // "вже пораховано" і віднімались від remainingPoints. Наслідок:
    // 584 реальні точки сітки + 5 міст = 589 → remainingPoints = 0 →
    // "ПОВНІСТЮ ЗІБРАНО", тоді як три точки сітки ще не зібрані.
    // Рахуємо тільки перетин зі справжнім списком точок сітки.
    const alreadyCachedAtStart = allPoints.filter((p) => cachedSet.has(`${p.lat},${p.lng}`)).length;

    let newlyComputed = 0;
    const failedPoints: { lat: number; lng: number; diagnostic: string; permanent: boolean }[] = [];
    let stoppedEarlyOnBudget = false;

    console.log(`[SolarMapService] computeRawGridChunk: ${alreadyCachedAtStart}/${totalPoints} вже закешовано, бюджет часу ${Math.round(timeBudgetMs / 1000)}с...`);

    for (const point of allPoints) {
      if (cachedSet.has(`${point.lat},${point.lng}`)) continue;

      if (Date.now() - startedAt > timeBudgetMs - SAFETY_MARGIN_MS) {
        stoppedEarlyOnBudget = true;
        console.log(`[SolarMapService] Часовий бюджет вичерпано (${Math.round((Date.now() - startedAt) / 1000)}с) — зупиняюсь, продовжу наступним запуском.`);
        break;
      }

      const result = await this.pvgis.getAnnualKwhPerKwpWithDiagnostic(point.lat, point.lng);
      if (result.value !== null) {
        newlyComputed++;
      } else {
        failedPoints.push({ lat: point.lat, lng: point.lng, diagnostic: result.diagnostic, permanent: result.permanent });
      }
    }

    // За прямим запитом користувача (реальний прогін показав "Location
    // over the sea" — точки, що НІКОЛИ не отримають дані PVGIS,
    // незалежно від кількості спроб) — permanent-точки віднімаються з
    // remainingPoints ОКРЕМО від newlyComputed: інакше progress/
    // isComplete назавжди застрягли б нижче 100%, хоча насправді ВСЕ, що
    // фізично можливо, вже зроблено. Точки все одно НЕ кешуються (не
    // мають реального значення для збереження) — кожен майбутній прогін
    // все одно один раз спробує їх знову (щоб не покладатись на
    // непостійну класифікацію "permanent" без реальної повторної
    // перевірки), але коректно порахує це як завершений цикл, не
    // "недороблений".
    // Перебудова інтерполяції ОДРАЗУ після додавання сирих точок — не
    // наступним окремим джобом і не ручним кліком в адмінці. Дешево
    // (чиста математика по ~600 точках, частки секунди проти 200с
    // бюджету самого джоба) і прибирає цілий клас розбіжностей
    // "адмінка каже 100%, сайт каже нічого немає".
    //
    // Помилка тут НЕ валить прогін: сирі точки вже збережені, це головне;
    // getGridPoints() однаково перебудує сітку на першому ж запиті, бо
    // звіряє sourcePoints. Тому лише лог.
    let interpolation: { status: 'rebuilt'; cells: number } | { status: 'skipped' } | { status: 'failed'; error: string } = {
      status: 'skipped',
    };
    if (newlyComputed > 0) {
      try {
        const cells = await this.recomputeInterpolation(DEFAULT_INTERPOLATION_RESOLUTION, countryCode);
        interpolation = { status: 'rebuilt', cells: cells.length };
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        this.logger.error(`Не вдалось перебудувати інтерполяцію після збору сирих точок: ${message}`);
        interpolation = { status: 'failed', error: message };
      }
    }

    const permanentlyFailedCount = failedPoints.filter((f) => f.permanent).length;
    const remainingPoints = Math.max(0, totalPoints - alreadyCachedAtStart - newlyComputed - permanentlyFailedCount);
    const isComplete = remainingPoints === 0 && !stoppedEarlyOnBudget;
    const progressPercent = totalPoints > 0 ? Math.round(((totalPoints - remainingPoints) / totalPoints) * 100) : 100;

    console.log(`[SolarMapService] computeRawGridChunk завершено: +${newlyComputed} нових точок, +${failedPoints.length} з помилкою (${permanentlyFailedCount} назавжди поза покриттям), прогрес ${progressPercent}%${isComplete ? ' — ПОВНІСТЮ ЗІБРАНО (з урахуванням непокритих морем точок)' : ''}.`);
    if (failedPoints.length > 0) {
      console.log(`[SolarMapService] Точки з помилкою: ${failedPoints.map((f) => `(${f.lat}, ${f.lng}): ${f.diagnostic}`).join(' | ')}`);
    }

    return {
      totalPoints,
      alreadyCachedAtStart,
      newlyComputed,
      newlyFailed: failedPoints.length,
      failedPoints,
      remainingPoints,
      isComplete,
      elapsedMs: Date.now() - startedAt,
      progressPercent,
      interpolation,
    };
  }

  // Легкий статус покриття сітки — БЕЗ жодних викликів PVGIS, лише
  // підрахунок кешу проти детермінованого повного списку точок. Для
  // адмінки, щоб показати прогрес у будь-який момент, не тільки одразу
  // після запуску джоба.
  async getRawGridCoverage(stepDegrees = DEFAULT_STEP_DEGREES, countryCode = DEFAULT_COUNTRY): Promise<{ totalPoints: number; cachedPoints: number; progressPercent: number }> {
    const bounds = getCountryBounds(countryCode);
    const gridKeys = new Set<string>();
    for (let lat = bounds.latMin; lat <= bounds.latMax; lat += stepDegrees) {
      for (let lng = bounds.lngMin; lng <= bounds.lngMax; lng += stepDegrees) {
        gridKeys.add(`${Math.round(lat * 100) / 100},${Math.round(lng * 100) / 100}`);
      }
    }
    const totalPoints = gridKeys.size;

    // АУДИТ 29.08.2026 — тут був COUNT усіх рядків кешу в межах країни,
    // а SolarYieldEstimate спільний із калькулятором (координати міст
    // Нової Пошти пишуться туди з тими самими tilt 35 / azimuth 0).
    // Місто — не точка сітки, але воно потрапляло в лічильник, і
    // `Math.min(cachedPoints, totalPoints)` це маскував: щойно сума
    // переростала totalPoints, адмінка бачила рівно 100% незалежно від
    // реального покриття. Тепер звіряємо КООРДИНАТИ з детермінованим
    // списком точок сітки — той самий принцип, що в
    // computeRawGridChunk(), щоб два лічильники не розходились.
    const rows = await this.prisma.client.solarYieldEstimate.findMany({
      where: {
        tiltDegrees: 35,
        azimuthDegrees: 0,
        lat: { gte: bounds.latMin, lte: bounds.latMax },
        lng: { gte: bounds.lngMin, lte: bounds.lngMax },
      },
      select: { lat: true, lng: true },
    });
    let cachedPoints = 0;
    for (const r of rows) {
      if (gridKeys.has(`${r.lat},${r.lng}`)) cachedPoints++;
    }

    return { totalPoints, cachedPoints, progressPercent: totalPoints > 0 ? Math.round((cachedPoints / totalPoints) * 100) : 100 };
  }

  // За прямим запитом користувача ("pvgis кеш как обнулить") — раніше
  // існував лише PvgisService.refresh() для ОДНІЄЇ точки, жодного
  // масового скидання не було, доводилось лізти в SQL напряму. Особливо
  // актуально одразу після переходу v5_2 → v5_3 (розділ README) — старі
  // закешовані значення з версії 5.2 варто перерахувати заново з
  // оновленого джерела даних (SARAH-3, розширене покриття моря), не
  // лишати змішаними в одній таблиці. countryCode — той самий
  // географічний фільтр, що й в getRawSamplePoints()/
  // getRawGridCoverage(), щоб скидання однієї країни не чіпало дані
  // потенційної іншої в майбутньому. interpolatedGridsToo — сітки самі
  // перерахуються при наступному recomputeInterpolation(), але видалити
  // їх одразу теж — щоб не показувати застарілу інтерпольовану карту,
  // поки сирі точки ще не перезібрані.
  async resetRawGridCache(countryCode = DEFAULT_COUNTRY, interpolatedGridsToo = true): Promise<{ deletedRawPoints: number; deletedGrids: number }> {
    const bounds = getCountryBounds(countryCode);
    const { count: deletedRawPoints } = await this.prisma.client.solarYieldEstimate.deleteMany({
      where: { lat: { gte: bounds.latMin, lte: bounds.latMax }, lng: { gte: bounds.lngMin, lte: bounds.lngMax } },
    });

    let deletedGrids = 0;
    if (interpolatedGridsToo) {
      const result = await this.prisma.client.solarMapInterpolatedGrid.deleteMany({ where: { countryCode } });
      deletedGrids = result.count;
    }

    console.log(`[SolarMapService] Кеш скинуто: видалено ${deletedRawPoints} сирих точок, ${deletedGrids} інтерпольованих сіток (countryCode: ${countryCode}).`);
    return { deletedRawPoints, deletedGrids };
  }

  // ---- Экспорт/импорт для миграции между окружениями ----
  // Тот же паттерн, что VendorDataTransferService (Фаза 2) — экспорт сырых
  // точек PVGIS (дорого пересчитывать заново без сетевого доступа к PVGIS
  // в целевом окружении, напр. локальная разработка) + закэшированных
  // интерполированных сеток разом, идемпотентный импорт.

  // За запитом користувача — "Compactor json для PVGIS?" — перевірено:
  // interpolatedGrids.cells вже використовував компактні кортежі
  // ([lat, lng, value], toCompact()/fromCompact() у idw-interpolation.ts,
  // розділ 34.2), але rawPoints нижче досі був багатослівними об'єктами
  // з 5 однаковими ключами на кожну точку — та сама проблема, що вже
  // виправлялась для interpolatedGrids, просто не застосована тут.
  // Особливо важливо тепер: новий ітеративний джоб pvgis_country_grid
  // (розділ 49) з часом накопичує набагато більше сирих точок, ніж
  // одноразовий ручний перерахунок раніше.
  //
  // formatVersion піднято з 1 до 2 — формат rawPoints змінився (кортеж
  // замість об'єкта), стара версія формату явно відхиляється у
  // validateImportPayload нижче з чіткою помилкою, не мовчки ламається.
  // RawPointTuple — [lat, lng, tiltDegrees, azimuthDegrees, annualKwhPerKwp].
  // formatVersion піднято з 2 до 3 — interpolatedGrids тепер несе
  // countryCode (SolarMapInterpolatedGrid отримав складений унікальний
  // ключ (countryCode, resolution) замість одного лише resolution, див.
  // коментар у schema.prisma) — підготовка до мультикраїнності.
  async exportData(): Promise<{
    formatVersion: 3;
    exportedAt: string;
    rawPoints: RawPointTuple[];
    interpolatedGrids: { countryCode: string; resolution: number; sourcePoints: number; cells: CompactPoint[] }[];
  }> {
    const rawRows = await this.prisma.client.solarYieldEstimate.findMany();
    const gridRows = await this.prisma.client.solarMapInterpolatedGrid.findMany();

    return {
      formatVersion: 3,
      exportedAt: new Date().toISOString(),
      rawPoints: rawRows.map(
        (r): RawPointTuple => [r.lat, r.lng, r.tiltDegrees, r.azimuthDegrees, Number(r.annualKwhPerKwp)],
      ),
      interpolatedGrids: gridRows.map((g) => ({
        countryCode: g.countryCode,
        resolution: g.resolution,
        sourcePoints: g.sourcePoints,
        cells: g.cellsJson as unknown as CompactPoint[],
      })),
    };
  }

  async importData(payload: unknown): Promise<{
    rawPointsCreated: number;
    rawPointsUpdated: number;
    gridsCreated: number;
    gridsUpdated: number;
    errors: string[];
  }> {
    const data = this.validateImportPayload(payload);
    const result = { rawPointsCreated: 0, rawPointsUpdated: 0, gridsCreated: 0, gridsUpdated: 0, errors: [] as string[] };

    for (const p of data.rawPoints) {
      const [lat, lng, tiltDegrees, azimuthDegrees, annualKwhPerKwp] = p;
      try {
        const existing = await this.prisma.client.solarYieldEstimate.findUnique({
          where: {
            lat_lng_tiltDegrees_azimuthDegrees: { lat, lng, tiltDegrees, azimuthDegrees },
          },
        });
        if (existing) {
          await this.prisma.client.solarYieldEstimate.update({
            where: { id: existing.id },
            data: { annualKwhPerKwp, fetchedAt: new Date() },
          });
          result.rawPointsUpdated++;
        } else {
          await this.prisma.client.solarYieldEstimate.create({
            data: { lat, lng, tiltDegrees, azimuthDegrees, annualKwhPerKwp },
          });
          result.rawPointsCreated++;
        }
      } catch (err) {
        result.errors.push(`point (${lat}, ${lng}): ${err instanceof Error ? err.message : err}`);
      }
    }

    for (const g of data.interpolatedGrids) {
      try {
        const existing = await this.prisma.client.solarMapInterpolatedGrid.findUnique({
          where: { countryCode_resolution: { countryCode: g.countryCode, resolution: g.resolution } },
        });
        await this.prisma.client.solarMapInterpolatedGrid.upsert({
          where: { countryCode_resolution: { countryCode: g.countryCode, resolution: g.resolution } },
          create: { countryCode: g.countryCode, resolution: g.resolution, cellsJson: g.cells as unknown as object, sourcePoints: g.sourcePoints },
          update: { cellsJson: g.cells as unknown as object, sourcePoints: g.sourcePoints, computedAt: new Date() },
        });
        if (existing) result.gridsUpdated++;
        else result.gridsCreated++;
      } catch (err) {
        result.errors.push(`grid (${g.countryCode}, resolution=${g.resolution}): ${err instanceof Error ? err.message : err}`);
      }
    }

    return result;
  }

  private validateImportPayload(payload: unknown): {
    rawPoints: RawPointTuple[];
    interpolatedGrids: { countryCode: string; resolution: number; sourcePoints: number; cells: CompactPoint[] }[];
  } {
    if (!payload || typeof payload !== 'object') {
      throw new Error("Некоректний файл — очікувався JSON-об'єкт");
    }
    const data = payload as Record<string, unknown>;
    // Старі версії формату (1 — rawPoints як об'єкти; 2 — interpolatedGrids
    // без countryCode, підготовка до мультикраїнності) явно відхиляються з
    // чіткою помилкою, не намагаються розпарситись мовчки в новому форматі
    // й впасти незрозуміло на кожному елементі.
    if (data.formatVersion === 1) {
      throw new Error(
        'Файл використовує застарілий формат (version 1, rawPoints як об\'єкти) — перевиконайте експорт в актуальному оточенні (актуальна версія — 3).',
      );
    }
    if (data.formatVersion === 2) {
      throw new Error(
        'Файл використовує застарілий формат (version 2, interpolatedGrids без countryCode) — перевиконайте експорт в актуальному оточенні (актуальна версія — 3).',
      );
    }
    if (data.formatVersion !== 3) {
      throw new Error(`Непідтримувана версія формату: ${data.formatVersion} (очікується 3)`);
    }
    if (!Array.isArray(data.rawPoints) || !Array.isArray(data.interpolatedGrids)) {
      throw new Error('Поля rawPoints/interpolatedGrids мають бути масивами');
    }
    for (const p of data.rawPoints) {
      if (!Array.isArray(p) || p.length !== 5 || p.some((v) => typeof v !== 'number')) {
        throw new Error('Кожен елемент rawPoints має бути кортежем із 5 чисел [lat, lng, tiltDegrees, azimuthDegrees, annualKwhPerKwp]');
      }
    }
    return data as never;
  }
}
