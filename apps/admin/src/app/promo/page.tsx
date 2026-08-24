'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '../../lib/api';
import type { Product, PromoSetting } from '../../lib/api';
import { useAdminLocale } from '../../lib/locale-context';

export default function PromoPage() {
  const [settings, setSettings] = useState<PromoSetting[]>([]);
  const [promoProducts, setPromoProducts] = useState<Product[]>([]);
  const [busy, setBusy] = useState(false);
  const { dict } = useAdminLocale();
  const d = dict.pages.promo;
  const CATEGORIES: { value: PromoSetting['category']; label: string }[] = [
    { value: null, label: d.globalThreshold },
    { value: 'SOLAR_PANEL', label: d.categorySolarPanel },
    { value: 'BATTERY', label: d.categoryBattery },
    { value: 'CONTROLLER', label: d.categoryController },
  ];

  async function load() {
    const [s, all] = await Promise.all([
      apiFetch<PromoSetting[]>('/admin/promo/settings'),
      apiFetch<Product[]>('/products/admin/all'),
    ]);
    setSettings(s);
    setPromoProducts(all.filter((p) => p.cachedIsPromo));
  }

  useEffect(() => {
    load();
  }, []);

  function getThreshold(category: PromoSetting['category']): number {
    return settings.find((s) => s.category === category)?.thresholdPercent ?? (category === null ? 10 : 0);
  }

  async function saveThreshold(category: PromoSetting['category'], thresholdPercent: number) {
    setBusy(true);
    try {
      await apiFetch('/admin/promo/settings', { method: 'POST', body: JSON.stringify({ category, thresholdPercent }) });
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function recalculate() {
    setBusy(true);
    try {
      await apiFetch('/admin/promo/recalculate', { method: 'POST' });
      await load();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <h1 className="mb-1 text-xl font-semibold text-leaf-900 dark:text-white">{d.title}</h1>
      <p className="mb-6 text-sm text-leaf-900/50 dark:text-white/50">{d.intro}</p>

      <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {CATEGORIES.map((c) => (
          <label key={c.label} className="flex flex-col gap-1 text-sm text-leaf-900 dark:text-white">
            {c.label}
            <input
              type="number"
              defaultValue={getThreshold(c.value)}
              onBlur={(e) => saveThreshold(c.value, Number(e.target.value))}
              className="rounded-lg border border-leaf-800/20 px-2 py-1.5 dark:border-white/20 dark:bg-leaf-900"
            />
          </label>
        ))}
      </div>

      <button
        disabled={busy}
        onClick={recalculate}
        className="mb-8 rounded-full bg-sun-500 px-5 py-2 text-sm font-medium text-leaf-900 disabled:opacity-60"
      >
        {d.recalculateNow}
      </button>

      <h2 className="mb-3 font-semibold text-leaf-900 dark:text-white">
        {d.promoProductsTitle} ({promoProducts.length})
      </h2>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-leaf-800/10 text-left text-leaf-900/50 dark:border-white/10 dark:text-white/50">
            <th className="py-2">{d.colProduct}</th>
            <th>{d.colPrice}</th>
            <th>{d.colDiscount}</th>
          </tr>
        </thead>
        <tbody>
          {promoProducts.map((p) => (
            <tr key={p.id} className="border-b border-leaf-800/5 dark:border-white/5">
              <td className="py-2 text-leaf-900 dark:text-white">{p.name}</td>
              <td className="text-leaf-900 dark:text-white">${p.cachedPriceUsd}</td>
              <td className="text-red-600 dark:text-red-400">−{p.cachedDiscountPercent}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
