'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCart } from '../lib/cart-context';
import type { Dictionary } from '../lib/get-dictionary';
import type { Locale } from '../lib/i18n';

export function ProductPurchaseActions({
  productId,
  productSlug,
  inStock,
  dict,
  locale,
}: {
  productId: string;
  productSlug: string;
  inStock: boolean;
  dict: Dictionary;
  locale: Locale;
}) {
  const { addItem } = useCart();
  const router = useRouter();
  const [adding, setAdding] = useState(false);

  async function handleAddToCart() {
    setAdding(true);
    try {
      await addItem(productId, 1);
    } finally {
      setAdding(false);
    }
  }

  function handleBuyNow() {
    router.push(`/${locale}/checkout?buyNow=${productId}`);
  }

  if (!inStock) return null;

  return (
    <div className="flex gap-3">
      <button
        onClick={handleAddToCart}
        disabled={adding}
        className="flex-1 rounded-full border border-leaf-800 px-5 py-3 text-center font-medium text-leaf-800 transition hover:bg-leaf-800/5 disabled:opacity-60"
      >
        {adding ? '...' : dict.product.addToCart}
      </button>
      <button
        onClick={handleBuyNow}
        className="flex-1 rounded-full bg-sun-500 px-5 py-3 text-center font-medium text-leaf-900 transition hover:bg-sun-400"
      >
        {dict.product.buyNow}
      </button>
    </div>
  );
}
