import { fetchWithRetry } from './fetch-with-retry';

// За прямим запитом користувача — реальний прогін показав, що частина
// RSS-записів pv-magazine.com ГЕНУЇННО не містить тег картинки взагалі
// (перевірено діагностикою — content:encoded присутній, але без <img>
// всередині) — це не баг парсингу, RSS-запис просто не несе фото. Той
// самий og:image-fetch, що вже РЕАЛЬНО перевірений на живому прогоні
// для financing.service.ts (oschadbank.ua, Incapsula bypass
// підтверджено), винесено сюди в СПІЛЬНИЙ модуль — щоб ArticlesService
// міг використати його як fallback: якщо RSS не дав картинку, пробуємо
// og:image зі сторінки самої статті (sourceUrl). FinancingService
// оновлено використовувати цей самий спільний модуль замість власної
// копії — один спільний, вже перевірений шлях, не дублювання коду.

const BROWSER_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'uk-UA,uk;q=0.9,ru;q=0.8,en;q=0.7',
};

export async function fetchOgImage(pageUrl: string): Promise<{ imageUrl: string | null; diagnostic: string }> {
  const lightResult = await fetchOgImageLight(pageUrl);
  if (lightResult.imageUrl || !lightResult.needsHeadlessBrowser) {
    return { imageUrl: lightResult.imageUrl, diagnostic: lightResult.diagnostic };
  }

  console.log(`[og-image-fetcher] ${pageUrl}: легкий fetch зіткнувся з бот-захистом (${lightResult.diagnostic}) — пробую headless-браузер...`);
  const browserResult = await fetchOgImageWithBrowser(pageUrl);
  console.log(`[og-image-fetcher] ${pageUrl}: headless-браузер → ${browserResult.diagnostic}`);
  return browserResult;
}

