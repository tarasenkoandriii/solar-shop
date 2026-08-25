import * as cheerio from 'cheerio';
import { extractCardImage, resolveImageUrl, fetchCategoryPageHtml, extractPageCategoryLabel } from './scrape-utils';
import type { ISourceAdapter, RawListing } from '../adapter.interface';

// akumulyator.center — приоритет №2 по ТЗ п.12.
//
// ⚠️ Как и в SunshopAdapter (см. комментарий там) — структура (CS-Cart,
// категории /sonyachni-stancii/sonyachni-paneli/, пагинация /page-N/,
// формат карточки) подтверждена web_search+web_fetch на этапе написания
// кода, но точные CSS-классы не протестированы против живого DOM (сеть
// песочницы не пускает на сам сайт). CS-Cart стандартно использует классы
// вида `.ty-grid-list__item` — заложены ниже как лучшее приближение.
//
// У этого магазина нет отдельной категории "контроллеры заряда" в меню
// (только инверторы) — CONTROLLER для этого вендора не заполняется,
// матчинг просто не найдёт listings этой категории от akumulyator.center,
// что ожидаемо и не является багом.
export class AkumulyatorCenterAdapter implements ISourceAdapter {
  readonly vendorName = 'akumulyator.center';

  private readonly categoryUrls: Partial<Record<'SOLAR_PANEL' | 'BATTERY', string>> = {
    SOLAR_PANEL: 'https://akumulyator.center/sonyachni-stancii/sonyachni-paneli/',
    // LiFePO4 — самая сопоставимая с нашей категорией BATTERY линейка
    // (у магазина также есть автомобильные/AGM-гелевые аккумуляторы отдельно,
    // не наш профиль).
    BATTERY: 'https://akumulyator.center/avtomobilni-akumulyatori/litiievi-akumulyatori/lifepo4/',
  };

  async fetchListings(deadlineAt: number): Promise<{ listings: RawListing[]; isComplete: boolean }> {
    const results: RawListing[] = [];
    for (const [category, url] of Object.entries(this.categoryUrls)) {
      if (!url) continue;
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

      const url = page === 1 ? baseUrl : `${baseUrl}page-${page}/`;
      const { html, httpOk } = await fetchCategoryPageHtml(url);
      if (!httpOk) break;

      const $ = cheerio.load(html);
      if (page === 1) siteCategoryLabel = extractPageCategoryLabel($);

      const products = $('.ty-grid-list__item, .products-container .item');
      if (products.length === 0) break;

      products.each((_, el) => {
        const $el = $(el);
        const link = $el.find('a.ty-grid-list__item-name, .product-title a').first();
        const sourceUrl = link.attr('href') ?? '';
        const rawTitle = link.text().trim();
        const priceText = $el.find('.ty-price-num, .product-price .price').first().text();
        const rawPrice = parsePrice(priceText);
        const availabilityText = $el.find('.ty-qty-in-stock, .availability').first().text();
        const outOfStock = /немає в наявності|нет в наличии|під замовлення/i.test(availabilityText);
        const image = resolveImageUrl(extractCardImage($el), url);

        if (!rawTitle || !sourceUrl || rawPrice === null) return;

        listings.push({
          sourceUrl,
          rawTitle,
          rawCategory,
          siteCategoryLabel: siteCategoryLabel ?? undefined,
          rawPrice,
          rawCurrency: 'UAH',
          inStock: !outOfStock,
          images: image ? [image] : [],
        });
      });

      // CS-Cart отдаёт постранично небольшими блоками — если карточек на
      // странице заметно меньше типичного (обычно 12-24), это последняя страница.
      if (products.length < 10) break;
    }

    return { listings, isComplete: true };
  }
}

function parsePrice(text: string): number | null {
  const cleaned = text.replace(/[^\d]/g, '');
  if (!cleaned) return null;
  return Number(cleaned);
}
