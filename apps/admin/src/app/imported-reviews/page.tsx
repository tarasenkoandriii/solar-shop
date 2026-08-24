'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '../../lib/api';
import type { ImportedProductReviewAdmin } from '../../lib/api';
import { useAdminLocale } from '../../lib/locale-context';

// За прямим запитом користувача — "добавить парсер отзывов на товары
// отдельно скриптом для каждого магазина, показать отзывы на нашем
// сайте с указанием источника отзыва". Ці відгуки публікуються одразу
// (не наш UGC, вже публічний контент із сайту-джерела) — але видалення
// критичне, бо чесно позначена невпевненість у селекторах 3 з 4
// адаптерів (розділ README) робить помилковий парсинг цілком
// імовірним на практиці.
export default function ImportedReviewsPage() {
  const [items, setItems] = useState<ImportedProductReviewAdmin[] | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const { dict } = useAdminLocale();
  const d = dict.pages.importedReviews;

  async function load() {
    setItems(await apiFetch<ImportedProductReviewAdmin[]>('/products/admin/imported-reviews'));
  }

  useEffect(() => {
    load();
  }, []);

  async function handleDelete(id: string) {
    if (!confirm(d.confirmDelete)) return;
    setBusyId(id);
    try {
      await apiFetch(`/products/admin/imported-reviews/${id}`, { method: 'DELETE' });
      await load();
    } catch (err) {
      alert(err instanceof Error ? err.message : d.deleteError);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      <h1 className="mb-1 text-xl font-semibold text-leaf-900 dark:text-white">{d.title}</h1>
      <p className="mb-6 text-sm text-leaf-900/50 dark:text-white/50">{d.intro}</p>

      {!items ? (
        <p className="text-leaf-900/50 dark:text-white/50">{dict.common.loading}</p>
      ) : items.length === 0 ? (
        <p className="text-leaf-900/50 dark:text-white/50">{d.noItems}</p>
      ) : (
        <div className="flex flex-col gap-3">
          {items.map((r) => (
            <div key={r.id} className="rounded-xl border border-leaf-800/10 p-4 dark:border-white/10">
              <div className="mb-1 flex items-center justify-between">
                <p className="text-sm font-medium text-leaf-900 dark:text-white">
                  {r.product.name} — {r.vendorName}
                  {r.ratingNormalized !== null && ` · ☀ ${r.ratingNormalized}/10 (${d.rawRatingLabel}: ${r.ratingRaw ?? '—'})`}
                </p>
                <p className="text-xs text-leaf-900/40 dark:text-white/40">{new Date(r.scrapedAt).toLocaleDateString('uk-UA')}</p>
              </div>
              {r.authorName && (
                <p className="mb-1 text-xs text-leaf-900/50 dark:text-white/50">
                  {d.authorOnSource} {r.authorName}
                </p>
              )}
              <p className="mb-2 text-sm text-leaf-900/80 dark:text-white/80">«{r.reviewText}»</p>
              <div className="flex items-center gap-3">
                <a href={r.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-leaf-700 underline dark:text-sun-500">
                  {d.openSource}
                </a>
                <button onClick={() => handleDelete(r.id)} disabled={busyId === r.id} className="text-xs text-red-600 underline disabled:opacity-50 dark:text-red-400">
                  {busyId === r.id ? '...' : dict.common.delete}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
