import * as cheerio from 'cheerio';
import { fetchCategoryPageHtml } from './scrape-utils';
import type { IReviewScraperAdapter, ScrapedReview } from '../review-adapter.interface';

// sunshop.com.ua (WooCommerce) — За прямим запитом користувача
// ("добавить парсер отзывов на товары отдельно скриптом для каждого
// магазина").
//
// ✅ РЕАЛЬНО ПІДТВЕРДЖЕНО прямим `web_fetch` живої сторінки товару
// (не здогадка за аналогією, як решта 3 review-адаптерів) — розділ
// README: сторінка товару МАЄ tab "Отзывы (N)", під ним або текст
// "Отзывов пока нет" (якщо 0), або форма додавання з РЕАЛЬНО
// підтвердженою 5-бальною шкалою з текстовими мітками: "Отлично /
// Хорошо / Средне / Так себе / Плохо" (стандартна WooCommerce
// локалізація зірочкового рейтингу).
//
// ⚠️ Точні CSS-класи ВСЕ ОДНО не протестовані проти живого DOM
// (web_fetch віддає markdown-конвертацію, не сирий HTML) — закладені
// нижче СТАНДАРТНІ для WooCommerce (`#comments`/`.comment_container`/
// `.woocommerce-review__author`/`.star-rating`) як найкраще
// наближення. Перед першим реальним прогоном — перевірити/
// скоригувати вручну (той самий принцип, що вже в SunshopAdapter для
// товарів).
export class SunshopReviewAdapter implements IReviewScraperAdapter {
  readonly vendorName = 'sunshop.com.ua';

  async scrapeReviews(productPageUrl: string): Promise<ScrapedReview[]> {
    const { html, httpOk } = await fetchCategoryPageHtml(productPageUrl);
    if (!httpOk) return [];

    const $ = cheerio.load(html);
    const reviews: ScrapedReview[] = [];

    // WooCommerce стандартно рендерить кожен відгук як #comment-N
    // всередині <ol class="commentlist">/<div id="reviews">.
    $('#comments .comment_container, .woocommerce-Reviews .comment_container, #reviews li.review').each((_, el) => {
      const $el = $(el);
      const authorName = $el.find('.woocommerce-review__author, .comment-author .fn, strong.woocommerce-review__author').first().text().trim() || undefined;
      const reviewText = $el.find('.description p, .comment-text p, .woocommerce-review__text').first().text().trim();
      if (!reviewText) return;

      // WooCommerce star-rating зазвичай рендериться як
      // `<strong class="rating">N</strong>` всередині
      // `.star-rating`, або як `width: N%` inline-style на
      // `.star-rating span` (N% = rating/5*100).
      let ratingRaw: number | undefined;
      const ratingStrong = $el.find('.star-rating strong.rating').first().text().trim();
      if (ratingStrong) {
        ratingRaw = Number(ratingStrong);
      } else {
        const style = $el.find('.star-rating span').first().attr('style') ?? '';
        const match = style.match(/width:\s*(\d+)%/);
        if (match) ratingRaw = Math.round((Number(match[1]) / 100) * 5);
      }

      const publishedAtRaw = $el.find('.woocommerce-review__published-date, .comment-date, time').first().text().trim() || undefined;

      reviews.push({ authorName, ratingRaw, ratingScaleMax: 5, reviewText, publishedAtRaw });
    });

    return reviews;
  }
}