async function fetchOgImageLight(
  pageUrl: string,
): Promise<{ imageUrl: string | null; diagnostic: string; needsHeadlessBrowser: boolean }> {
  try {
    const res = await fetchWithRetry(pageUrl, { retries: 1, timeoutMs: 8_000, headers: BROWSER_HEADERS });
    if (!res.ok) {
      // За прямим запитом користувача — реальний скріншот показав
      // ТОЧНИЙ HTTP-статус 403 для сторінки, що НАСПРАВДІ відкривається
      // й показує потрібну картинку у звичайному браузері (підтверджено
      // на попередньому скріншоті користувача). Знайдено реальний
      // пробіл: попередній код здавався на БУДЬ-ЯКОМУ не-2xx статусі
      // одразу, НЕ ескалюючи на headless-браузер взагалі — хоча 403/429
      // є КЛАСИЧНИМИ ознаками простого бот-блокування (за User-Agent/
      // заголовками), не "сторінка не існує" (як 404) — саме заради
      // такого класу випадків headless-браузер і існує. Тепер
      // ескалюємо саме на цих двох статусах, лишаємо решту (404, 500
      // тощо) без ескалації — реальна відсутність/помилка сторінки
      // headless-браузером не виправиться.
      const isBotBlockStatus = res.status === 403 || res.status === 429;
      return { imageUrl: null, diagnostic: `HTTP ${res.status}`, needsHeadlessBrowser: isBotBlockStatus };
    }
    const html = await res.text();

    const looksLikeJsChallenge =
      /checking your browser|cf-browser-verification|challenge-platform|__cf_chl_|akamai|_incapsula_|incapsula/i.test(html) &&
      html.length < 5000;
    if (looksLikeJsChallenge) {
      return { imageUrl: null, diagnostic: `HTML ${html.length}б — JS-челлендж (Cloudflare/Akamai/Incapsula)`, needsHeadlessBrowser: true };
    }

    if (html.length < 1000) {
      return {
        imageUrl: null,
        diagnostic: `HTML лише ${html.length}б (підозріло мало), фінальний URL: ${res.url} — вміст: ${JSON.stringify(html.slice(0, 300))}`,
        needsHeadlessBrowser: true,
      };
    }

    const raw = extractImageFromHtml(html);
    if (!raw) {
      return { imageUrl: null, diagnostic: `HTML ${html.length}б отримано, жоден із селекторів не спрацював`, needsHeadlessBrowser: false };
    }

    try {
      return { imageUrl: new URL(raw, pageUrl).toString(), diagnostic: 'OK', needsHeadlessBrowser: false };
    } catch {
      return raw.startsWith('http')
        ? { imageUrl: raw, diagnostic: 'OK (без резолву — вже абсолютний)', needsHeadlessBrowser: false }
        : { imageUrl: null, diagnostic: `знайдено "${raw}", але не вдалося перетворити на абсолютний URL`, needsHeadlessBrowser: false };
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { imageUrl: null, diagnostic: `запит провалився: ${message}`, needsHeadlessBrowser: false };
  }
}

// Прапорці для системного Chromium у Docker-образі.
//
// За прямим запитом користувача ("повторюється іноді, без чіткої
// закономірності") — нерегулярний 500 БЕЗ збереженого errorMessage
// (розділ README) узгоджується з РЕАЛЬНИМ крахом усього Node-процесу
// (не JS-винятком, який уже й так ловиться нижче через try/catch),
// напр. через OOM killer — docker-compose.yml НЕ мав жодних явних
// лімітів пам'яті взагалі, Chromium під навантаженням на "важких"
// урядових/банківських сайтах міг тимчасово споживати сотні мегабайт.
// Не гадаю причину вчетверте — замість цього економлять пам'ять
// прапорці, загальновідомі для headless Chromium у контейнерах з
// обмеженими ресурсами.
const DOCKER_CHROMIUM_ARGS = [
  '--no-sandbox',
  '--disable-setuid-sandbox',
  '--disable-dev-shm-usage',
  '--disable-gpu',
  '--disable-extensions',
  '--disable-background-networking',
  '--disable-background-timer-throttling',
  '--disable-renderer-backgrounding',
  '--js-flags=--max-old-space-size=256',
];

// АУДИТ 29.08.2026 — реальна скарга з проду: кнопка «Спарсити фото» в
// адмінці віддавала 400 «PUPPETEER_EXECUTABLE_PATH не задано». Тобто на
// Vercel (а це і є прод) headless-браузера не було ВЗАГАЛІ, і всі
// сайти з бот-захистом — Ощадбанк за Incapsula передусім — не
// парсились у принципі, лише в локальному Docker.
//
// Береться @sparticuz/chromium-min, а НЕ повний @sparticuz/chromium.
// Причина цілком конкретна: повний пакет розпаковується в ~70 МБ і
// їде у бандл функції, а ліміт Vercel — 250 МБ на функцію разом із
// NestJS і движками Prisma. Перевищення ліміту ламає САМ ДЕПЛОЙ — це
// незрівнянно гірше за непрацюючу кнопку. `-min` важить 46 КБ і тягне
// бінарник у /tmp під час першого виклику: розмір деплою не змінюється
// взагалі, а якщо завантаження не вдасться — повертаємо ту саму
// діагностику, що й раніше, нічого не ламаючи.
//
// Версія прибита цвяхами (127.0.0), і не з обережності заради
// обережності: URL архіву містить версію, а сам Chromium має збігатися
// з протоколом puppeteer-core. У проєкті puppeteer-core 23.11.1, а
// puppeteer-core 23.x їздить саме на Chrome 127 — тому 127.0.0, не
// найсвіжіший 149 (той розрахований на puppeteer-core 25.x).
// Наявність цього файлу за посиланням перевірена через GitHub API:
// chromium-v127.0.0-pack.tar, 65 МБ.
const DEFAULT_CHROMIUM_PACK_URL =
  'https://github.com/Sparticuz/chromium/releases/download/v127.0.0/chromium-v127.0.0-pack.tar';

// ЕКСПЛУАТАЦІЙНІ ЦИФРИ, ЗМІРЯНІ, А НЕ ВГАДАНІ (прогін на цьому ж коді,
// puppeteer-core 23.11.1 + Chromium 127):
//   • завантаження + розпакування архіву — близько 3с, ОДИН раз на
//     інстанс (далі бінарник лежить у /tmp і перевикористовується);
//   • /tmp після розпакування — 178 МБ (ліміт Vercel — 512 МБ);
//   • піковий сумарний RSS (Node + Chromium) на простій сторінці —
//     240 МБ. На важких банківських сторінках буде більше, а ділити
//     пам'ять доводиться ще й з Nest та Prisma. Якщо в діагностиці
//     почнуть з'являтися вбиті процеси — піднімати пам'ять функції в
//     налаштуваннях Vercel; свідомо НЕ роблю цього тут, бо пам'ять
//     тарифікується на КОЖНИЙ запит до API, а не лише на цю кнопку.
const CHROMIUM_DOWNLOAD_TIMEOUT_MS = 60_000;

// Мінімальний правдоподібний розмір розпакованого бінарника. Реальний —
// 178 МБ; усе, що суттєво менше, означає обірваний файл (див.
// коментар про /tmp/chromium нижче).
const MIN_CHROMIUM_BINARY_BYTES = 100 * 1024 * 1024;
const EXTRACTED_CHROMIUM_PATH = '/tmp/chromium';

// Скільки не повторювати невдалу спробу підняти браузер. Без цього
// прогін парсера по десятку кандидатів із бот-захистом платив би
// таймаут завантаження на КОЖНОМУ (financing.service.ts.runParser
// взагалі не має бюджету часу) і вилітав би за maxDuration функції.
const LAUNCH_FAILURE_COOLDOWN_MS = 10 * 60 * 1000;

// Дискримінант — рядок, не булеве поле: булеві літерали не звужують
// union, якщо strictNullChecks вимкнено, і файл переставав
// компілюватись поза основним tsconfig проєкту.
type BrowserLaunchPlan =
  | { kind: 'ready'; executablePath: string; args: string[]; headless: true | 'shell'; source: string }
  | { kind: 'unavailable'; diagnostic: string };

// Один розв'язувач на інстанс, а не на виклик.
//
// Дві окремі причини, обидві реальні:
//   1. ПАРАЛЕЛЬНІСТЬ. Vercel виконує кілька запитів на одному інстансі,
//      а крон (financing_program_parser) ходить сюди в циклі. Бібліотека
//      вважає бінарник готовим за самою НАЯВНІСТЮ /tmp/chromium, тоді як
//      файл існує вже з першого запису — тобто другий виклик міг
//      отримати шлях до наполовину розпакованого файлу й спробувати його
//      запустити.
//   2. ВАРТІСТЬ ПОВТОРУ. Без пам'яті про результат кожен кандидат у
//      циклі заново платив би за завантаження (або за його таймаут).
//
// Невдача теж запам'ятовується, але лише на LAUNCH_FAILURE_COOLDOWN_MS —
// щоб тимчасова проблема з мережею не вимикала функцію назавжди.
let launchPlanPromise: Promise<BrowserLaunchPlan> | null = null;
let launchPlanFailedAt = 0;

function resolveBrowserLaunchPlan(): Promise<BrowserLaunchPlan> {
  if (launchPlanPromise && Date.now() - launchPlanFailedAt >= LAUNCH_FAILURE_COOLDOWN_MS) {
    launchPlanPromise = null;
  }
  if (!launchPlanPromise) {
    launchPlanPromise = buildBrowserLaunchPlan().then((plan) => {
      if (plan.kind === 'unavailable') launchPlanFailedAt = Date.now();
      else launchPlanFailedAt = 0;
      return plan;
    });
  }
  return launchPlanPromise;
}

async function buildBrowserLaunchPlan(): Promise<BrowserLaunchPlan> {
  // Docker-образ: системний Chromium, шлях заданий у Dockerfile.
  // Перевіряється ПЕРШИМ — локально качати 65 МБ із GitHub безглуздо,
  // браузер уже лежить у контейнері.
  const explicit = process.env.PUPPETEER_EXECUTABLE_PATH?.trim();
  if (explicit) {
    return { kind: 'ready', executablePath: explicit, args: DOCKER_CHROMIUM_ARGS, headless: true, source: 'системний Chromium (PUPPETEER_EXECUTABLE_PATH)' };
  }

  // `|| `, а не `?? `: змінна оточення, оголошена в дашборді Vercel і
  // залишена порожньою, — це порожній РЯДОК, а не undefined, і `??`
  // його б пропустив. Порожній рядок бібліотека приймає за локальну
  // теку й падає з `The input directory "" does not exist`. Той самий
  // ідіом уже застосований у grok.service.ts для GROK_MODEL.
  const packUrl = process.env.CHROMIUM_PACK_URL?.trim() || DEFAULT_CHROMIUM_PACK_URL;

  const precheck = await packUrlLooksLikeTar(packUrl);
  if (!precheck.ok) {
    return { kind: 'unavailable', diagnostic: `архів Chromium недоступний (${packUrl}): ${precheck.reason}` };
  }

  try {
    const mod: unknown = await import('@sparticuz/chromium-min');
    // Пакет CJS (`export = Chromium`), тож через await import() він
    // приїжджає то як сам об'єкт, то загорнутий у .default — залежно
    // від того, як TypeScript скомпілював цей файл. Беремо обидва
    // варіанти, щоб не залежати від налаштувань компіляції.
    const chromium = ((mod as { default?: unknown }).default ?? mod) as typeof import('@sparticuz/chromium-min');

    const executablePath = await withTimeout(
      chromium.executablePath(packUrl),
      CHROMIUM_DOWNLOAD_TIMEOUT_MS,
      `завантаження Chromium не вклалось у ${Math.round(CHROMIUM_DOWNLOAD_TIMEOUT_MS / 1000)}с`,
    );

    // Бібліотека вважає бінарник готовим за самою наявністю файлу, без
    // перевірки розміру, а розпаковує його потоком — тобто обірване
    // розпакування (таймаут вище, вичерпаний maxDuration функції,
    // паралельний виклик) лишає в /tmp коротший файл, який виглядає
    // «готовим» для ВСІХ наступних викликів на цьому інстансі. Такий
    // файл прибираємо самі: наступний виклик почне з чистого місця,
    // замість того щоб вічно запускати обрізаний ELF.
    const size = await fileSizeOrZero(executablePath);
    if (size < MIN_CHROMIUM_BINARY_BYTES) {
      await removeQuietly(executablePath);
      return {
        kind: 'unavailable',
        diagnostic: `розпакований Chromium неповний (${Math.round(size / 1e6)} МБ замість ~178 МБ) — файл видалено, наступна спроба почне заново`,
      };
    }

    return {
      kind: 'ready',
      executablePath,
      // `--js-flags=--max-old-space-size=256` тут свідомо НЕ додається,
      // хоча в Docker-гілці він є. Причина: chromium.args містить
      // `--single-process` (обов'язковий для Lambda), а в одному
      // процесі цей ліміт V8 накривається вже не на службовий код
      // браузера, а на JavaScript САМОЇ СТОРІНКИ. Сторінки-челленджі
      // Cloudflare/Incapsula — рівно ті, заради яких браузер і
      // піднімається, — важкі за JS, і 256 МБ роняли б їх у Page
      // crashed на найпотрібнішому місці.
      args: [...chromium.args],
      headless: chromium.headless,
      source: '@sparticuz/chromium-min (serverless)',
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await removeIfTruncated(EXTRACTED_CHROMIUM_PATH);
    return { kind: 'unavailable', diagnostic: `headless-браузер недоступний: ${message}` };
  }
}

// Перевірка ПЕРЕД тим, як віддати URL бібліотеці — і це не педантизм.
//
// @sparticuz/chromium-min качає архів так: `https.get(url, res =>
// res.pipe(tarExtract))`. Ні перевірки res.statusCode, ні обробника
// 'error' на потоці розпакування там немає. Якщо за URL приїде не tar
// (сторінка 403/404 від GitHub, ліміт на завантаження релізів,
// captive-portal, просто одрук у CHROMIUM_PACK_URL), tar-fs кидає
// 'Invalid tar header' ПОДІЄЮ на потоці без слухача — а це не
// відхилений проміс, який ловиться нашим try/catch, а НЕОБРОБЛЕНИЙ
// ВИНЯТОК: падає весь процес функції. Замість акуратної 400
// користувач отримує 500, теплий інстанс помирає, а запущений із крону
// CronJobRun назавжди лишається в статусі RUNNING без errorMessage —
// рівно той симптом, який у цьому файлі вже колись розслідували.
//
// Тому спершу читаємо перші 512 байт (Range-запит, не всі 65 МБ) і
// звіряємо магію ustar на зміщенні 257 — так виглядає заголовок
// будь-якого tar. Це не гарантія цілісності всього архіву, але воно
// прибирає весь клас реальних причин, а не гадає про них.
async function packUrlLooksLikeTar(packUrl: string): Promise<{ ok: boolean; reason: string }> {
  try {
    const res = await fetchWithRetry(packUrl, { retries: 1, timeoutMs: 15_000, headers: { Range: 'bytes=0-511' } });
    if (!res.ok) return { ok: false, reason: `HTTP ${res.status}` };
    const head = Buffer.from(await res.arrayBuffer());
    if (head.length < 262) return { ok: false, reason: `у відповіді лише ${head.length} байт` };
    const magic = head.subarray(257, 262).toString('latin1');
    if (magic !== 'ustar') {
      return { ok: false, reason: `це не tar-архів (замість магії "ustar" — ${JSON.stringify(magic)})` };
    }
    return { ok: true, reason: 'OK' };
  } catch (err) {
    return { ok: false, reason: err instanceof Error ? err.message : String(err) };
  }
}

async function fileSizeOrZero(path: string): Promise<number> {
  try {
    const { stat } = await import('node:fs/promises');
    return (await stat(path)).size;
  } catch {
    return 0;
  }
}

async function removeQuietly(path: string): Promise<void> {
  try {
    const { rm } = await import('node:fs/promises');
    await rm(path, { force: true });
  } catch {
    /* прибирання — best effort, помилка тут не має підміняти справжню причину */
  }
}

async function removeIfTruncated(path: string): Promise<void> {
  const size = await fileSizeOrZero(path);
  if (size > 0 && size < MIN_CHROMIUM_BINARY_BYTES) await removeQuietly(path);
}

function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
  let timer: NodeJS.Timeout;
  return Promise.race([
    promise,
    new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error(message)), ms);
    }),
  ]).finally(() => clearTimeout(timer)) as Promise<T>;
}

