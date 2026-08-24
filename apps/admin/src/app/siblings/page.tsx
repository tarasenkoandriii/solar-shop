'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '../../lib/api';
import type { SiblingCandidate } from '../../lib/api';
import { useAdminLocale } from '../../lib/locale-context';

export default function SiblingsPage() {
  const [items, setItems] = useState<SiblingCandidate[] | null>(null);
  const { dict } = useAdminLocale();
  const d = dict.pages.siblings;

  async function load() {
    setItems(await apiFetch<SiblingCandidate[]>('/admin/siblings/candidates'));
  }

  useEffect(() => {
    load();
  }, []);

  async function confirmMatch(sourceListingId: string, productId: string) {
    await apiFetch(`/admin/siblings/${sourceListingId}/confirm/${productId}`, { method: 'POST' });
    load();
  }

  async function reject(sourceListingId: string, productId: string) {
    await apiFetch(`/admin/siblings/${sourceListingId}/reject/${productId}`, { method: 'POST' });
    load();
  }

  return (
    <div>
      <h1 className="mb-1 text-xl font-semibold text-leaf-900 dark:text-white">{d.title}</h1>
      <p className="mb-4 text-sm text-leaf-900/50 dark:text-white/50">{d.intro}</p>

      {!items ? (
        <p className="text-leaf-900/50 dark:text-white/50">{dict.common.loading}</p>
      ) : items.length === 0 ? (
        <p className="text-leaf-900/50 dark:text-white/50">{d.empty}</p>
      ) : (
        <div className="flex flex-col gap-3">
          {items.map((c) => (
            <div key={`${c.sourceListingId}-${c.productId}`} className="rounded-xl border border-leaf-800/10 p-4 dark:border-white/10">
              <div className="mb-2 flex items-center justify-between text-xs text-leaf-900/50 dark:text-white/50">
                <span>{c.vendorName}</span>
                <span>
                  {d.confidence} {(c.confidence * 100).toFixed(0)}%
                </span>
              </div>
              <div className="mb-3 grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-leaf-900/40 dark:text-white/40">{d.rawListing}</p>
                  <p className="font-medium text-leaf-900 dark:text-white">{c.rawTitle}</p>
                </div>
                <div>
                  <p className="text-leaf-900/40 dark:text-white/40">{d.catalogCandidate}</p>
                  <p className="font-medium text-leaf-900 dark:text-white">{c.productName}</p>
                </div>
              </div>

              {/* За прямим запитом користувача — "модифицировать
                  логику siblings" — превью впливу прив'язки на
                  собівартість/публічну ціну ДО прийняття рішення. */}
              <div className="mb-3 rounded-lg bg-leaf-50 p-3 text-xs dark:bg-white/5">
                <p className="mb-1 font-medium text-leaf-900/70 dark:text-white/70">{d.priceImpactTitle}</p>
                <div className="flex gap-4">
                  <span className="text-leaf-900/50 dark:text-white/50">
                    {d.costLabel} ${c.priceImpact.currentCostUsd?.toFixed(2) ?? '—'} → $
                    {c.priceImpact.projectedCostUsd?.toFixed(2) ?? '—'}
                  </span>
                  <span className="text-leaf-900/50 dark:text-white/50">
                    {d.publicLabel} ${c.priceImpact.currentPublicUsd?.toFixed(2) ?? '—'} → $
                    {c.priceImpact.projectedPublicUsd?.toFixed(2) ?? '—'}
                  </span>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => confirmMatch(c.sourceListingId, c.productId)}
                  className="rounded-full bg-green-600 px-4 py-1.5 text-xs font-medium text-white"
                >
                  {d.confirmButton}
                </button>
                <button
                  onClick={() => reject(c.sourceListingId, c.productId)}
                  className="rounded-full border border-leaf-800/20 px-4 py-1.5 text-xs font-medium text-leaf-900 dark:border-white/20 dark:text-white"
                >
                  {d.rejectButton}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
