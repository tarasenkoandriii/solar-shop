import * as cheerio from 'cheerio';
import type { AnyNode } from 'domhandler';
import { createHash } from 'crypto';
import { fetchWithRetry } from '../../common/fetch-with-retry';

// За прямим запитом користувача ("проверь способ извлечения картинок и
// добавь опционально обход защиты js рендерингом... у нас есть и много
// вариантов прямого извлечения") — спільний модуль для всіх 4 адаптерів
// (раніше кожен дублював однаковий слабкий патерн `src ?? data-src`, без
// браузероподібних заголовків, без резолву відносних шляхів, без жодної
// детекції JS-рендерингу). Той самий підхід, що вже перевірений і
// підтверджений на реальному прогоні для financing.service.ts —
// розширений набір селекторів + headless-браузер (puppeteer-core,
// системний Chromium через apk, apps/api/Dockerfile) ЛИШЕ як fallback,
// коли легкий fetch не дав результату.

const BROWSER_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'uk-UA,uk;q=0.9,ru;q=0.8,en;q=0.7',
};

// Розширений набір селекторів для картинки товару в карточці категорії —
// набагато більше за попередній `src ?? data-src`. Порядок — від
// найнадійнішого до найменш надійного:
// - src / data-src — уже було
// - data-lazy-src — поширений патерн lazy-load плагінів WordPress/
//   WooCommerce (той самий движок, що вже підтверджений для sunshop.com.ua)
// - data-original — поширена бібліотека lazy-load (lazysizes та подібні)
// - srcset / data-srcset — беремо URL з першого дескриптора
// - style="background-image: url(...)" — деякі теми рендерять фото як фон
//   div, не <img>
// - <noscript><img src="..."></noscript> — іронічно: деякі lazy-load
//   реалізації самі кладуть справжній URL у noscript-фолбек саме для
//   випадків, коли JS не виконався (боти, наш fetch()) — тобто працює
//   БЕЗ headless-браузера навіть на JS-lazy-load сайтах.
// AnyNode — реальний тип вузла cheerio (з пакета domhandler, cheerio його
// не реекспортує напряму з top-level index, перевірено через пошук у
// node_modules, не здогад) — узгоджено з тим, що фактично повертає
// `$(el)` у кожному адаптері нижче.
export function extractCardImage($el: cheerio.Cheerio<AnyNode>): string | null {
  const img = $el.find('img').first();

  // Знайдено ПРЯМИМ тестуванням (node -e, не логікою на око) — реальний
  // баг у першій версії: `img.attr('src') || img.attr('data-src') ||
  // ...` зупинявся на ПЕРШОМУ truthy значенні (напр. `src="data:..."`
  // — валідний непорожній рядок, хоч і плейсхолдер) і НІКОЛИ не
  // перевіряв data-src далі, навіть попри те, що фільтр на data: URI
  // застосовувався вже ПІСЛЯ вибору. Виправлено — кожен кандидат
  // перевіряється ОКРЕМО (isUsableImageValue), перший придатний
  // перемагає, не перший непорожній.
  const candidates = [img.attr('src'), img.attr('data-src'), img.attr('data-lazy-src'), img.attr('data-original')];
  for (const candidate of candidates) {
    if (isUsableImageValue(candidate)) return candidate as string;
  }

  const srcset = img.attr('srcset') || img.attr('data-srcset');
  if (srcset) {
    const firstUrl = srcset.split(',')[0]?.trim().split(/\s+/)[0];
    if (isUsableImageValue(firstUrl)) return firstUrl as string;
  }

  const styleAttr = $el.find('[style*="background-image"]').first().attr('style');
  const bgMatch = styleAttr?.match(/background-image:\s*url\(['"]?([^'")]+)['"]?\)/i);
  if (bgMatch && isUsableImageValue(bgMatch[1])) return bgMatch[1];

  const noscriptHtml = $el.find('noscript').first().html();
  if (noscriptHtml) {
    const noscriptImgMatch = noscriptHtml.match(/<img[^>]+src=["']([^"']+)["']/i);
    if (noscriptImgMatch && isUsableImageValue(noscriptImgMatch[1])) return noscriptImgMatch[1];
  }

  return null;
}

