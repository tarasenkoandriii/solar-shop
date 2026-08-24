'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '../../../lib/api';
import type { Order } from '../../../lib/api';
import { useAdminLocale } from '../../../lib/locale-context';

const STATUS_FLOW: Order['status'][] = ['NEW', 'INVOICED', 'PAID', 'SHIPPED', 'CANCELLED'];

export default function OrderDetailPage({ params }: { params: { id: string } }) {
  const [order, setOrder] = useState<Order | null>(null);
  const [busy, setBusy] = useState(false);
  const { dict } = useAdminLocale();
  const d = dict.pages.orderDetail;
  const STATUS_LABEL: Record<Order['status'], string> = {
    NEW: dict.orderStatus.new,
    INVOICED: dict.orderStatus.invoiced,
    PAID: dict.orderStatus.paid,
    SHIPPED: dict.orderStatus.shipped,
    CANCELLED: dict.orderStatus.cancelled,
  };

  async function load() {
    setOrder(await apiFetch<Order>(`/admin/orders/${params.id}`));
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  async function runAction(action: () => Promise<unknown>) {
    setBusy(true);
    try {
      await action();
      await load();
    } catch (err) {
      alert(err instanceof Error ? err.message : d.genericError);
    } finally {
      setBusy(false);
    }
  }

  if (!order) return <p className="text-leaf-900/50 dark:text-white/50">{dict.common.loading}</p>;

  return (
    <div className="max-w-2xl">
      <h1 className="mb-1 text-xl font-semibold text-leaf-900 dark:text-white">#{order.id.slice(-8).toUpperCase()}</h1>
      <p className="mb-6 text-sm text-leaf-900/50 dark:text-white/50">
        {order.contactName}, {order.contactPhone}
      </p>

      <div className="mb-6 rounded-xl border border-leaf-800/10 p-4 dark:border-white/10">
        <p className="mb-2 text-sm font-medium text-leaf-900 dark:text-white">{d.statusTitle}</p>
        <div className="flex flex-wrap gap-2">
          {STATUS_FLOW.map((s) => (
            <button
              key={s}
              disabled={busy || s === order.status}
              onClick={() => runAction(() => apiFetch(`/admin/orders/${order.id}/status`, { method: 'PUT', body: JSON.stringify({ status: s }) }))}
              className={`rounded-full px-3 py-1.5 text-xs font-medium ${
                s === order.status
                  ? 'bg-sun-500 text-leaf-900'
                  : 'border border-leaf-800/20 text-leaf-900/70 hover:bg-leaf-50 dark:border-white/20 dark:text-white/70 dark:hover:bg-white/5'
              }`}
            >
              {STATUS_LABEL[s]}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-6 flex flex-col gap-2">
        {order.items.map((item) => (
          <div key={item.id} className="flex justify-between rounded-lg border border-leaf-800/10 p-3 text-sm dark:border-white/10">
            <span className="text-leaf-900 dark:text-white">
              {item.product.articleNumber} · {item.product.name} × {item.quantity}
            </span>
            <span className="font-medium text-leaf-900 dark:text-white">${(Number(item.priceUsd) * item.quantity).toFixed(2)}</span>
          </div>
        ))}
      </div>

      <div className="mb-6 flex justify-between border-t border-leaf-800/10 pt-4 text-lg font-semibold text-leaf-900 dark:border-white/10 dark:text-white">
        <span>{d.totalLabel}</span>
        <span>{Number(order.totalUah).toLocaleString('uk-UA')} ₴</span>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          disabled={busy}
          onClick={() => runAction(() => apiFetch(`/admin/orders/${order.id}/invoice`, { method: 'POST' }))}
          className="rounded-full border border-leaf-800/20 px-4 py-2 text-sm text-leaf-900 dark:border-white/20 dark:text-white"
        >
          {order.invoicePdfUrl ? d.regenerateInvoice : d.generateInvoice}
        </button>
        {order.invoicePdfUrl && (
          <a href={order.invoicePdfUrl} target="_blank" rel="noopener noreferrer" className="rounded-full bg-leaf-800/5 px-4 py-2 text-sm text-leaf-700 underline dark:bg-white/10 dark:text-sun-500">
            {d.openPdf}
          </a>
        )}
        {!order.ttnNumber ? (
          <button
            disabled={busy}
            onClick={() => runAction(() => apiFetch(`/admin/orders/${order.id}/ttn`, { method: 'POST' }))}
            className="rounded-full border border-leaf-800/20 px-4 py-2 text-sm text-leaf-900 dark:border-white/20 dark:text-white"
          >
            {d.createTtn}
          </button>
        ) : (
          <>
            <button
              disabled={busy}
              onClick={() => runAction(() => apiFetch(`/admin/orders/${order.id}/ttn/print`, { method: 'POST' }))}
              className="rounded-full border border-leaf-800/20 px-4 py-2 text-sm text-leaf-900 dark:border-white/20 dark:text-white"
            >
              {d.printLabel} ({order.ttnNumber})
            </button>
            <button
              disabled={busy}
              onClick={() => runAction(() => apiFetch(`/admin/orders/${order.id}/ttn/cancel`, { method: 'POST' }))}
              className="rounded-full border border-red-300 px-4 py-2 text-sm text-red-600 dark:border-red-800 dark:text-red-400"
            >
              {d.cancelTtn}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
