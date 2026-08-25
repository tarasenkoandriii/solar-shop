import * as cheerio from 'cheerio';
import { extractCardImage, resolveImageUrl, fetchCategoryPageHtml, extractPageCategoryLabel } from './scrape-utils';
import type { ISourceAdapter, RawListing } from '../adapter.interface';

// vencon.ua — приоритет №4 по ТЗ п.12 (шире по номенклатуре, 470+ позиций
// только по панелям на момент проверки).
//
// ⚠️ Как и в остальных адаптерах — структура (кастомная платформа,
// категории /ua/catalog/{slug}, товар /ua/products/{slug}, пагинация
// ?page=N, явный текстовый статус "В наявності"/"Закінчується", "Код: NNNNNN"
// как SKU) подтверждена web_search+web_fetch на этапе написания кода,
// CSS-классы не протестированы против живого DOM.
export class VenconAdapter implements ISourceAdapter {
  readonly vendorName = 'vencon.ua';

  private readonly categoryUrls: Record<'SOLAR_PANEL' | 'BATTERY' | 'CONTROLLER', string> = {
    SOLAR_PANEL: 'https://vencon.ua/ua/catalog/solnechnye-paneli',
    BATTERY: 'https://vencon.ua/ua/catalog/akkumulyatornye-batarei',
    CONTROLLER: 'https://vencon.ua/ua/catalog/kontrollery-zaryada',
  };

  async fetchListings(deadlineAt: number): Promise<{ listings: RawListing[]; isComplete: boolean }> {
    const results: RawListing[] = [];
    for (const [category, url] of Object.entries(this.categoryUrls)) {
      if (Date.now() >= deadlineAt) return { listings: results, isComplete: false };
      const { listings, isComplete } = await this.fetchCategory(url, category, deadlineAt);
      results.push(...listings);
      if (!isComplete) return { listings: results, isComplete: false };
    }
    return { listings: results, isComplete: true };
  }

  private async fetchCategory(baseUrl: string, rawCategory: string, deadlineAt: number, maxPages = 10): Promise<{ listings: RawListing[]; isComplete: boolean }> {
    const listings: RawListing[] = [];
    let siteCategoryLabel: string | null = null;

    for (let page = 1; page <= maxPages; page++) {
      // За прямим запитом користувача — "добавить тайм менеджмент"
      // (той самий підхід, що вже sunshop.adapter.ts).
      if (Date.now() >= deadlineAt) return { listings, isComplete: false };

      const url = page === 1 ? baseUrl : `${baseUrl}?page=${page}`;
      const { html, httpOk } = await fetchCategoryPageHtml(url);
      if (!httpOk) break;

      const $ = cheerio.load(html);
      if (page === 1) siteCategoryLabel = extractPageCategoryLabel($);

      const products = $('[class*="product-card"], [class*="catalog-item"]');
      if (products.length === 0) break;

      products.each((_, el) => {
        const $el = $(el);
        const link = $el.find('a[href*="/products/"]').first();
        const sourceUrl = link.attr('href') ?? '';
        const rawTitle = link.text().trim() || link.attr('title')?.trim() || '';
        const priceText = $el.find('[class*="price"]').first().text();
        const rawPrice = parsePrice(priceText);
        const bodyText = $el.text();
        const skuText = bodyText.match(/Код:\s*(\d+)/)?.[1];
        // "Закінчується" — товар ещё в наличии, но заканчивается (не outOfStock).
        // "Немає в наявності" — явно нет в наличии.
        const outOfStock = /немає в наявності/i.test(bodyText);
        const image = resolveImageUrl(extractCardImage($el), url);

        if (!rawTitle || !sourceUrl || rawPrice === null) return;

        listings.push({
          sourceUrl: sourceUrl.startsWith('http') ? sourceUrl : `https://vencon.ua${sourceUrl}`,
          sourceSku: skuText,
          rawTitle,
          rawCategory,
          siteCategoryLabel: siteCategoryLabel ?? undefined,
          rawPrice,
          rawCurrency: 'UAH',
          inStock: !outOfStock,
          images: image ? [image] : [],
        });
      });

      if (products.length < 20) break;
    }

    return { listings, isComplete: true };
  }
}

function parsePrice(text: string): number | null {
  const cleaned = text.replace(/[^\d]/g, '');
  if (!cleaned) return null;
  return Number(cleaned);
}