// data: URI — інлайн-плейсхолдер lazy-load, не справжня картинка. Плюс
// легка евристика на типові імена файлів-заглушок (placeholder/blank/
// loading/spinner/1x1/transparent) — знайдено тестуванням: значення на
// кшталт "placeholder.gif" технічно проходить перевірку "не data: URI",
// але це теж не реальне фото товару.
function isUsableImageValue(value: string | undefined): boolean {
  if (!value) return false;
  if (value.startsWith('data:')) return false;
  if (/placeholder|blank|loading|spinner|1x1|transparent/i.test(value)) return false;
  return true;
}

// Резолв відносних шляхів у абсолютні — той самий підхід, що вже
// застосований для og:image (financing.service.ts). Без цього
// `/wp-content/uploads/foo.jpg` вказував би на наш власний домен, не на
// сайт-джерело.
export function resolveImageUrl(raw: string | null, pageUrl: string): string | null {
  if (!raw) return null;
  try {
    return new URL(raw, pageUrl).toString();
  } catch {
    return raw.startsWith('http') ? raw : null;
  }
}

// Типові ознаки того, що сторінці потрібен JS для рендерингу вмісту —
// той самий принцип, що й JS-челлендж-детекція у financing.service.ts
// (Incapsula/Cloudflare/Akamai), розширений під SPA-фреймворки, які
// САМІ по собі не бот-захист, але дають той самий практичний результат
// (fetch() бачить порожній HTML-каркас, весь вміст рендериться клієнтським
// JS вже в браузері).
function looksLikeNeedsJsRendering(html: string): boolean {
  const botProtectionMarkers = /checking your browser|cf-browser-verification|challenge-platform|__cf_chl_|_incapsula_|incapsula/i;
  const spaRootMarkers = /<div id=["'](root|app|__next)["'][^>]*>\s*<\/div>|data-reactroot=""/i;
  return botProtectionMarkers.test(html) || (spaRootMarkers.test(html) && html.length < 20_000);
}

// Головна точка входу для адаптерів — замінює прямий fetchWithRetry+
// res.text(). Двоетапно: спочатку легкий fetch із браузероподібними
// заголовками (швидко, дешево, працює для більшості WooCommerce/
// CS-Cart/OpenCart сайтів). Якщо явно схоже, що потрібен JS-рендеринг —
// ЛИШЕ ТОДІ ескалація до headless-браузера. Опційний фолбек (за прямим
// запитом користувача — "добавь опционально") — керується параметром
// allowHeadlessFallback, дефолт true.
export async function fetchCategoryPageHtml(
  url: string,
  options: { allowHeadlessFallback?: boolean } = {},
): Promise<{ html: string; viaHeadless: boolean; httpOk: boolean }> {
  const { allowHeadlessFallback = true } = options;

  const res = await fetchWithRetry(url, { retries: 2, timeoutMs: 15_000, headers: BROWSER_HEADERS });
  if (!res.ok) return { html: '', viaHeadless: false, httpOk: false };

  const html = await res.text();
  if (!allowHeadlessFallback || !looksLikeNeedsJsRendering(html)) {
    return { html, viaHeadless: false, httpOk: true };
  }

  const rendered = await fetchViaHeadlessBrowser(url);
  if (rendered) return { html: rendered, viaHeadless: true, httpOk: true };

  // Headless недоступний/провалився — повертаємо те, що є (легкий HTML),
  // адаптер сам побачить products.length === 0 і коректно зупиниться, не
  // впаде.
  return { html, viaHeadless: false, httpOk: true };
}

// Той самий підхід, що вже перевірений на реальному прогоні для
// financing.service.ts.fetchOgImageWithBrowser() — puppeteer-core +
// системний Chromium (apk, не npm-завантажений бінарник), м'який
// фолбек, якщо PUPPETEER_EXECUTABLE_PATH не заданий (локальна розробка
// поза Docker).
async function fetchViaHeadlessBrowser(url: string): Promise<string | null> {
  const executablePath = process.env.PUPPETEER_EXECUTABLE_PATH;
  if (!executablePath) {
    console.log(`[scrape-utils] ${url}: схоже, потрібен JS-рендеринг, але PUPPETEER_EXECUTABLE_PATH не задано — пропускаю headless-фолбек.`);
    return null;
  }

  let browser: import('puppeteer-core').Browser | undefined;
  try {
    console.log(`[scrape-utils] ${url}: схоже, потрібен JS-рендеринг — пробую headless-браузер...`);
    const puppeteer = await import('puppeteer-core');
    browser = await puppeteer.launch({
      executablePath,
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
    });
    const page = await browser.newPage();
    await page.setUserAgent(BROWSER_HEADERS['User-Agent']);
    await page.setExtraHTTPHeaders({ 'Accept-Language': BROWSER_HEADERS['Accept-Language'] });
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 20_000 });
    await new Promise((resolve) => setTimeout(resolve, 1_500)); // невелика пауза на довиконання клієнтського рендерингу
    const html = await page.content();
    console.log(`[scrape-utils] ${url}: headless-браузер віддав ${html.length}б HTML.`);
    return html;
  } catch (err) {
    console.log(`[scrape-utils] ${url}: headless-браузер провалився: ${err instanceof Error ? err.message : String(err)}`);
    return null;
  } finally {
    await browser?.close().catch(() => undefined);
  }
}

