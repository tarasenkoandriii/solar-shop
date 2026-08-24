'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiFetch } from '../../lib/api';
import type { Order, OrderProfitRow, DelegateResult, OrderDelegationRow } from '../../lib/api';
import { useAdminLocale } from '../../lib/locale-context';

// За прямим запитом користувача — "добавить в админку вкладку profit,
// показывать цену товара по второму из самых дешёвых вариантов, и
// считать заказ комплекта по самому дешевому (внутренняя цена) и по
// этому второму варианту (публичная цена)... выводить на вкладке
// profit обе цены и разницу которую мы заработаем, и статус заказа...
// кнопку "делегировать заказы" - все позиции заказа без прибыли
// делегируем другим поставщикам и генерируем отдельно ТТН для кожного
// из них, все с этой страницы profit". + "OrderDelegation не имеет
// пути просмотра... Исправь".
export default function OrdersProfitPage() {
  const [rows, setRows] = useState<OrderProfitRow[] | null>(null);
  const [delegating, setDelegating] = useState(false);
  const [delegateResult, setDelegateResult] = useState<DelegateResult | null>(null);
  const [delegations, setDelegations] = useState<OrderDelegationRow[] | null>(null);
  const { dict } = useAdminLocale();
  const d = dict.pages.ordersProfit;
  const STATUS_LABEL: Record<Order['status'], string> = {
    NEW: dict.orderStatus.new,
    INVOICED: dict.orderStatus.invoiced,
    PAID: dict.orderStatus.paid,
    SHIPPED: dict.orderStatus.shipped,
    CANCELLED: dict.orderStatus.cancelled,
  };
  const TTN_STATUS_LABEL: Record<string, string> = {
    NOT_CREATED: d.ttnStatusNotCreated,
    RESERVED: d.ttnStatusReserved,
    READY_TO_SHIP: d.ttnStatusReady,
    SHIPPED: d.ttnStatusShipped,
    CANCELLED: d.ttnStatusCancelled,
  };

  async function load() {
    setRows(await apiFetch<OrderProfitRow[]>('/admin/orders-profit'));
  }

  async function loadDelegations() {
    setDelegations(await apiFetch<OrderDelegationRow[]>('/admin/orders-profit/delegations'));
  }

  useEffect(() => {
    load();
    loadDelegations();
  }, []);

  async function handleDelegate() {
    if (!confirm(d.confirmDelegate)) return;
    setDelegating(true);
    setDelegateResult(null);
    try {
      const result = await apiFetch<DelegateResult>('/admin/orders-profit/delegate', { method: 'POST' });
      setDelegateResult(result);
      await load();
      await loadDelegations();
    } catch (err) {
      alert(err instanceof Error ? err.message : d.delegateError);
    } finally {
      setDelegating(false);
    }
  }

  const totals = rows?.reduce(
    (acc, r) => ({ cost: acc.cost + r.costUsd, publicSum: acc.publicSum + r.publicUsd, profit: acc.profit + r.profitUsd }),
    { cost: 0, publicSum: 0, profit: 0 },
  );

  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-leaf-900 dark:text-white">{d.title}</h1>
        <button
          onClick={handleDelegate}
          disabled={delegating}
          className="rounded-full bg-sun-500 px-4 py-2 text-sm font-medium text-leaf-900 disabled:opacity-50"
        >
          {delegating ? d.delegating : d.delegateButton}
        </button>
      </div>
      <p className="mb-6 text-sm text-leaf-900/50 dark:text-white/50">{d.intro}</p>

      {delegateResult && (
        <div className="mb-6 rounded-xl border border-leaf-800/10 bg-leaf-50 p-4 text-sm dark:border-white/10 dark:bg-white/5">
          <p className="font-medium text-leaf-900 dark:text-white">{d.resultTitle}</p>
          <p className="text-leaf-900/70 dark:text-white/70">
            {d.ordersScannedLabel} {delegateResult.ordersScanned} · {d.itemsDelegatedLabel} {delegateResult.itemsDelegated} ·{' '}
            {d.noAlternativeLabel} {delegateResult.itemsWithNoAlternative} · {d.groupsCreatedLabel} {delegateResult.delegationsCreated}
            · {d.ttnCreatedLabel} {delegateResult.ttnCreated} · {d.ttnFailedLabel} {delegateResult.ttnFailed}
          </p>
          {delegateResult.itemsWithNoAlternative > 0 && (
            <p className="mt-1 text-orange-700 dark:text-orange-400">
              ⚠ {delegateResult.itemsWithNoAlternative} {d.noAlternativeWarning}
            </p>
          )}
        </div>
      )}

      {!rows ? (
        <p className="text-leaf-900/50 dark:text-white/50">{dict.common.loading}</p>
      ) : (
        <>
          {totals && (
            <div className="mb-4 flex gap-6 rounded-xl border border-leaf-800/10 bg-white p-4 text-sm dark:border-white/10 dark:bg-white/5">
              <p>
                <span className="text-leaf-900/50 dark:text-white/50">{d.costLabel}</span>{' '}
                <span className="font-medium text-leaf-900 dark:text-white">${totals.cost.toFixed(2)}</span>
              </p>
              <p>
                <span className="text-leaf-900/50 dark:text-white/50">{d.publicLabel}</span>{' '}
                <span className="font-medium text-leaf-900 dark:text-white">${totals.publicSum.toFixed(2)}</span>
              </p>
              <p>
                <span className="text-leaf-900/50 dark:text-white/50">{d.profitLabel}</span>{' '}
                <span className="font-semibold text-green-700 dark:text-green-400">${totals.profit.toFixed(2)}</span>
              </p>
            </div>
          )}

          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-leaf-800/10 text-left text-leaf-900/50 dark:border-white/10 dark:text-white/50">
                <th className="py-2">{d.colOrder}</th>
                <th>{d.colStatus}</th>
                <th>{d.colCost}</th>
                <th>{d.colPublic}</th>
                <th>{d.colProfit}</th>
                <th>{d.colDate}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.orderId} className="border-b border-leaf-800/5 dark:border-white/5">
                  <td className="py-2">
                    <Link href={`/orders/${r.orderId}`} className="text-leaf-700 underline dark:text-sun-500">
                      {r.contactName}
                    </Link>
                    {r.hasNoProfitItems && <span className="ml-2 rounded-full bg-orange-50 px-2 py-0.5 text-xs text-orange-700 dark:bg-orange-950 dark:text-orange-300">{d.noProfitBadge}</span>}
                    {r.itemsWithUnknownCost > 0 && (
                      <span className="ml-2 rounded-full bg-leaf-800/5 px-2 py-0.5 text-xs text-leaf-900/50 dark:bg-white/10 dark:text-white/50">
                        {r.itemsWithUnknownCost} {d.unknownSnapshotBadge}
                      </span>
                    )}
                  </td>
                  <td className="text-leaf-900/60 dark:text-white/60">{STATUS_LABEL[r.status as Order['status']] ?? r.status}</td>
                  <td className="text-leaf-900/70 dark:text-white/70">${r.costUsd.toFixed(2)}</td>
                  <td className="text-leaf-900/70 dark:text-white/70">${r.publicUsd.toFixed(2)}</td>
                  <td className={`font-medium ${r.profitUsd > 0 ? 'text-green-700 dark:text-green-400' : 'text-leaf-900/40 dark:text-white/40'}`}>${r.profitUsd.toFixed(2)}</td>
                  <td className="text-leaf-900/40 dark:text-white/40">{new Date(r.createdAt).toLocaleDateString('uk-UA')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      {/* За прямим запитом користувача — "OrderDelegation не имеет
          пути просмотра... Исправь". */}
      <div className="mt-10">
        <h2 className="mb-3 font-medium text-leaf-900 dark:text-white">{d.delegationsTitle}</h2>
        {!delegations ? (
          <p className="text-sm text-leaf-900/50 dark:text-white/50">{dict.common.loading}</p>
        ) : delegations.length === 0 ? (
          <p className="text-sm text-leaf-900/50 dark:text-white/50">{d.noDelegations}</p>
        ) : (
          <div className="flex flex-col gap-3">
            {delegations.map((dl) => (
              <div key={dl.id} className="rounded-xl border border-leaf-800/10 p-4 text-sm dark:border-white/10">
                <div className="mb-1 flex items-center justify-between">
                  <p className="font-medium text-leaf-900 dark:text-white">
                    <Link href={`/orders/${dl.order.id}`} className="text-leaf-700 underline dark:text-sun-500">
                      {dl.order.contactName}
                    </Link>
                    {' → '}
                    {dl.vendor.name}
                  </p>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      dl.ttnStatus === 'NOT_CREATED' ? 'bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300' : 'bg-leaf-800/5 text-leaf-900/60 dark:bg-white/10 dark:text-white/60'
                    }`}
                  >
                    {TTN_STATUS_LABEL[dl.ttnStatus] ?? dl.ttnStatus}
                  </span>
                </div>
                <p className="mb-1 text-leaf-900/60 dark:text-white/60">
                  {dl.items.map((i) => `${i.product.articleNumber} · ${i.product.name} × ${i.quantity}`).join(', ')}
                </p>
                <div className="flex items-center gap-3 text-xs text-leaf-900/40 dark:text-white/40">
                  <span>{new Date(dl.createdAt).toLocaleDateString('uk-UA')}</span>
                  {dl.ttnNumber && <span>{d.ttnLabel} {dl.ttnNumber}</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