async function fetchOgImageWithBrowser(pageUrl: string): Promise<{ imageUrl: string | null; diagnostic: string }> {
  const plan = await resolveBrowserLaunchPlan();
  if (plan.kind === 'unavailable') {
    return { imageUrl: null, diagnostic: plan.diagnostic };
  }

  let browser: import('puppeteer-core').Browser | undefined;
  try {
    const puppeteer = await import('puppeteer-core');
    browser = await puppeteer.launch({
      executablePath: plan.executablePath,
      headless: plan.headless,
      args: plan.args,
    });

    const page = await browser.newPage();
    await page.setUserAgent(BROWSER_HEADERS['User-Agent']);
    await page.setExtraHTTPHeaders({ 'Accept-Language': BROWSER_HEADERS['Accept-Language'] });

    // Явний загальний timeout на ВЕСЬ виклик (не лише page.goto()) —
    // деякі SPA-сайти ніколи не досягають networkidle2 (постійні
    // фонові запити), page.goto() міг би провисіти майже весь свій
    // внутрішній timeout щоразу. Promise.race гарантує, що зависла
    // сторінка не тримає ресурси (і сам Chromium-процес) необмежено
    // довго — принаймні ЦЕЙ клас проблеми більше не накопичується
    // між послідовними кандидатами в циклі.
    // Через withTimeout, а не через власний Promise.race із голим
    // setTimeout: той лишав озброєний таймер на кожен виклик, бо ніхто
    // не робив clearTimeout.
    await withTimeout(
      page.goto(pageUrl, { waitUntil: 'networkidle2', timeout: 20_000 }),
      25_000,
      'Загальний timeout headless-браузера (25с)',
    );
    await new Promise((resolve) => setTimeout(resolve, 2_000));

    const html = await page.content();
    const raw = extractImageFromHtml(html);
    if (!raw) {
      return { imageUrl: null, diagnostic: `headless (${plan.source}): HTML ${html.length}б отримано, жоден із селекторів не спрацював (можливо, челлендж не пройдено навіть так)` };
    }

    try {
      return { imageUrl: new URL(raw, pageUrl).toString(), diagnostic: 'OK (через headless-браузер)' };
    } catch {
      return raw.startsWith('http')
        ? { imageUrl: raw, diagnostic: 'OK (через headless-браузер, без резолву)' }
        : { imageUrl: null, diagnostic: `headless: знайдено "${raw}", але не вдалося перетворити на абсолютний URL` };
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    // Найчастіша причина падіння саме на Vercel — брак пам'яті
    // функції: Chromium просить від ~512 МБ, а дефолт у Vercel 1024 МБ
    // ділиться ще й з Nest та Prisma. Тому підказка йде прямо в
    // діагностику, а не лишається знанням автора коду.
    return {
      imageUrl: null,
      diagnostic: `headless-браузер (${plan.source}) провалився: ${message}${/spawn|ENOENT|killed|out of memory|SIGKILL/i.test(message) ? ' — схоже на брак пам\'яті або відсутній бінарник; перевірте ліміт пам\'яті функції на Vercel' : ''}`,
    };
  } finally {
    await browser?.close().catch(() => undefined);
  }
}

function extractImageFromHtml(html: string): string | null {
  const patterns = [
    /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i,
    /<meta[^>]+property=["']og:image:secure_url["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+name=["']twitter:image:src["'][^>]+content=["']([^"']+)["']/i,
    /<link[^>]+rel=["']image_src["'][^>]+href=["']([^"']+)["']/i,
    /<meta[^>]+itemprop=["']image["'][^>]+content=["']([^"']+)["']/i,
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match) return match[1];
  }

  const jsonLdBlocks = html.match(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi) ?? [];
  for (const block of jsonLdBlocks) {
    const inner = block.replace(/<script[^>]*>|<\/script>/gi, '');
    try {
      const data = JSON.parse(inner) as Record<string, unknown>;
      const image = data.image;
      if (typeof image === 'string') return image;
      if (Array.isArray(image) && typeof image[0] === 'string') return image[0];
      if (image && typeof image === 'object' && 'url' in image && typeof (image as { url: unknown }).url === 'string') {
        return (image as { url: string }).url;
      }
    } catch {
      continue;
    }
  }

  // За прямим запитом користувача ("доработай поиск иллюстраций") —
  // знайдено реальний пробіл: державні сайти (mev.gov.ua тощо) часто
  // взагалі НЕ задають og:image/twitter:image мета-теги (не
  // турбуються про SEO/соцмережі), хоча РЕАЛЬНА, доречна ілюстрація
  // на сторінці є — просто звичайний <img> у тілі контенту (banner/
  // інфографіка), не в метаданих. Резервний рівень — перший
  // ПРАВДОПОДІБНИЙ <img>, з фільтрацією явних іконок/логотипів (за
  // назвою файлу — logo/icon/favicon/sprite, або за явно заданими
  // малими розмірами в атрибутах width/height — типово для
  // логотипів-мультибрендів на кшталт "Приватбанк/Ощадбанк/..." зі
  // скріншоту, не для banner-зображення самої програми).
  const imgTags = html.match(/<img\b[^>]*>/gi) ?? [];
  for (const tag of imgTags) {
    const srcMatch = tag.match(/\bsrc=["']([^"']+)["']/i);
    if (!srcMatch) continue;
    const src = srcMatch[1];

    if (/logo|icon|favicon|sprite|avatar/i.test(src)) continue;

    const widthMatch = tag.match(/\bwidth=["']?(\d+)/i);
    const heightMatch = tag.match(/\bheight=["']?(\d+)/i);
    const width = widthMatch ? Number(widthMatch[1]) : undefined;
    const height = heightMatch ? Number(heightMatch[1]) : undefined;
    if ((width && width < 100) || (height && height < 100)) continue;

    if (src.startsWith('data:')) continue; // inline base64 — не справжнє зображення для завантаження

    return src;
  }

  return null;
}
