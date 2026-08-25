'use client';

import Link from 'next/link';
import { ProductPhoto } from '../../../components/ProductPhoto';
import { useParams, useRouter } from 'next/navigation';
import { useCart } from '../../../lib/cart-context';
import { useExchangeRate } from '../../../lib/use-exchange-rate';
import { getDictionary } from '../../../lib/get-dictionary';
import { isLocale, type Locale } from '../../../lib/i18n';
import { PriceTag } from '../../../components/PriceTag';

export default function CartPage() {
  const params = useParams<{ locale: string }>();
  const router = useRouter();
  const locale = (isLocale(params.locale) ? params.locale : 'uk') as Locale;
  const dict = getDictionary(locale);
  const { cart, loading, updateItem, removeItem } = useCart();
  const rateUah = useExchangeRate();

  if (loading) {
    return <div className="mx-auto max-w-4xl px-4 py-10 text-leaf-900/50">...</div>;
  }

  const items = cart?.items ?? [];

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="mb-6 text-2xl font-semibold text-leaf-900">{dict.cart.title}</h1>

      {items.length === 0 ? (
        <div className="text-center">
          <p className="mb-4 text-leaf-900/60">{dict.cart.empty}</p>
          <Link href={`/${locale}`} className="text-leaf-700 underline">
            {dict.cart.continueShopping}
          </Link>
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-4">
            {items.map((item) => (
              <div key={item.id} className="flex items-center gap-4 rounded-2xl border border-leaf-800/10 p-4">
                <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-leaf-50">
                  {item.product.images[0] && (
                    <ProductPhoto src={item.product.images[0].url} alt={item.product.name} sizes="80px" />
                  )}
                </div>
                <div className="flex-1">
                  <Link href={`/${locale}/products/${item.product.slug}`} className="font-medium text-leaf-900 hover:underline">
                    {item.product.name}
                  </Link>
                  <p className="text-sm text-leaf-900/50">
                    <PriceTag priceUsd={item.priceSnapshot} rateUah={rateUah} /> × {item.quantity}
                  </p>
                </div>
                <input
                  type="number"
                  min={1}
                  value={item.quantity}
                  onChange={(e) => updateItem(item.id, Math.max(1, Number(e.target.value)))}
                  className="w-16 rounded-lg border border-leaf-800/20 px-2 py-1 text-center text-sm"
                />
                <button onClick={() => removeItem(item.id)} className="text-sm text-red-600 underline">
                  {dict.cart.remove}
                </button>
              </div>
            ))}
          </div>

          <div className="mt-8 flex items-center justify-between border-t border-leaf-800/10 pt-6">
            <span className="text-lg font-semibold text-leaf-900">
              {dict.cart.subtotal}: <PriceTag priceUsd={cart?.subtotalUsd ?? 0} rateUah={rateUah} />
            </span>
            <button
              onClick={() => router.push(`/${locale}/checkout`)}
              className="rounded-full bg-sun-500 px-8 py-3 font-medium text-leaf-900 transition hover:bg-sun-400"
            >
              {dict.cart.checkout}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
