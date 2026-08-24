'use client';

import { useEffect, useState } from 'react';
import { clientApi } from '../lib/client-api';
import { TelegramLoginButton } from './TelegramLoginButton';
import { DevLoginButton } from './DevLoginButton';
import { getDictionary } from '../lib/get-dictionary';
import type { Locale } from '../lib/i18n';
import type { ReviewableOrderItem } from '../lib/api';

interface Me {
  id: string;
}

// За прямим запитом користувача — "визуализация шкалы отзывов -
// солнышки вместо звёздочек - от 1 до 10".
function SunRating({ value, onChange }: { value: number | undefined; onChange: (n: number) => void }) {
  return (
    <div className="flex flex-wrap gap-0.5">
      {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          aria-label={`${n} з 10`}
          className={`text-lg leading-none transition ${value !== undefined && n <= value ? 'opacity-100' : 'opacity-25 hover:opacity-50'}`}
        >
          ☀
        </button>
      ))}
    </div>
  );
}

// За прямим запитом користувача — "привязать отзывы к покупке - один
// отзыв на каждую позицию в составе проекта". Одна маленька форма НА
// КОЖНУ позицію (OrderItem) без відгуку — не одна загальна форма на
// товар. Якщо покупець замовляв товар у ДВОХ окремих замовленнях —
// побачить ДВІ окремі пропозиції лишити відгук.
function SingleItemReviewForm({
  productId,
  item,
  onSubmitted,
}: {
  productId: string;
  item: ReviewableOrderItem;
  onSubmitted: () => void;
}) {
  const [reliabilityScore, setReliabilityScore] = useState<number | undefined>(undefined);
  const [reviewText, setReviewText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    if (!reliabilityScore) return;
    setSubmitting(true);
    setError(null);
    try {
      await clientApi(`/products/${productId}/reviews`, {
        method: 'POST',
        body: JSON.stringify({ orderItemId: item.orderItemId, reliabilityScore, reviewText: reviewText.trim() || undefined }),
      });
      onSubmitted();
    } catch (err) {
      const message = err instanceof Error ? err.message : '';
      if (message.includes('429')) {
        setError('Забагато спроб — спробуйте ще раз трохи пізніше.');
      } else if (message.includes('409')) {
        setError('Ви вже залишали відгук про цю позицію.');
      } else {
        setError(message || 'Не вдалося надіслати відгук');
      }
    } finally {
      setSubmitting(false);
    }
  }

  const daysAgo = Math.floor((Date.now() - new Date(item.purchasedAt).getTime()) / (1000 * 60 * 60 * 24));

  return (
    <div className="rounded-2xl border border-leaf-800/10 bg-white p-5">
      <p className="mb-3 text-sm text-leaf-900/60">
        Ви купили {item.quantity} {item.quantity === 1 ? 'од.' : 'од.'} — {daysAgo === 0 ? 'сьогодні' : `${daysAgo} дн. тому`}
      </p>

      <div className="mb-4">
        <p className="mb-1 text-sm text-leaf-900">Надійність товару</p>
        <p className="mb-1.5 text-xs text-leaf-900/40">10 — повністю виправдав очікування, 1 — сильно розчарував</p>
        <div className="flex items-center gap-2">
          <SunRating value={reliabilityScore} onChange={setReliabilityScore} />
          {reliabilityScore !== undefined && <span className="text-xs text-leaf-900/50">{reliabilityScore}/10</span>}
        </div>
      </div>

      <textarea
        placeholder="Текст відгуку (опційно) — з'явиться публічно після модерації"
        value={reviewText}
        onChange={(e) => setReviewText(e.target.value)}
        rows={3}
        maxLength={2000}
        className="mb-4 w-full rounded-lg border border-leaf-800/20 px-3 py-2 text-sm"
      />

      {error && <p className="mb-3 text-sm text-red-600">{error}</p>}

      <button
        onClick={handleSubmit}
        disabled={!reliabilityScore || submitting}
        className="rounded-full bg-sun-500 px-5 py-2 text-sm font-medium text-leaf-900 disabled:opacity-50"
      >
        {submitting ? 'Надсилаю...' : 'Надіслати відгук'}
      </button>
    </div>
  );
}

// За прямим запитом користувача — "отзывы... от уже купивших этот
// товар" + "один отзыв на каждую позицию". Показує ПО ОКРЕМІЙ формі
// на кожну позицію замовлення без відгуку — verified purchase
// перевіряється на бекенді через реальний orderItemId, не просто
// "товар був у якомусь замовленні".
export function ProductReviewForm({ locale, productId, onSubmitted }: { locale: Locale; productId: string; onSubmitted: () => void }) {
  const dict = getDictionary(locale);
  const [me, setMe] = useState<Me | null | undefined>(undefined);
  const [reviewableItems, setReviewableItems] = useState<ReviewableOrderItem[] | null>(null);

  useEffect(() => {
    clientApi<Me>('/auth/me')
      .then(setMe)
      .catch(() => setMe(null));
  }, []);

  useEffect(() => {
    if (!me) return;
    clientApi<ReviewableOrderItem[]>(`/products/${productId}/reviewable-order-items`)
      .then(setReviewableItems)
      .catch(() => setReviewableItems([]));
  }, [me, productId]);

  if (me === undefined || (me && reviewableItems === null)) return null;

  if (me === null) {
    return (
      <div className="rounded-2xl border border-leaf-800/10 bg-leaf-50 p-6 text-center">
        <p className="mb-3 text-sm text-leaf-900/70">Щоб залишити відгук, увійдіть через Telegram.</p>
        <div className="flex justify-center gap-3">
          <TelegramLoginButton dict={dict} />
          <DevLoginButton />
        </div>
      </div>
    );
  }

  if (!reviewableItems || reviewableItems.length === 0) {
    return null; // немає товару в замовленнях, або на всі позиції вже лишено відгук — форму не показуємо взагалі
  }

  return (
    <div className="flex flex-col gap-4">
      <h2 className="font-medium text-leaf-900">Залишити відгук</h2>
      <p className="-mt-2 text-xs text-leaf-900/50">
        Відгук можна залишити лише про товар, який ви вже замовляли — так рейтинг надійності відображає реальний
        досвід покупців.
      </p>
      {reviewableItems.map((item) => (
        <SingleItemReviewForm key={item.orderItemId} productId={productId} item={item} onSubmitted={onSubmitted} />
      ))}
    </div>
  );
}
