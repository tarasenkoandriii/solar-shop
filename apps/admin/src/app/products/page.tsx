'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { apiFetch } from '../../lib/api';
import type { Product, PendingProductReview } from '../../lib/api';
import { useAdminLocale } from '../../lib/locale-context';

export default function ProductsListPage() {
  const [products, setProducts] = useState<Product[] | null>(null);
  const [filter, setFilter] = useState<'ALL' | Product['status']>('DRAFT');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [bulkBusy, setBulkBusy] = useState(false);
  const { dict } = useAdminLocale();
  const d = dict.pages.productsList;
  const STATUS_LABEL: Record<Product['status'], string> = {
    DRAFT: d.statusDraft,
    PUBLISHED: d.statusPublished,
    ARCHIVED: d.statusArchived,
  };

  // За прямим запитом користувача — "отзывы подробно от уже купивших
  // этот товар". Той самий патерн модерації, що вже для програм
  // кредитування (financing-programs/page.tsx) — числа публікуються
  // одразу, тут модерується лише вільний текст.
  const [pendingReviews, setPendingReviews] = useState<PendingProductReview[] | null>(null);

  async function loadPendingReviews() {
    setPendingReviews(await apiFetch<PendingProductReview[]>('/products/admin/reviews/pending'));
  }

  async function approveReviewText(id: string) {
    await apiFetch(`/products/admin/reviews/${id}/approve-text`, { method: 'POST' });
    loadPendingReviews();
  }

  async function rejectReviewText(id: string) {
    await apiFetch(`/products/admin/reviews/${id}/reject-text`, { method: 'POST' });
    loadPendingReviews();
  }

  async function load() {
    const data = await apiFetch<Product[]>('/products/admin/all');
    setProducts(data);
  }

  useEffect(() => {
    load();
    loadPendingReviews();
  }, []);

  async function handleDelete(id: string) {
    if (!confirm(d.confirmDeleteProduct)) return;
    await apiFetch(`/products/admin/${id}`, { method: 'DELETE' });
    load();
  }

  async function publish(id: string) {
    setBusyId(id);
    try {
      await apiFetch(`/products/admin/${id}`, { method: 'PUT', body: JSON.stringify({ status: 'PUBLISHED' }) });
      load();
    } catch (err) {
      alert(err instanceof Error ? err.message : d.genericError);
    } finally {
      setBusyId(null);
    }
  }

  async function archive(id: string) {
    setBusyId(id);
    try {
      await apiFetch(`/products/admin/${id}`, { method: 'PUT', body: JSON.stringify({ status: 'ARCHIVED' }) });
      load();
    } catch (err) {
      alert(err instanceof Error ? err.message : d.genericError);
    } finally {
      setBusyId(null);
    }
  }

  const draftsWithPrice = useMemo(
    () => (products ?? []).filter((p) => p.status === 'DRAFT' && p.cachedPriceUsd !== null),
    [products],
  );

  async function bulkPublishPriced() {
    if (draftsWithPrice.length === 0) return;
    if (!confirm(d.confirmBulkPublish.replace('{n}', String(draftsWithPrice.length)))) return;
    setBulkBusy(true);
    try {
      // Послідовно, не Promise.all — щоб не влаштовувати burst із десятків
      // одночасних PUT-запитів на бекенд заради простоти реалізації.
      for (const p of draftsWithPrice) {
        await apiFetch(`/products/admin/${p.id}`, { method: 'PUT', body: JSON.stringify({ status: 'PUBLISHED' }) });
      }
      load();
    } catch (err) {
      alert(err instanceof Error ? err.message : d.bulkPublishError);
    } finally {
      setBulkBusy(false);
    }
  }

  const filtered = (products ?? []).filter((p) => filter === 'ALL' || p.status === filter);

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-leaf-900 dark:text-white">{d.title}</h1>
        <Link href="/products/new" className="rounded-full bg-sun-500 px-4 py-2 text-sm font-medium text-leaf-900">
          {d.addProduct}
        </Link>
      </div>

      {/* За прямим запитом користувача — "отзывы подробно от уже
          купивших этот товар". Той самий патерн, що вже для програм
          кредитування — окрема черга модерації лише вільного тексту
          відгуку. */}
      {pendingReviews && pendingReviews.length > 0 && (
        <div className="mb-6 rounded-xl border border-orange-300 bg-orange-50 p-4 dark:border-orange-800 dark:bg-orange-950">
          <h2 className="mb-3 font-medium text-leaf-900 dark:text-white">
            {d.pendingReviewsTitle} ({pendingReviews.length})
          </h2>
          <div className="flex flex-col gap-3">
            {pendingReviews.map((r) => (
              <div key={r.id} className="rounded-lg bg-white p-3 dark:bg-leaf-900">
                <div className="mb-1 flex items-center justify-between">
                  <p className="text-sm font-medium text-leaf-900 dark:text-white">
                    {r.product.name} — ☀ {r.reliabilityScore}/10
                  </p>
                  <p className="text-xs text-leaf-900/40 dark:text-white/40">{new Date(r.createdAt).toLocaleDateString('uk-UA')}</p>
                </div>
                <p className="mb-1 text-xs text-leaf-900/50 dark:text-white/50">
                  {d.unitsBoughtLabel} {r.quantityAtReview} {d.unitsSuffix} — {r.daysSincePurchaseAtReview} {d.daysBeforeReviewSuffix}
                </p>
                <p className="mb-3 text-sm text-leaf-900/80 dark:text-white/80">«{r.reviewText}»</p>
                <div className="flex gap-2">
                  <button onClick={() => approveReviewText(r.id)} className="text-xs text-green-700 underline dark:text-green-400">
                    {d.approveText}
                  </button>
                  <button onClick={() => rejectReviewText(r.id)} className="text-xs text-red-600 underline dark:text-red-400">
                    {d.rejectText}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mb-4 flex flex-wrap items-center gap-2">
        {(['DRAFT', 'PUBLISHED', 'ARCHIVED', 'ALL'] as const).map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`rounded-full px-3 py-1.5 text-xs font-medium ${
              filter === s ? 'bg-leaf-900 text-white' : 'bg-leaf-800/5 text-leaf-900/60 hover:bg-leaf-800/10 dark:bg-white/10 dark:text-white/60 dark:hover:bg-white/20'
            }`}
          >
            {s === 'ALL' ? d.filterAll : STATUS_LABEL[s]}
          </button>
        ))}

        {draftsWithPrice.length > 0 && (
          <button
            onClick={bulkPublishPriced}
            disabled={bulkBusy}
            className="ml-auto rounded-full bg-sun-500 px-4 py-1.5 text-xs font-medium text-leaf-900 disabled:opacity-50"
          >
            {bulkBusy ? '...' : `${d.bulkPublish} (${draftsWithPrice.length})`}
          </button>
        )}
      </div>

      {!products ? (
        <p className="text-leaf-900/50 dark:text-white/50">{dict.common.loading}</p>
      ) : filtered.length === 0 ? (
        <p className="text-leaf-900/50 dark:text-white/50">{d.noProductsInFilter}</p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-leaf-800/10 text-left text-leaf-900/50 dark:border-white/10 dark:text-white/50">
              <th className="py-2">{d.colArticle}</th>
              <th>{d.colName}</th>
              <th>{d.colCategory}</th>
              <th title={d.colCostPriceTitle}>{d.colCostPrice}</th>
              <th>{d.colPrice}</th>
              <th>{d.colStatus}</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {filtered.map((p) => (
              <tr key={p.id} className="border-b border-leaf-800/5 dark:border-white/5">
                <td className="py-2 text-leaf-900 dark:text-white">{p.articleNumber}</td>
                <td className="text-leaf-900 dark:text-white">
                  {p.name}
                  {p.isSeedData && (
                    <span
                      title={d.seedBadgeTitle}
                      className="ml-2 rounded-full bg-leaf-800/10 px-2 py-0.5 text-xs font-medium text-leaf-800/60 dark:bg-white/10 dark:text-white/60"
                    >
                      {d.seedBadge}
                    </span>
                  )}
                </td>
                <td className="text-leaf-900 dark:text-white">{p.category}</td>
                <td className="text-leaf-900/50 dark:text-white/50">{p.cachedCostPriceUsd !== null ? `$${p.cachedCostPriceUsd}` : '—'}</td>
                <td className="text-leaf-900 dark:text-white">{p.cachedPriceUsd !== null ? `$${p.cachedPriceUsd}` : d.noListingsPrice}</td>
                <td>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      p.status === 'PUBLISHED'
                        ? 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300'
                        : p.status === 'DRAFT'
                          ? 'bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300'
                          : 'bg-leaf-800/10 text-leaf-800/50 dark:bg-white/10 dark:text-white/50'
                    }`}
                  >
                    {STATUS_LABEL[p.status]}
                  </span>
                </td>
                <td className="space-x-3 py-2 text-right">
                  {p.status !== 'PUBLISHED' && (
                    <button onClick={() => publish(p.id)} disabled={busyId === p.id} className="text-green-700 underline disabled:opacity-50 dark:text-green-400">
                      {d.publish}
                    </button>
                  )}
                  {p.status !== 'ARCHIVED' && (
                    <button onClick={() => archive(p.id)} disabled={busyId === p.id} className="text-leaf-900/50 underline disabled:opacity-50 dark:text-white/50">
                      {d.archive}
                    </button>
                  )}
                  <Link href={`/products/${p.id}`} className="text-leaf-700 underline dark:text-sun-500">
                    {dict.common.edit}
                  </Link>
                  <button onClick={() => handleDelete(p.id)} className="text-red-600 underline dark:text-red-400">
                    {dict.common.delete}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
