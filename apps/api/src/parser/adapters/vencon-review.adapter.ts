import * as cheerio from 'cheerio';
import { fetchCategoryPageHtml } from './scrape-utils';
import type { IReviewScraperAdapter, ScrapedReview } from '../review-adapter.interface';

// vencon.ua (кастомна платформа) — За прямим запитом користувача.
//
// ⚠️ НАЙМЕНШ ПІДТВЕРДЖЕНИЙ з усіх 4 review-адаптерів. На відміну від
// решти 3 — тут навіть аналогія до відомої CMS-платформи неможлива
// (VenconAdapter для товарів, розділ README, вже описує vencon.ua як
// "кастомна платформа", без відомого стандарту взагалі). Замість
// ВИГАДУВАННЯ конкретних CSS-класів без жодного обґрунтування —
// свідомо використано УЗАГАЛЬНЕНУ евристику (елементи, чий class
// МІСТИТЬ підрядок "review"/"отзыв"/"відгук"/"comment") — чесніше й,
// ймовірно, гнучкіше за вигадування точних імен класів "навмання".
// Перед першим реальним прогоном — ОБОВ'ЯЗКОВО перевірити структуру
// вручну (DevTools на реальній сторінці товару) і замінити цю
// евристику на точні селектори.
export class VenconReviewAdapter implements IReviewScraperAdapter {
  readonly vendorName = 'vencon.ua';

  async scrapeReviews(productPageUrl: string): Promise<ScrapedReview[]> {
    const { html, httpOk } = await fetchCategoryPageHtml(productPageUrl);
    if (!httpOk) return [];

    const $ = cheerio.load(html);
    const reviews: ScrapedReview[] = [];

    $('[class*="review" i], [class*="отзыв" i], [class*="відгук" i]').each((_, el) => {
      const $el = $(el);
      // Пропускаємо контейнери-обгортки без власного тексту (напр.
      // <div class="reviews-section"> — це секція, не окремий
      // відгук) — беремо лише елементи з реальним текстовим вмістом
      // прийнятної довжини.
      const text = $el.clone().children('[class*="review" i], [class*="отзыв" i], [class*="відгук" i]').remove().end().text().trim();
      if (text.length < 15 || text.length > 3000) return;

      reviews.push({ reviewText: text });
    });

    return reviews;
  }
}
