'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { useParams } from 'next/navigation';
import { isLocale, type Locale } from '../../../../../lib/i18n';
import { getDictionary } from '../../../../../lib/get-dictionary';
import { clientApi } from '../../../../../lib/client-api';
import { PriceTag } from '../../../../../components/PriceTag';
import { useExchangeRate } from '../../../../../lib/use-exchange-rate';
import type { Order } from '../../../../../lib/api';

export default function OrderDetailPage() {
  const params = useParams<{ locale: string; id: string }>();
  const locale = (isLocale(params.locale) ? params.locale : 'uk') as Locale;
  const dict = getDictionary(locale);
  const rateUah = useExchangeRate();

  const [order, setOrder] = useState<Order | null | undefined>(undefined);

  useEffect(() => {
    clientApi<Order>(`/account/orders/${params.id}`)
      .then(setOrder)
      .catch(() => setOrder(null));
  }, [params.id]);

  if (order === undefined) return <div className="mx-auto max-w-3xl px-4 py-10 text-leaf-900/50">...</div>;
  if (order === null) return <div className="mx-auto max-w-3xl px-4 py-10 text-leaf-900/50">Not found</div>;

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="mb-1 text-2xl font-semibold text-leaf-900">#{order.id.slice(-8).toUpperCase()}</h1>
      <p className="mb-6 text-leaf-900/50">{dict.account.orderStatus[order.status]}</p>

      <div className="mb-6 flex flex-col gap-3">
        {order.items.map((item) => (
          <div key={item.id} className="flex items-center gap-4 rounded-xl border border-leaf-800/10 p-3">
            <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-leaf-50">
              {item.product.images[0] && (
                <Image src={item.product.images[0].url} alt={item.product.name} fill className="object-cover" />
              )}
            </div>
            <div className="flex-1 text-sm">
              <p className="font-medium text-leaf-900">{item.product.name}</p>
              <p className="text-leaf-900/50">
                <PriceTag priceUsd={item.priceUsd} rateUah={rateUah} /> × {item.quantity}
              </p>
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-1 border-t border-leaf-800/10 pt-4 text-sm">
        <p className="flex justify-between">
          <span className="text-leaf-900/50">Разом</span>
          <span className="font-semibold text-leaf-900">
            <PriceTag priceUsd={order.totalUsd} rateUah={rateUah} />
          </span>
        </p>
        {order.ttnNumber && (
          <p className="flex justify-between">
            <span className="text-leaf-900/50">{dict.checkout.ttnNumber}</span>
            <span className="text-leaf-900">{order.ttnNumber}</span>
          </p>
        )}
        {order.invoicePdfUrl && (
          <a href={order.invoicePdfUrl} target="_blank" rel="noopener noreferrer" className="mt-2 text-leaf-700 underline">
            PDF-рахунок
          </a>
        )}
      </div>
    </div>
  );
}
