import * as cheerio from 'cheerio';
import { fetchCategoryPageHtml } from './scrape-utils';
import type { IReviewScraperAdapter, ScrapedReview } from '../review-adapter.interface';

// akumulyator.center (CS-Cart) — За прямим запитом користувача.
//
// ⚠️ НА ВІДМІНУ від SunshopReviewAdapter — тут НЕ вдалося знайти живу
// сторінку товару з реальним блоком відгуків через web_search/
// web_fetch у цій сесії (лише загальна інформація про компанію,
// жодної конкретної сторінки товару з відгуками в результатах
// пошуку). Структура нижче — здогадка ЗА АНАЛОГІЄЮ до стандартного
// CS-Cart "Discussion" add-on (`.ty-discussion-post`), НЕ підтверджена
// прямим доступом до живого DOM ЦЬОГО магазину, менш надійна за
// sunshop-адаптер. Перед першим реальним прогоном — ОБОВ'ЯЗКОВО
// перевірити на реальній сторінці товару (DevTools) і скоригувати.
export class AkumulyatorCenterReviewAdapter implements IReviewScraperAdapter {
  readonly vendorName = 'akumulyator.center';

  async scrapeReviews(productPageUrl: string): Promise<ScrapedReview[]> {
    const { html, httpOk } = await fetchCategoryPageHtml(productPageUrl);
    if (!httpOk) return [];

    const $ = cheerio.load(html);
    const reviews: ScrapedReview[] = [];

    $('.ty-discussion-post, .cm-reponsive-message-content').each((_, el) => {
      const $el = $(el);
      const authorName = $el.find('.ty-discussion-post__author, .ty-discussion-post__name').first().text().trim() || undefined;
      const reviewText = $el.find('.ty-discussion-post__message, .ty-discussion-post__body').first().text().trim();
      if (!reviewText) return;

      // CS-Cart rating зазвичай через data-rating атрибут на елементі
      // зірок (не текстове число напряму).
      const ratingAttr = $el.find('[data-rating], .cm-rating').first().attr('data-rating');
      const ratingRaw = ratingAttr ? Number(ratingAttr) : undefined;

      const publishedAtRaw = $el.find('.ty-discussion-post__date').first().text().trim() || undefined;

      reviews.push({ authorName, ratingRaw, ratingScaleMax: 5, reviewText, publishedAtRaw });
    });

    return reviews;
  }
}
