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

    const candidates = extractImageCandidates(html);
    if (candidates.length === 0) {
      return { imageUrl: null, diagnostic: `HTML ${html.length}б отримано, жоден із селекторів не спрацював`, needsHeadlessBrowser: false };
    }

    const picked = await firstUsableImage(candidates, pageUrl);
    // Якщо кандидати були, але всі биті — це вже не привід піднімати
    // браузер: розмітку ми прочитали успішно, проблема в самих файлах.
    return { imageUrl: picked.imageUrl, diagnostic: picked.diagnostic, needsHeadlessBrowser: false };
  } catch (err) {
    // АУДИТ 30.08.2026 — реальна скарга з проду: 5-7-9.gov.ua віддавав
    // рівно `запит провалився: fetch failed` і на цьому все закінчувалось.
    //
    // Дві окремі помилки в трьох рядках.
    //
    // 1. `fetch failed` — це ГЕНЕРИЧНА обгортка undici; справжня причина
    //    (ECONNRESET, EPROTO, помилка сертифіката, таймаут) лежить у
    //    err.cause, і саме вона тут викидалась. Повідомлення було
    //    марним: за ним неможливо ні зрозуміти, ні полагодити.
    // 2. needsHeadlessBrowser: false — тобто на збої РІВНЯ З'ЄДНАННЯ ми
    //    браузер не пробували взагалі. А це рівно той клас випадків,
    //    де справжній браузер має шанс: інший TLS-стек, інший набір
    //    шифрів, ALPN/HTTP2, поблажливіше ставлення до неповного
    //    ланцюга сертифікатів. Українські урядові й банківські сайти —
    //    типові носії саме таких конфігурацій. Порівняйте: bdf.gov.ua у
    //    тому ж прогоні картинку віддав, тобто gov.ua як такий не
    //    заблокований.
    //
    // Не ескалюємо лише там, де браузер точно не допоможе: не
    // резолвиться ім'я (браузер піде до того самого DNS).
    const detail = describeFetchError(err);
    const hopelessDns = /ENOTFOUND|EAI_AGAIN/i.test(detail);
    return {
      imageUrl: null,
      diagnostic: `запит провалився: ${detail}`,
      needsHeadlessBrowser: !hopelessDns,
    };
  }
}

