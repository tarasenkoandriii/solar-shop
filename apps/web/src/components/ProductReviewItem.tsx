'use client';

import { useState } from 'react';
import { clientApi } from '../lib/client-api';
import type { ProductReview } from '../lib/api';

function SunRating({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  return (
    <div className="flex flex-wrap gap-0.5">
      {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          aria-label={`${n} з 10`}
          className={`text-lg leading-none transition ${n <= value ? 'opacity-100' : 'opacity-25 hover:opacity-50'}`}
        >
          ☀
        </button>
      ))}
    </div>
  );
}

// За прямим запитом користувача — "допускается редактировать
// (пересчитывать сколько прошло от покупки) и удалять отзывы (самим
// покупателем только)". Кнопки редагувати/видалити показуються ЛИШЕ
// коли `review.isMine === true` (обчислено на бекенді, не тут — не
// можна довіряти клієнту самому вирішувати, чий це відгук).
export function ProductReviewItem({ review, onChanged }: { review: ProductReview; onChanged: () => void }) {
  const [editing, setEditing] = useState(false);
  const [reliabilityScore, setReliabilityScore] = useState(review.reliabilityScore);
  const [reviewText, setReviewText] = useState(review.reviewText ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      await clientApi(`/products/reviews/${review.id}`, {
        method: 'PUT',
        body: JSON.stringify({ reliabilityScore, reviewText: reviewText.trim() || undefined }),
      });
      setEditing(false);
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не вдалося зберегти зміни');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirm('Видалити відгук? Дію не можна скасувати.')) return;
    try {
      await clientApi(`/products/reviews/${review.id}`, { method: 'DELETE' });
      onChanged();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Не вдалося видалити відгук');
    }
  }

  if (editing) {
    return (
      <div className="rounded-xl border border-sun-500/40 bg-sun-500/5 p-4">
        <div className="mb-3">
          <SunRating value={reliabilityScore} onChange={setReliabilityScore} />
          <span className="ml-2 text-xs text-leaf-900/50">{reliabilityScore}/10</span>
        </div>
        <textarea
          value={reviewText}
          onChange={(e) => setReviewText(e.target.value)}
          rows={3}
          maxLength={2000}
          className="mb-3 w-full rounded-lg border border-leaf-800/20 px-3 py-2 text-sm"
        />
        {error && <p className="mb-2 text-sm text-red-600">{error}</p>}
        {/* За прямим запитом користувача — "пересчитывать сколько
            прошло от покупки" — явне пояснення, що станеться при
            збереженні, не приховано мовчки. */}
        <p className="mb-3 text-xs text-leaf-900/40">
          При збереженні кількість днів від покупки буде перераховано на поточну дату.
        </p>
        <div className="flex gap-2">
          <button onClick={handleSave} disabled={saving} className="rounded-full bg-sun-500 px-4 py-1.5 text-xs font-medium text-leaf-900 disabled:opacity-50">
            {saving ? 'Зберігаю...' : 'Зберегти'}
          </button>
          <button onClick={() => setEditing(false)} className="rounded-full border border-leaf-800/20 px-4 py-1.5 text-xs text-leaf-900/70">
            Скасувати
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-leaf-800/10 p-4">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-sm font-medium text-leaf-900">☀ {review.reliabilityScore}/10 надійність</p>
        <p className="text-xs text-leaf-900/40">{new Date(review.createdAt).toLocaleDateString('uk-UA')}</p>
      </div>
      <p className="mb-1 text-xs text-leaf-900/50">
        Куплено {review.quantityAtReview} {review.quantityAtReview === 1 ? 'од.' : 'од.'} —{' '}
        {review.daysSincePurchaseAtReview === 0 ? 'того ж дня' : `${review.daysSincePurchaseAtReview} дн. до відгуку`}
      </p>
      {review.reviewText && <p className="text-sm text-leaf-900/70">{review.reviewText}</p>}
      {review.isMine && (
        <div className="mt-2 flex gap-3">
          <button onClick={() => setEditing(true)} className="text-xs text-leaf-700 underline">
            Редагувати
          </button>
          <button onClick={handleDelete} className="text-xs text-red-600 underline">
            Видалити
          </button>
        </div>
      )}
    </div>
  );
}
