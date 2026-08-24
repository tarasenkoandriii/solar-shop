// За прямим запитом користувача — "добавить парсер отзывов на товары
// отдельно скриптом для каждого магазина". Той самий принцип
// розширюваності, що вже ISourceAdapter (adapter.interface.ts) для
// парсингу самих товарів — новий магазин підключається написанням
// нової реалізації, без змін в іншому пайплайні.
export interface ScrapedReview {
  authorName?: string;
  // Сира оцінка, як показана на сайті джерела (напр. 1-5 для
  // WooCommerce) — нормалізація до 1-10 відбувається окремо
  // (scrape-utils.ts:normalizeRating), не всередині адаптера, щоб
  // логіка нормалізації була одна на всіх, не дублювалась у кожному
  // адаптері.
  ratingRaw?: number;
  ratingScaleMax?: number; // максимум шкали джерела (5 для WooCommerce, може бути інше для інших платформ)
  reviewText: string;
  publishedAtRaw?: string;
}

export interface IReviewScraperAdapter {
  /** Має збігатись із Vendor.name у БД — той самий принцип, що ISourceAdapter.vendorName */
  readonly vendorName: string;

  /** Один виклик на одну сторінку конкретного товару (вже відомий sourceUrl з SourceListing) */
  scrapeReviews(productPageUrl: string): Promise<ScrapedReview[]>;
}
