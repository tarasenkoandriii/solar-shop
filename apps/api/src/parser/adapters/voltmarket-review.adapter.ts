import * as cheerio from 'cheerio';
import { fetchCategoryPageHtml } from './scrape-utils';
import type { IReviewScraperAdapter, ScrapedReview } from '../review-adapter.interface';

// voltmarket.ua (OpenCart) — За прямим запитом користувача.
//
// ⚠️ Той самий рівень непідтвердженості, що вже AkumulyatorCenterReview
// Adapter — не вдалося дістатись живої сторінки товару з блоком
// відгуків через доступні інструменти цієї сесії. Структура нижче —
// здогадка за аналогією до СТАНДАРТНОЇ OpenCart вкладки "Reviews"
// (`#tab-review`, таблиця відгуків) — не перевірена проти живого DOM.
// OpenCart зазвичай показує рейтинг через набір `<img>` зірок
// (alt-текст типу "5 of 5 Stars"), не текстове число напряму —
// закладено парсинг ІЗ alt-тексту як найкраще наближення.
export class VoltmarketReviewAdapter implements IReviewScraperAdapter {
  readonly vendorName = 'voltmarket.ua';

  async scrapeReviews(productPageUrl: string): Promise<ScrapedReview[]> {
    const { html, httpOk } = await fetchCategoryPageHtml(productPageUrl);
    if (!httpOk) return [];

    const $ = cheerio.load(html);
    const reviews: ScrapedReview[] = [];

    $('#tab-review .list-unstyled li, #tab-review .review').each((_, el) => {
      const $el = $(el);
      const authorName = $el.find('.review-author, strong').first().text().trim() || undefined;
      const reviewText = $el.find('p').last().text().trim();
      if (!reviewText) return;

      // OpenCart зазвичай кодує рейтинг через кількість <img> зірок
      // або alt-текст "N of 5 Stars" — рахуємо кількість "заповнених"
      // зображень зірки як fallback, якщо alt-текст не парситься.
      let ratingRaw: number | undefined;
      const ratingImgAlt = $el.find('.rating img, [class*="star"] img').first().attr('alt') ?? '';
      const altMatch = ratingImgAlt.match(/(\d+)\s*of\s*5/i);
      if (altMatch) {
        ratingRaw = Number(altMatch[1]);
      } else {
        const filledStars = $el.find('img[src*="star-full"], img[src*="fa-star"]').length;
        if (filledStars > 0) ratingRaw = filledStars;
      }

      const publishedAtRaw = $el.find('.review-date, .date').first().text().trim() || undefined;

      reviews.push({ authorName, ratingRaw, ratingScaleMax: 5, reviewText, publishedAtRaw });
    });

    return reviews;
  }
}
