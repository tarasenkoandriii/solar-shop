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

// Розбір ціни з тексту картки товару.
//
// Знайдено 25.08.2026 на реальному прогоні (vencon.ua/products/dyness-b4850):
// у всіх чотирьох адаптерів лежала та сама наївна копія —
//   text.replace(/[^\d]/g, '')  →  Number(cleaned)
// тобто з тексту вибиралися ВСІ цифри підряд і склеювались в одне число.
// Якщо селектор [class*="price"] зачепив блок із кількома цінами (або
// взагалі не картку товару — там трапився банер категорії), виходив
// багатозначний монстр, а на достатній довжині — просто Infinity, який
// потім летів у Prisma і валив запис.
//
// Тут: беремо ПЕРШУ послідовність, схожу на ціну, прибираємо роздільники
// тисяч (пробіл, нерозривний пробіл, апостроф, кома між трійками) і
// перевіряємо результат на осудність. Усе, що не проходить, — null:
// краще пропустити позицію, ніж записати вигадану ціну.
// Стеля осудної ціни в гривні. Найдорожча позиція цих чотирьох
// роздрібних магазинів — комерційний накопичувач — це сотні тисяч
// гривень, тож мільйони вже означають, що розбір щось склеїв.
// Порівняння НЕ строге: рівно 100_000_000 у доларовому полі
// (Decimal(10,2), максимум 99_999_999.99) дало б переповнення в БД.
const MAX_REASONABLE_PRICE = 100_000_000;

// Число з роздільниками тисяч і необов'язковою дробовою частиною.
// Групи по три цифри — саме те, що відрізняє "1 234 567" від двох
// окремих цін поруч.
// Роздільник тисяч у прайсах буває будь-який: пробіл (звичайний,
// нерозривний, вузький), апостроф, кома і крапка. Без коми й крапки в
// цьому списку "42,300 UAH" не збиралось у ціле число, і далі якірний
// пошук чіплявся за хвіст "300" — ціна падала в 141 раз.
const NUMBER = String.raw`\d{1,3}(?:[ \u00A0\u202F'’,.]\d{3})+(?:[.,]\d{1,2})?|\d+(?:[.,]\d{1,2})?`;

// Ціна, за якою ЙДЕ валюта. Це головний якір: у прайсах вона є завжди, а
// сторонні числа в тому ж блоці (знижка "-15%", "48В", "Гарантія 24 міс")
// валютою не супроводжуються.
const PRICE_WITH_CURRENCY = new RegExp(String.raw`(${NUMBER})\s*(?:₴|грн|UAH|\$|USD|€|EUR)`, 'gi');

// Одиниці виміру й відсотки — ознака, що число НЕ ціна.
// Довші одиниці стоять першими: інакше "Вт" з'їлося б правилом для "В".
// Замість \b — юнікодний lookahead: \b рахує межу слова лише по
// [A-Za-z0-9_], тож після кириличної "В" наприкінці рядка він не
// спрацьовував, і "48В" сходило за ціну 48.
const NON_PRICE_SUFFIX = /^\s*(?:%|Вт|W|Ач|Ah|шт|міс|мм|см|кг|В|V)(?![\p{L}])/iu;

function toNumber(token: string): number | null {
  // Дробова частина — рівно 1-2 цифри в кінці. Три цифри після
  // роздільника це тисячі: інакше "42,300" і "33.300" прочитались би як
  // 42.30 і 33.30, тобто ціна впала б у тисячу разів.
  const decimal = token.match(/[.,](\d{1,2})$/);
  const digits = (decimal ? token.slice(0, -decimal[0].length) : token).replace(/\D/g, '');
  if (!digits) return null;

  const value = Number(decimal ? `${digits}.${decimal[1]}` : digits);
  if (!Number.isFinite(value) || value <= 0 || value >= MAX_REASONABLE_PRICE) return null;
  return value;
}

// Розбір ціни з тексту картки товару.
//
// Знайдено 25.08.2026 на реальному прогоні (vencon.ua/products/dyness-b4850):
// у всіх чотирьох адаптерів лежала та сама наївна копія —
//   text.replace(/[^\d]/g, '')  →  Number(cleaned)
// тобто з блоку вибиралися ВСІ цифри підряд і склеювались в одне число.
// На достатній довжині виходив Infinity, який летів у Prisma і валив
// запис.
//
// Перша спроба виправлення була ГІРШОЮ за початковий баг, і це варто
// пам'ятати: вона брала першу-ліпшу групу цифр, тож із блоку
// "-15% 33 300 грн" діставала 15. Стара помилка давала величезні числа —
// вони помітні й падають на переповненні колонки. Нова давала КРИХІТНІ, а
// в pricing.ts мінімальна ціна виграє сортування (cachedCostPriceUsd =
// найдешевший листинг) — тобто товар тихо почав би продаватися по $0.36
// замість $800.
//
// Тому логіка тепер така:
//  1. Шукаємо числа, за якими стоїть ВАЛЮТА. У прайсі вона є завжди, а
//     "-15%", "48В", "Гарантія 24 міс" валютою не супроводжуються.
//  2. Якщо таких кілька (стара + нова ціна, опт, розстрочка) — беремо
//     НАЙМЕНШУ. Це ціна продажу при знижці; а головне — помилка тут
//     обмежена сусідньою реальною ціною того ж товару, а не відрізняється
//     на порядки.
//  3. Валюти в блоці немає — приймаємо ЄДИНЕ схоже на ціну число.
//     Кілька кандидатів без валюти неможливо розрізнити надійно, тож
//     краще null: пропустити позицію дешевше, ніж вигадати ціну.
export function parsePriceText(text: string): number | null {
  if (!text) return null;

  const withCurrency: number[] = [];
  for (const m of text.matchAll(PRICE_WITH_CURRENCY)) {
    const value = toNumber(m[1]!);
    if (value !== null) withCurrency.push(value);
  }
  if (withCurrency.length > 0) return Math.min(...withCurrency);

  // Фолбек: жодної валюти поруч. Збираємо кандидатів, відкидаючи все, за
  // чим стоїть одиниця виміру або відсоток.
  const candidates: number[] = [];
  for (const m of text.matchAll(new RegExp(NUMBER, 'g'))) {
    const rest = text.slice(m.index! + m[0].length);
    if (NON_PRICE_SUFFIX.test(rest)) continue;
    const value = toNumber(m[0]);
    if (value !== null) candidates.push(value);
  }
  // Рівно один кандидат — приймаємо. Інакше блок неоднозначний.
  return candidates.length === 1 ? candidates[0]! : null;
}
