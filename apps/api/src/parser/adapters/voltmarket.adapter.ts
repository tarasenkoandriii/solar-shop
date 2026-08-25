import * as cheerio from 'cheerio';
import { extractCardImage, resolveImageUrl, fetchCategoryPageHtml, extractPageCategoryLabel, parsePriceText } from './scrape-utils';
import type { ISourceAdapter, RawListing } from '../adapter.interface';

// voltmarket.ua — приоритет №3 по ТЗ п.12 (нишевый, хороший источник для
// контроллеров).
//
// ⚠️ Как и в остальных адаптерах — структура (OpenCart, категории вида
// /solnechnye-panel, /alternativnaya-energetika/solnechnye-kontrollery,
// пагинация ?page=N, "Код товара: NNNNN" как SKU) подтверждена
// web_search+web_fetch на этапе написания кода, CSS-классы не
// протестированы против живого DOM. OpenCart стандартно использует
// `.product-thumb`/`.product-layout` — заложены как лучшее приближение.
//
// ВАЖНЫЙ НЮАНС (не баг, особенность сайта): в спарсенной разметке
// наличие часто скрыто за отдельной ссылкой "Уточнить наличие" вместо
// простого текстового статуса — это может означать, что реальный статус
// наличия подгружается через AJAX/JS и не присутствует в статичном HTML,
// который получает fetch(). Пока трактуем presence карточки в выдаче
// категории как inStock: true (сайт обычно не показывает товары "нет в
// наличии" в общем листинге вовсе) — стоит перепроверить на живом сайте
// перед первым реальным прогоном.
export class VoltmarketAdapter implements ISourceAdapter {
  readonly vendorName = 'voltmarket.ua';

  private readonly categoryUrls: Record<'SOLAR_PANEL' | 'BATTERY' | 'CONTROLLER', string> = {
    SOLAR_PANEL: 'https://voltmarket.ua/solnechnye-panel',
    BATTERY: 'https://voltmarket.ua/litievye-akkumulyatory',
    CONTROLLER: 'https://voltmarket.ua/alternativnaya-energetika/solnechnye-kontrollery',
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

  private async fetchCategory(baseUrl: string, rawCategory: string, deadlineAt: number, maxPages = 8): Promise<{ listings: RawListing[]; isComplete: boolean }> {
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

      const products = $('.product-thumb, .product-layout');
      if (products.length === 0) break;

      products.each((_, el) => {
        const $el = $(el);
        const link = $el.find('.caption a, h4 a, .product-title a').first();
        const sourceUrl = link.attr('href') ?? '';
        const rawTitle = link.text().trim();
        const priceText = $el.find('.price, .price-new').first().text();
        const rawPrice = parsePriceText(priceText);
        const skuText = $el.text().match(/Код товара:\s*(\d+)/)?.[1];
        const image = resolveImageUrl(extractCardImage($el), url);

        if (!rawTitle || !sourceUrl || rawPrice === null) return;

        listings.push({
          sourceUrl,
          sourceSku: skuText,
          rawTitle,
          rawCategory,
          siteCategoryLabel: siteCategoryLabel ?? undefined,
          rawPrice,
          rawCurrency: 'UAH',
          inStock: true, // см. комментарий выше про AJAX-наличие
          images: image ? [image] : [],
        });
      });

      if (products.length < 15) break;
    }

    return { listings, isComplete: true };
  }
}
