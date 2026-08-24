import * as cheerio from 'cheerio';
import { extractCardImage, resolveImageUrl, fetchCategoryPageHtml, extractPageCategoryLabel } from './scrape-utils';
import type { ISourceAdapter, RawListing } from '../adapter.interface';

// sunshop.com.ua — приоритет №1 по ТЗ п.12 (узкоспециализированный, широкий
// ассортимент по всем 3 категориям, склады в 8 городах).
//
// ⚠️ ВАЖНО (см. AUDIT.md): структура страницы (URL категорий, пагинация
// /page/N/, формат заголовка товара, факт что это WooCommerce/WordPress)
// подтверждена реальным запросом через web_search + web_fetch на этапе
// написания кода. Но web_fetch в этой среде отдаёт markdown-конвертацию
// страницы, не сырой HTML — поэтому точные CSS-классы ниже (стандартные
// для тем WooCommerce: `.products .product`, `.woocommerce-loop-product__
// title`, `.price bdi`) НЕ протестированы против живого DOM (сетевой
// доступ из песочницы, где писался код, не включает sunshop.com.ua).
// Перед первым реальным прогоном парсера — проверить/скорректировать
// селекторы вручную (напр. через DevTools) и добавить hasSelector-проверку
// с алертом, если структура страницы изменилась (частая проблема HTML-
// скрейпинга, см. ТЗ п.13.4 про "адаптер стабильно падает").
export class SunshopAdapter implements ISourceAdapter {
  readonly vendorName = 'sunshop.com.ua';

  private readonly categoryUrls: Record<string, string> = {
    SOLAR_PANEL: 'https://sunshop.com.ua/uk/cat/solarpower-uk/solar-panels-uk/',
    BATTERY: 'https://sunshop.com.ua/uk/cat/autonomy-uk/batteries-uk/',
    CONTROLLER: 'https://sunshop.com.ua/uk/cat/energy-uk/controllers-uk/',
  };

  async fetchListings(): Promise<RawListing[]> {
    const results: RawListing[] = [];
    for (const [category, url] of Object.entries(this.categoryUrls)) {
      results.push(...(await this.fetchCategory(url, category)));
    }
    return results;
  }

  private async fetchCategory(baseUrl: string, rawCategory: string, maxPages = 10): Promise<RawListing[]> {
    const listings: RawListing[] = [];
    // За прямим запитом користувача ("сохранять сырые категории с
    // сайтов") — мітка категорії, як сама сторінка її показує (H1),
    // витягується ОДИН раз (сторінка 1) і застосовується до ВСІХ
    // товарів цієї категорії з цього вендора — сторінка категорії одна
    // на всю пагінацію, мітка не змінюється між сторінками.
    let siteCategoryLabel: string | null = null;

    for (let page = 1; page <= maxPages; page++) {
      const url = page === 1 ? baseUrl : `${baseUrl}page/${page}/`;
      // За прямим запитом користувача — розширений набір селекторів
      // картинки + опційний headless-фолбек для JS-рендерингу
      // (fetchCategoryPageHtml/extractCardImage — spared модуль
      // scrape-utils.ts, той самий підхід, що вже перевірений для
      // financing.service.ts).
      const { html, httpOk } = await fetchCategoryPageHtml(url);
      if (!httpOk) break;

      const $ = cheerio.load(html);
      if (page === 1) siteCategoryLabel = extractPageCategoryLabel($);

      const products = $('.products .product, ul.products li.product');
      if (products.length === 0) break; // последняя страница / структура изменилась

      products.each((_, el) => {
        const $el = $(el);
        const link = $el.find('a.woocommerce-loop-product__link, a.product_link').first();
        const sourceUrl = link.attr('href') ?? '';
        const rawTitle = $el.find('.woocommerce-loop-product__title, h2.woocommerce-loop-product__title').first().text().trim();
        const priceText = $el.find('.price bdi, .price .amount').first().text();
        const rawPrice = parsePrice(priceText);
        const outOfStock = $el.hasClass('outofstock') || $el.find('.out-of-stock, .outofstock').length > 0;
        const image = resolveImageUrl(extractCardImage($el), url);
        const productIdMatch = $el.find('a[href*="add-to-cart="]').attr('href')?.match(/add-to-cart=(\d+)/);

        if (!rawTitle || !sourceUrl || rawPrice === null) return; // пропускаем не распознанные блоки, не роняем весь прогон

        listings.push({
          sourceUrl,
          sourceSku: productIdMatch?.[1],
          rawTitle,
          rawCategory,
          siteCategoryLabel: siteCategoryLabel ?? undefined,
          rawPrice,
          rawCurrency: 'UAH',
          inStock: !outOfStock,
          images: image ? [image] : [],
        });
      });

      if (products.length < 40) break; // sunshop отдаёт по 40 на страницу — меньше значит конец списка
    }

    return listings;
  }
}

function parsePrice(text: string): number | null {
  const cleaned = text.replace(/[^\d]/g, '');
  if (!cleaned) return null;
  return Number(cleaned);
}
