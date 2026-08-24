'use client';

import { useCallback, useEffect, useState } from 'react';
import { clientApi } from '../lib/client-api';
import type { Locale } from '../lib/i18n';
import type { ProductReview, ImportedProductReview } from '../lib/api';
import { ProductReviewForm } from './ProductReviewForm';
import { ProductReviewItem } from './ProductReviewItem';

// За прямим запитом користувача — і форма (з переліком позицій без
// відгуку), і сам список (з isMine-залежними кнопками
// редагувати/видалити) мають перезавантажуватись після будь-якої дії
// (новий відгук/редагування/видалення) — винесено в один Client
// Component, що сам керує своїм станом, не залежить від батьківського
// async Server Component сторінки товару.
export function ProductReviewsSection({ locale, productId }: { locale: Locale; productId: string }) {
  const [reviews, setReviews] = useState<ProductReview[] | null>(null);
  const [importedReviews, setImportedReviews] = useState<ImportedProductReview[] | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const reload = useCallback(() => setReloadKey((k) => k + 1), []);

  useEffect(() => {
    clientApi<ProductReview[]>(`/products/${productId}/reviews`)
      .then(setReviews)
      .catch(() => setReviews([]));
  }, [productId, reloadKey]);

  // За прямим запитом користувача — "добавить парсер отзывов на
  // товары... показать отзывы на нашем сайте с указанием источника
  // отзыва". Read-only, спарсено кроном — не потребує reloadKey
  // (не змінюється діями користувача на цій сторінці).
  useEffect(() => {
    clientApi<ImportedProductReview[]>(`/products/${productId}/imported-reviews`)
      .then(setImportedReviews)
      .catch(() => setImportedReviews([]));
  }, [productId]);

  return (
    <div className="flex flex-col gap-6">
      <ProductReviewForm locale={locale} productId={productId} onSubmitted={reload} />

      <div>
        <h2 className="mb-4 font-medium text-leaf-900">Відгуки покупців ({reviews?.length ?? 0})</h2>
        {reviews === null ? (
          <p className="text-sm text-leaf-900/50">Завантаження...</p>
        ) : reviews.length === 0 ? (
          <p className="text-sm text-leaf-900/50">Ще немає відгуків про цей товар.</p>
        ) : (
          <div className="flex flex-col gap-4">
            {reviews.map((r) => (
              <ProductReviewItem key={r.id} review={r} onChanged={reload} />
            ))}
          </div>
        )}
      </div>

      {/* За прямим запитом користувача — "показать отзывы на нашем
          сайте с указанием источника отзыва". ОКРЕМА, явно
          озаглавлена секція — розділення за рівнем довіри
          (верифікована покупка вище vs спарсено із зовнішнього
          джерела, без антиспам-перевірки, тут). Не показується
          взагалі, якщо немає жодного (не порожня секція без сенсу). */}
      {importedReviews !== null && importedReviews.length > 0 && (
        <div>
          <h2 className="mb-1 font-medium text-leaf-900">Відгуки з інших сайтів ({importedReviews.length})</h2>
          <p className="mb-4 text-xs text-leaf-900/50">
            Ці відгуки залишені на сайтах постачальників, не на Solar Shop — джерело вказано в кожному.
          </p>
          <div className="flex flex-col gap-4">
            {importedReviews.map((r) => (
              <div key={r.id} className="rounded-xl border border-leaf-800/10 bg-leaf-50/40 p-4">
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-sm font-medium text-leaf-900">
                    {r.ratingNormalized !== null ? `☀ ${r.ratingNormalized}/10` : r.authorName || 'Анонім'}
                  </p>
                  {r.publishedAtRaw && <p className="text-xs text-leaf-900/40">{r.publishedAtRaw}</p>}
                </div>
                <p className="mb-2 text-sm text-leaf-900/70">{r.reviewText}</p>
                <a href={r.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-leaf-700 underline">
                  Джерело: {r.vendorName} →
                </a>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
