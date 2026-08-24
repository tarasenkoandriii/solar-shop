'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { isLocale, type Locale } from '../../../lib/i18n';
import { getDictionary } from '../../../lib/get-dictionary';
import { clientApi } from '../../../lib/client-api';
import { PriceTag } from '../../../components/PriceTag';
import { DevLoginButton } from '../../../components/DevLoginButton';
import { useExchangeRate } from '../../../lib/use-exchange-rate';
import type { Order } from '../../../lib/api';

interface Me {
  id: string;
  firstName: string | null;
  username: string | null;
  lifetimeSpendUah: string;
}

export default function AccountPage() {
  const params = useParams<{ locale: string }>();
  const locale = (isLocale(params.locale) ? params.locale : 'uk') as Locale;
  const dict = getDictionary(locale);
  const rateUah = useExchangeRate();

  const [me, setMe] = useState<Me | null | undefined>(undefined);
  const [orders, setOrders] = useState<Order[]>([]);

  useEffect(() => {
    clientApi<Me>('/auth/me')
      .then((user) => {
        setMe(user);
        return clientApi<Order[]>('/account/orders');
      })
      .then(setOrders)
      .catch(() => setMe(null));
  }, []);

  if (me === undefined) return <div className="mx-auto max-w-3xl px-4 py-10 text-leaf-900/50">...</div>;

  if (me === null) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center gap-4 px-4 py-16 text-center text-leaf-900/60">
        {dict.account.loginRequired}
        <DevLoginButton variant="light" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="mb-2 text-2xl font-semibold text-leaf-900">{dict.account.title}</h1>
      <p className="mb-8 text-leaf-900/60">{me.firstName ?? me.username}</p>

      <div className="mb-8 rounded-2xl border border-leaf-800/10 p-5">
        <p className="text-sm text-leaf-900/50">{dict.account.loyaltyTitle}</p>
        <p className="text-lg font-semibold text-leaf-900">{Number(me.lifetimeSpendUah).toLocaleString('uk-UA')} ₴</p>
      </div>

      <Link
        href={`/${locale}/account/projects`}
        className="mb-8 flex items-center justify-between rounded-2xl border border-leaf-800/10 p-5 hover:shadow"
      >
        <span className="font-medium text-leaf-900">🧮 Мої проєкти калькулятора</span>
        <span className="text-leaf-900/40">→</span>
      </Link>

      <h2 className="mb-4 text-lg font-semibold text-leaf-900">{dict.account.orders}</h2>
      {orders.length === 0 ? (
        <p className="text-leaf-900/50">{dict.account.noOrders}</p>
      ) : (
        <div className="flex flex-col gap-3">
          {orders.map((order) => (
            <Link
              key={order.id}
              href={`/${locale}/account/orders/${order.id}`}
              className="flex items-center justify-between rounded-xl border border-leaf-800/10 p-4 text-sm hover:shadow"
            >
              <div>
                <p className="font-medium text-leaf-900">#{order.id.slice(-8).toUpperCase()}</p>
                <p className="text-leaf-900/50">{new Date(order.createdAt).toLocaleDateString('uk-UA')}</p>
              </div>
              <div className="text-right">
                <p className="font-semibold text-leaf-900">
                  <PriceTag priceUsd={order.totalUsd} rateUah={rateUah} />
                </p>
                <p className="text-leaf-900/50">{dict.account.orderStatus[order.status]}</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
