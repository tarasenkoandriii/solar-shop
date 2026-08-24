'use client';

import { useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { isLocale, type Locale } from '../../../lib/i18n';
import { getDictionary } from '../../../lib/get-dictionary';
import { useCart } from '../../../lib/cart-context';
import { clientApi, getOrCreateSessionId, clearSessionId } from '../../../lib/client-api';
import { NovaPoshtaFields } from '../../../components/NovaPoshtaFields';
import type { NovaPoshtaSelection } from '../../../components/NovaPoshtaFields';
import type { Order } from '../../../lib/api';

export function CheckoutForm() {
  const params = useParams<{ locale: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();
  const locale = (isLocale(params.locale) ? params.locale : 'uk') as Locale;
  const dict = getDictionary(locale);
  const { refresh } = useCart();

  const buyNowProductId = searchParams.get('buyNow');

  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [comment, setComment] = useState('');
  const [npSelection, setNpSelection] = useState<NovaPoshtaSelection>({
    cityRef: null,
    cityName: null,
    warehouseRef: null,
    warehouseName: null,
  });
  const [consentGiven, setConsentGiven] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [order, setOrder] = useState<Order | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!consentGiven) {
      setError('Потрібна згода на обробку персональних даних');
      return;
    }
    setSubmitting(true);
    setError(null);

    const payload = {
      contactName,
      contactPhone,
      comment: comment || undefined,
      npCityRef: npSelection.cityRef ?? undefined,
      npCityName: npSelection.cityName ?? undefined,
      npWarehouseRef: npSelection.warehouseRef ?? undefined,
      npWarehouseName: npSelection.warehouseName ?? undefined,
      consentGiven,
      source: 'web' as const,
      sessionId: getOrCreateSessionId(),
    };

    try {
      const result = buyNowProductId
        ? await clientApi<Order>('/orders/buy-now', {
            method: 'POST',
            body: JSON.stringify({ ...payload, productId: buyNowProductId, quantity: 1 }),
          })
        : await clientApi<Order>('/orders/checkout', { method: 'POST', body: JSON.stringify(payload) });

      setOrder(result);
      if (!buyNowProductId) {
        clearSessionId();
        refresh();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Помилка оформлення замовлення');
    } finally {
      setSubmitting(false);
    }
  }

  if (order) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <p className="mb-2 text-2xl font-semibold text-leaf-900">{dict.checkout.success}</p>
        <p className="mb-1 text-leaf-900/70">
          {dict.checkout.orderNumber}: {order.id.slice(-8).toUpperCase()}
        </p>
        {order.ttnNumber && (
          <p className="mb-4 text-leaf-900/70">
            {dict.checkout.ttnNumber}: {order.ttnNumber}
          </p>
        )}
        <button
          onClick={() => router.push(`/${locale}/account`)}
          className="rounded-full bg-sun-500 px-6 py-3 font-medium text-leaf-900"
        >
          {dict.checkout.goToAccount}
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md px-4 py-10">
      <h1 className="mb-6 text-2xl font-semibold text-leaf-900">{dict.checkout.title}</h1>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}

        <input
          required
          value={contactName}
          onChange={(e) => setContactName(e.target.value)}
          placeholder={dict.checkout.contactName}
          className="rounded-lg border border-leaf-800/20 px-3 py-2"
        />
        <input
          required
          value={contactPhone}
          onChange={(e) => setContactPhone(e.target.value)}
          placeholder={dict.checkout.contactPhone}
          className="rounded-lg border border-leaf-800/20 px-3 py-2"
        />

        <NovaPoshtaFields dict={dict} onChange={setNpSelection} />

        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder={dict.checkout.comment}
          rows={3}
          className="rounded-lg border border-leaf-800/20 px-3 py-2"
        />

        <label className="flex items-start gap-2 text-sm text-leaf-900/70">
          <input
            type="checkbox"
            checked={consentGiven}
            onChange={(e) => setConsentGiven(e.target.checked)}
            className="mt-0.5"
          />
          {dict.checkout.consent}
        </label>

        <button
          type="submit"
          disabled={submitting}
          className="mt-2 rounded-full bg-sun-500 px-6 py-3 font-medium text-leaf-900 transition hover:bg-sun-400 disabled:opacity-60"
        >
          {submitting ? '...' : dict.checkout.submit}
        </button>
      </form>
    </div>
  );
}