// undici ховає справжню причину у ланцюжку `cause`, іноді на два рівні
// вглиб (`fetch failed` → `AggregateError` → `Error: certificate has
// expired`). Розгортаємо весь ланцюг, а не лише верхнє повідомлення.
function describeFetchError(err: unknown): string {
  const parts: string[] = [];
  let current: unknown = err;
  for (let depth = 0; depth < 4 && current; depth++) {
    if (current instanceof Error) {
      const code = (current as NodeJS.ErrnoException).code;
      parts.push(code ? `${current.message} (${code})` : current.message);
      // AggregateError (напр. коли перебираються всі адреси хоста)
      // тримає окремі причини в `errors`, не в `cause`.
      const aggregated = (current as AggregateError).errors;
      if (Array.isArray(aggregated) && aggregated.length > 0) {
        current = aggregated[0];
        continue;
      }
      current = (current as { cause?: unknown }).cause;
    } else {
      parts.push(String(current));
      break;
    }
  }
  // Дедуплікація: undici нерідко повторює той самий текст на двох рівнях.
  return [...new Set(parts)].join(' ← ') || 'невідома помилка';
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

  // ПІДКАЗКА ПРО РАНТАЙМ — те, без чого весь цей код не працює на
  // Vercel. Перший деплой упав саме тут:
  //
  //   /tmp/chromium: error while loading shared libraries: libnss3.so
  //
  // Chromium тягне за собою власні системні бібліотеки (libnss3,
  // libexpat, libnssutil3 — усього 9 файлів), і вони лежать в архіві
  // окремо: al2.tar.br для Amazon Linux 2, al2023.tar.br для AL2023.
  // Але розпаковує їх бібліотека ЛИШЕ якщо вважає, що працює в AWS
  // Lambda, а перевіряє вона це по AWS_EXECUTION_ENV /
  // AWS_LAMBDA_JS_RUNTIME (helper.js: isRunningInAwsLambda). Vercel не
  // виставляє ЖОДНОЇ з них — хоча під капотом це та сама Lambda. Тому
  // бінарник розпаковувався, а бібліотеки до нього — ні, і LD_LIBRARY_PATH
  // лишався порожнім.
  //
  // Ставимо підказку самі. AWS_LAMBDA_JS_RUNTIME — рівно той варіант,
  // який бібліотека передбачає для не-AWS майданчиків (у коментарі
  // helper.js: "is for netlify instances"), тож це підтримуваний шлях,
  // а не обхід. Вибір гілки — за версією Node: 20 і новіші рантайми
  // Vercel зібрані на AL2023, 18-й — на AL2. Якщо ми справді в Lambda
  // й змінна вже є, НЕ чіпаємо її.
  //
  // Виставити треба ДО import: модуль читає ці змінні у своєму тілі, на
  // етапі завантаження, і саме там формує LD_LIBRARY_PATH.
  if (!process.env.AWS_EXECUTION_ENV && !process.env.AWS_LAMBDA_JS_RUNTIME) {
    const nodeMajor = Number(process.versions.node.split('.')[0]);
    process.env.AWS_LAMBDA_JS_RUNTIME = nodeMajor >= 20 ? 'nodejs20.x' : 'nodejs18.x';
  }
  const expectedLibDir = process.env.AWS_LAMBDA_JS_RUNTIME?.includes('20.x') ? '/tmp/al2023/lib' : '/tmp/al2/lib';

  // Якщо архів уже розпакований на цьому інстансі — беремо теку, а не
  // URL: інакше кожна повторна спроба качала б 65 МБ заново. Заразом це
  // єдиний шлях полагодити інстанс, на якому /tmp/chromium лишився від
  // попереднього (зламаного) деплою.
  const packDir = '/tmp/chromium-pack';
  const haveLocalPack = (await fileSizeOrZero(`${packDir}/chromium.br`)) > 0;

  if (!haveLocalPack) {
    const precheck = await packUrlLooksLikeTar(packUrl);
    if (!precheck.ok) {
      return { kind: 'unavailable', diagnostic: `архів Chromium недоступний (${packUrl}): ${precheck.reason}` };
    }
  }

  try {
    const mod: unknown = await import('@sparticuz/chromium-min');
    // Пакет CJS (`export = Chromium`), тож через await import() він
    // приїжджає то як сам об'єкт, то загорнутий у .default — залежно
    // від того, як TypeScript скомпілював цей файл. Беремо обидва
    // варіанти, щоб не залежати від налаштувань компіляції.
    const chromium = ((mod as { default?: unknown }).default ?? mod) as typeof import('@sparticuz/chromium-min');

    let executablePath = await withTimeout(
      chromium.executablePath(haveLocalPack ? packDir : packUrl),
      CHROMIUM_DOWNLOAD_TIMEOUT_MS,
      `завантаження Chromium не вклалось у ${Math.round(CHROMIUM_DOWNLOAD_TIMEOUT_MS / 1000)}с`,
    );

    // executablePath() повертає /tmp/chromium одразу, щойно ФАЙЛ існує,
    // не розпаковуючи більше нічого. На теплому інстансі, де бінарник
    // лишився від попереднього деплою (без бібліотек), це означало б
    // вічне `libnss3.so: cannot open shared object file`. Тому
    // перевіряємо бібліотеки окремо й, якщо їх немає, прибираємо
    // бінарник і просимо розпакувати все заново — цього разу вже з
    // виставленою підказкою про рантайм.
    if ((await fileSizeOrZero(`${expectedLibDir}/libnss3.so`)) === 0) {
      await removeQuietly(EXTRACTED_CHROMIUM_PATH);
      executablePath = await withTimeout(
        chromium.executablePath(haveLocalPack ? packDir : packUrl),
        CHROMIUM_DOWNLOAD_TIMEOUT_MS,
        `повторне розпакування Chromium не вклалось у ${Math.round(CHROMIUM_DOWNLOAD_TIMEOUT_MS / 1000)}с`,
      );
      if ((await fileSizeOrZero(`${expectedLibDir}/libnss3.so`)) === 0) {
        return {
          kind: 'unavailable',
          diagnostic: `системні бібліотеки Chromium не розпакувались у ${expectedLibDir} (очікувався libnss3.so) — без них браузер не стартує`,
        };
      }
    }

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
      source: `@sparticuz/chromium-min (serverless, ${expectedLibDir})`,
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
    const candidates = extractImageCandidates(html);
    if (candidates.length === 0) {
      return { imageUrl: null, diagnostic: `headless (${plan.source}): HTML ${html.length}б отримано, жоден із селекторів не спрацював (можливо, челлендж не пройдено навіть так)` };
    }

    const picked = await firstUsableImage(candidates, pageUrl);
    return {
      imageUrl: picked.imageUrl,
      diagnostic: picked.imageUrl ? `${picked.diagnostic} — через headless-браузер` : `headless: ${picked.diagnostic}`,
    };
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

function extractImageCandidates(html: string): string[] {
  const found: string[] = [];
  const add = (v: string | null | undefined) => {
    if (v && !found.includes(v)) found.push(v);
  };

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
    add(match?.[1]);
  }

  const jsonLdBlocks = html.match(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi) ?? [];
  for (const block of jsonLdBlocks) {
    const inner = block.replace(/<script[^>]*>|<\/script>/gi, '');
    try {
      const data = JSON.parse(inner) as Record<string, unknown>;
      const image = data.image;
      if (typeof image === 'string') add(image);
      else if (Array.isArray(image) && typeof image[0] === 'string') add(image[0]);
      else if (image && typeof image === 'object' && 'url' in image && typeof (image as { url: unknown }).url === 'string') {
        add((image as { url: string }).url);
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

    add(src);
    // Кількох великих картинок зі сторінки достатньо; далі вже пішли б
    // банери-сусіди, а кожен кандидат коштує окремої перевірки.
    if (found.length >= MAX_IMAGE_CANDIDATES) break;
  }

  return found.slice(0, MAX_IMAGE_CANDIDATES);
}

// АУДИТ 30.08.2026 — на картці Укргазбанку в адмінці стояла зламана
// картинка: URL знайшовся і зберігся, але не відкривався. Раніше
// брався ПЕРШИЙ-ЛІПШИЙ кандидат і зберігався без жодної перевірки —
// якщо він виявлявся битим, картка лишалась зі зламаним <img>, і
// повторний «Спарсити фото» щоразу знаходив той самий битий URL.
//
// Тепер кандидати збираються списком у порядку надійності
// (og:image → twitter:image → JSON-LD → перший великий <img>) і
// беремо ПЕРШИЙ, який реально відкривається.
const MAX_IMAGE_CANDIDATES = 4;

// Перевірка свідомо м'яка: відкидаємо лише те, що ТОЧНО зламане —
// мережева помилка, 404/410, або HTML замість картинки (типовий
// «м'який 404», коли сервер віддає сторінку помилки зі статусом 200).
// 403 НЕ відкидаємо: це часто захист від хотлінку по Referer, і в
// браузері користувача така картинка відкриється нормально. Краще
// зберегти сумнівний URL, ніж відкинути робочий.
async function imageUrlUsable(imageUrl: string): Promise<{ ok: boolean; reason: string }> {
  try {
    // Range 0-0 — качаємо один байт, а не весь файл: нам потрібні лише
    // статус і content-type.
    const res = await fetchWithRetry(imageUrl, {
      retries: 0,
      timeoutMs: 8_000,
      headers: { ...BROWSER_HEADERS, Range: 'bytes=0-0' },
    });
    if (res.status === 404 || res.status === 410) return { ok: false, reason: `HTTP ${res.status}` };
    const contentType = res.headers.get('content-type') ?? '';
    if (/^\s*text\//i.test(contentType)) return { ok: false, reason: `content-type ${contentType} — це сторінка, не картинка` };
    return { ok: true, reason: `HTTP ${res.status}${contentType ? `, ${contentType}` : ''}` };
  } catch (err) {
    return { ok: false, reason: describeFetchError(err) };
  }
}

// Перетворює кандидатів на абсолютні URL і повертає перший робочий.
async function firstUsableImage(
  candidates: string[],
  pageUrl: string,
): Promise<{ imageUrl: string | null; diagnostic: string }> {
  const rejected: string[] = [];
  for (const raw of candidates) {
    let absolute: string;
    try {
      absolute = new URL(raw, pageUrl).toString();
    } catch {
      if (!raw.startsWith('http')) {
        rejected.push(`"${raw}" — не вдалося перетворити на абсолютний URL`);
        continue;
      }
      absolute = raw;
    }
    const check = await imageUrlUsable(absolute);
    if (check.ok) return { imageUrl: absolute, diagnostic: `OK (${check.reason})` };
    rejected.push(`${absolute} — ${check.reason}`);
  }
  return {
    imageUrl: null,
    diagnostic: rejected.length > 0 ? `жоден кандидат не відкрився: ${rejected.join('; ')}` : 'кандидатів не знайдено',
  };
}
