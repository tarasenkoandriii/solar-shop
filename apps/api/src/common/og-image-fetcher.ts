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

async function fetchOgImageWithBrowser(pageUrl: string): Promise<{ imageUrl: string | null; diagnostic: string }> {
  const executablePath = process.env.PUPPETEER_EXECUTABLE_PATH;
  if (!executablePath) {
    return { imageUrl: null, diagnostic: 'PUPPETEER_EXECUTABLE_PATH не задано (headless-браузер доступний лише в Docker-образі) — пропускаю' };
  }

  let browser: import('puppeteer-core').Browser | undefined;
  try {
    const puppeteer = await import('puppeteer-core');
    browser = await puppeteer.launch({
      executablePath,
      headless: true,
      // За прямим запитом користувача ("повторюється іноді, без чіткої
      // закономірності") — нерегулярний 500 БЕЗ збереженого
      // errorMessage (розділ README) узгоджується з РЕАЛЬНИМ крахом
      // усього Node-процесу (не JS-винятком, який уже й так ловиться
      // тут через try/catch), напр. через OOM killer — docker-
      // compose.yml НЕ мав жодних явних лімітів пам'яті взагалі,
      // Chromium під навантаженням на "важких" урядових/банківських
      // сайтах міг тимчасово споживати сотні мегабайт. Не гадаю
      // причину вчетверте — замість цього економлять пам'ять прапорці,
      // загальновідомі для headless Chromium у контейнерах з
      // обмеженими ресурсами.
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--disable-extensions',
        '--disable-background-networking',
        '--disable-background-timer-throttling',
        '--disable-renderer-backgrounding',
        '--js-flags=--max-old-space-size=256',
      ],
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
    await Promise.race([
      page.goto(pageUrl, { waitUntil: 'networkidle2', timeout: 20_000 }),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Загальний timeout headless-браузера (25с)')), 25_000)),
    ]);
    await new Promise((resolve) => setTimeout(resolve, 2_000));

    const html = await page.content();
    const raw = extractImageFromHtml(html);
    if (!raw) {
      return { imageUrl: null, diagnostic: `headless: HTML ${html.length}б отримано, жоден із селекторів не спрацював (можливо, челлендж не пройдено навіть так)` };
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
    return { imageUrl: null, diagnostic: `headless-браузер провалився: ${message}` };
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