// За прямим запитом користувача ("сохранять сырые категории с сайтов и
// матчить с существующими") — витягує текстову мітку категорії, як її
// показує сама сторінка (H1 або breadcrumb) — ОКРЕМО від внутрішнього
// ключа категорії, який ми свідомо шукаємо (categoryUrls у кожному
// адаптері). Розбіжність між цим і очікуваною назвою — сигнал для
// модерації (розділ README), не сама категорія товару.
export function extractPageCategoryLabel($: cheerio.CheerioAPI): string | null {
  const h1 = $('h1').first().text().trim();
  if (h1) return h1;

  const breadcrumbLast = $('.breadcrumb li, .breadcrumbs li, [class*="breadcrumb"] a').last().text().trim();
  if (breadcrumbLast) return breadcrumbLast;

  return null;
}

// За прямим запитом користувача — "добавить парсер отзывов на товары
// отдельно скриптом для каждого магазина". Спільні утиліти для всіх 4
// review-адаптерів — та сама причина, що вже для картинок вище (не
// дублювати однакову логіку в кожному файлі).

// Нормалізація сирої оцінки джерела (напр. 1-5 для WooCommerce) до
// тієї самої 1-10 шкали, що вже ProductReview (verified purchase) —
// щоб обидва типи відгуків відображались консистентно поряд. Проста
// лінійна інтерполяція: 1→1, max→10.
export function normalizeRating(raw: number, scaleMax: number): number {
  if (scaleMax <= 1) return Math.round(raw);
  const normalized = 1 + ((raw - 1) * 9) / (scaleMax - 1);
  return Math.max(1, Math.min(10, Math.round(normalized)));
}

// Дедуплікація МІЖ повторними прогонами парсера — сайти джерела
// зазвичай НЕ дають стабільний externalId відгуку в HTML. Хеш від
// нормалізованого (обрізаного пробілів, нижнього регістру) тексту +
// автора — природний ключ вмісту, той самий принцип, що вже
// titleSimilarity() для дублікатів програм кредитування (розділ
// README), тут простіше — точний збіг вмісту, не fuzzy-схожість.
export function hashReviewContent(authorName: string | undefined, reviewText: string): string {
  const normalized = `${(authorName ?? '').trim().toLowerCase()}|${reviewText.trim().toLowerCase().replace(/\s+/g, ' ')}`;
  return createHash('sha256').update(normalized).digest('hex');
}
