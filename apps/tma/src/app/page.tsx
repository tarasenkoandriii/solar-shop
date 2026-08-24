'use client';

import { useEffect, useState } from 'react';
import { apiGet } from '../lib/api';
import type { Product, ProductListResponse } from '../lib/api';
import { useTelegramSession } from '../components/TelegramProvider';
import { ProductCard } from '../components/ProductCard';
import { ProductSheet } from '../components/ProductSheet';

const CATEGORIES = [
  { value: 'SOLAR_PANEL', label: 'Панелі' },
  { value: 'BATTERY', label: 'Акумулятори' },
  { value: 'CONTROLLER', label: 'Контролери' },
] as const;

export default function TmaHomePage() {
  const { token, status } = useTelegramSession();
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]['value']>('SOLAR_PANEL');
  const [sort, setSort] = useState<'newest' | 'price_asc' | 'price_desc'>('newest');
  const [products, setProducts] = useState<Product[]>([]);
  const [selected, setSelected] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    apiGet<ProductListResponse>(`/products?category=${category}&sort=${sort}&pageSize=30`, token)
      .then((data) => setProducts(data.items))
      .catch(() => setProducts([]))
      .finally(() => setLoading(false));
  }, [category, sort, token]);

  return (
    <div className="px-3 pb-6 pt-4">
      <h1 className="mb-3 text-lg font-semibold">☀ Solar Shop</h1>

      {status === 'no-init-data' && (
        <p className="mb-3 rounded-xl bg-orange-50 p-3 text-xs text-orange-700">
          Немає Telegram initData — відкрийте застосунок через Telegram-бота, або скористайтесь DEV-панеллю знизу
          для локальної відладки.
        </p>
      )}

      <div className="mb-3 flex gap-2 overflow-x-auto">
        {CATEGORIES.map((c) => (
          <button
            key={c.value}
            onClick={() => setCategory(c.value)}
            className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-medium ${
              category === c.value ? 'bg-sun-500 text-leaf-900' : 'bg-white text-leaf-900/60'
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>

      <select
        value={sort}
        onChange={(e) => setSort(e.target.value as typeof sort)}
        className="mb-4 w-full rounded-xl border border-leaf-900/10 bg-white px-3 py-2 text-sm"
      >
        <option value="newest">Новинки</option>
        <option value="price_asc">Ціна: за зростанням</option>
        <option value="price_desc">Ціна: за спаданням</option>
      </select>

      {loading ? (
        <p className="text-sm text-leaf-900/50">Завантаження...</p>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {products.map((p) => (
            <ProductCard key={p.id} product={p} onOpen={setSelected} />
          ))}
        </div>
      )}

      {selected && <ProductSheet product={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
