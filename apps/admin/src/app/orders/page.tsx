'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiFetch } from '../../lib/api';
import type { Order } from '../../lib/api';
import { useAdminLocale } from '../../lib/locale-context';

export default function OrdersPage() {
  const [items, setItems] = useState<Order[] | null>(null);
  const [filter, setFilter] = useState<Order['status'] | 'ALL'>('ALL');
  const { dict } = useAdminLocale();
  const d = dict.pages.orders;
  const STATUS_LABEL: Record<Order['status'], string> = {
    NEW: dict.orderStatus.new,
    INVOICED: dict.orderStatus.invoiced,
    PAID: dict.orderStatus.paid,
    SHIPPED: dict.orderStatus.shipped,
    CANCELLED: dict.orderStatus.cancelled,
  };

  async function load() {
    const qs = filter === 'ALL' ? '' : `?status=${filter}`;
    setItems(await apiFetch<Order[]>(`/admin/orders${qs}`));
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-leaf-900 dark:text-white">{d.title}</h1>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value as typeof filter)}
          className="rounded-lg border border-leaf-800/20 px-3 py-1.5 text-sm dark:border-white/20 dark:bg-leaf-900 dark:text-white"
        >
          <option value="ALL">{d.all}</option>
          {Object.entries(STATUS_LABEL).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>

      {!items ? (
        <p className="text-leaf-900/50 dark:text-white/50">{dict.common.loading}</p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-leaf-800/10 text-left text-leaf-900/50 dark:border-white/10 dark:text-white/50">
              <th className="py-2">{d.colNumber}</th>
              <th>{d.colClient}</th>
              <th>{d.colSum}</th>
              <th>{d.colStatus}</th>
              <th>{d.colTtn}</th>
              <th>{d.colDate}</th>
            </tr>
          </thead>
          <tbody>
            {items.map((o) => (
              <tr key={o.id} className="border-b border-leaf-800/5 dark:border-white/5">
                <td className="py-2">
                  <Link href={`/orders/${o.id}`} className="text-leaf-700 underline dark:text-sun-500">
                    #{o.id.slice(-8).toUpperCase()}
                  </Link>
                </td>
                <td className="text-leaf-900 dark:text-white">
                  {o.contactName}, {o.contactPhone}
                </td>
                <td className="text-leaf-900 dark:text-white">{Number(o.totalUah).toLocaleString('uk-UA')} ₴</td>
                <td className="text-leaf-900 dark:text-white">{STATUS_LABEL[o.status]}</td>
                <td className="text-leaf-900/60 dark:text-white/60">{o.ttnNumber ?? '—'}</td>
                <td className="text-leaf-900/50 dark:text-white/50">{new Date(o.createdAt).toLocaleDateString('uk-UA')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
