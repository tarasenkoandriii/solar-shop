'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '../../lib/api';
import type { SourceListing } from '../../lib/api';
import { useAdminLocale } from '../../lib/locale-context';
import type { AdminDictionary } from '../../lib/i18n';

function relativeTime(iso: string, d: AdminDictionary['pages']['listings']): { text: string; stale: boolean } {
  const diffMs = Date.now() - new Date(iso).getTime();
  const hours = diffMs / (1000 * 60 * 60);
  if (hours < 1) return { text: d.justNow, stale: false };
  if (hours < 24) return { text: `${Math.round(hours)} ${d.hoursAgo}`, stale: false };
  const days = Math.round(hours / 24);
  return { text: `${days} ${d.daysAgo}`, stale: days > 3 };
}

export default function ListingsPage() {
  const [items, setItems] = useState<SourceListing[] | null>(null);
  const [inStockOnly, setInStockOnly] = useState(false);
  const { dict } = useAdminLocale();
  const d = dict.pages.listings;

  async function load() {
    const qs = inStockOnly ? '?inStockOnly=true' : '';
    setItems(await apiFetch<SourceListing[]>(`/admin/listings${qs}`));
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inStockOnly]);

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-leaf-900 dark:text-white">{d.title}</h1>
        <label className="flex items-center gap-2 text-sm text-leaf-900 dark:text-white">
          <input type="checkbox" checked={inStockOnly} onChange={(e) => setInStockOnly(e.target.checked)} />
          {d.inStockOnly}
        </label>
      </div>
      <p className="mb-4 text-sm text-leaf-900/50 dark:text-white/50">{d.intro}</p>

      {!items ? (
        <p className="text-leaf-900/50 dark:text-white/50">{dict.common.loading}</p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-leaf-800/10 text-left text-leaf-900/50 dark:border-white/10 dark:text-white/50">
              <th className="py-2">{d.colRawTitle}</th>
              <th>{d.colVendor}</th>
              <th>{d.colPrice}</th>
              <th>{d.colProduct}</th>
              <th>{d.colPriceChecked}</th>
              <th>{d.colStockChecked}</th>
            </tr>
          </thead>
          <tbody>
            {items.map((l) => {
              const priceAge = relativeTime(l.priceCheckedAt, d);
              const stockAge = relativeTime(l.stockCheckedAt, d);
              return (
                <tr key={l.id} className="border-b border-leaf-800/5 dark:border-white/5">
                  <td className="max-w-xs truncate py-2 text-leaf-900 dark:text-white" title={l.rawTitle}>
                    <a href={l.sourceUrl} target="_blank" rel="noopener noreferrer" className="hover:underline">
                      {l.rawTitle}
                    </a>
                  </td>
                  <td className="text-leaf-900/60 dark:text-white/60">{l.vendor.name}</td>
                  <td className="text-leaf-900 dark:text-white">${l.priceUsd}</td>
                  <td className="text-leaf-900/60 dark:text-white/60">
                    {l.products.length > 0 ? l.products.map((p) => p.product.name).join(', ') : d.notMatched}
                  </td>
                  <td className={priceAge.stale ? 'text-red-600 dark:text-red-400' : 'text-leaf-900/50 dark:text-white/50'}>{priceAge.text}</td>
                  <td className={stockAge.stale ? 'text-red-600 dark:text-red-400' : 'text-leaf-900/50 dark:text-white/50'}>{stockAge.text}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}
