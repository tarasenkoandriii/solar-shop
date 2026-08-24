'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '../../lib/api';
import type { ProjectEstimateDelivery } from '../../lib/api';
import { useAdminLocale } from '../../lib/locale-context';

const CHANNEL_ICON: Record<ProjectEstimateDelivery['channel'], string> = {
  TELEGRAM: '✈️ Telegram',
  EMAIL: '✉️ Email',
  WHATSAPP: '💬 WhatsApp',
  VIBER: '📞 Viber',
};

const STATUS_STYLE: Record<ProjectEstimateDelivery['status'], string> = {
  PENDING: 'bg-leaf-50 text-leaf-900/60 dark:bg-white/10 dark:text-white/60',
  SENT: 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300',
  FAILED: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300',
};

export default function CalculatorDeliveriesPage() {
  const [items, setItems] = useState<ProjectEstimateDelivery[] | null>(null);
  const [channelFilter, setChannelFilter] = useState<ProjectEstimateDelivery['channel'] | 'ALL'>('ALL');
  const { dict } = useAdminLocale();
  const d = dict.pages.calculatorDeliveries;
  const STATUS_LABEL: Record<ProjectEstimateDelivery['status'], string> = {
    PENDING: d.statusPending,
    SENT: d.statusSent,
    FAILED: d.statusFailed,
  };

  useEffect(() => {
    apiFetch<ProjectEstimateDelivery[]>('/admin/calculator/deliveries').then(setItems);
  }, []);

  const filtered = items?.filter((i) => channelFilter === 'ALL' || i.channel === channelFilter) ?? [];

  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-leaf-900 dark:text-white">{d.title}</h1>
        <select
          value={channelFilter}
          onChange={(e) => setChannelFilter(e.target.value as typeof channelFilter)}
          className="rounded-lg border border-leaf-800/20 px-3 py-1.5 text-sm dark:border-white/20 dark:bg-leaf-900 dark:text-white"
        >
          <option value="ALL">{d.allChannels}</option>
          <option value="TELEGRAM">Telegram</option>
          <option value="EMAIL">Email</option>
          <option value="WHATSAPP">WhatsApp</option>
          <option value="VIBER">Viber</option>
        </select>
      </div>
      <p className="mb-4 text-sm text-leaf-900/50 dark:text-white/50">{d.intro}</p>

      {!items ? (
        <p className="text-leaf-900/50 dark:text-white/50">{dict.common.loading}</p>
      ) : filtered.length === 0 ? (
        <p className="text-leaf-900/50 dark:text-white/50">{d.noRecords}</p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-leaf-800/10 text-left text-leaf-900/50 dark:border-white/10 dark:text-white/50">
              <th className="py-2">{d.colProject}</th>
              <th>{d.colChannel}</th>
              <th>{d.colContact}</th>
              <th>{d.colStatus}</th>
              <th>{d.colSentAt}</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((i) => (
              <tr key={i.id} className="border-b border-leaf-800/5 dark:border-white/5">
                <td className="py-2">
                  <div className="text-leaf-900 dark:text-white">{i.projectEstimate.name}</div>
                  <div className="text-xs text-leaf-900/40 dark:text-white/40">
                    {i.projectEstimate.city ?? '—'} · ${Number(i.projectEstimate.totalUsd).toFixed(2)}
                  </div>
                </td>
                <td className="text-leaf-900 dark:text-white">{CHANNEL_ICON[i.channel]}</td>
                <td className="font-mono text-xs text-leaf-900 dark:text-white">{i.contactValue}</td>
                <td>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLE[i.status]}`}>
                    {STATUS_LABEL[i.status]}
                  </span>
                  {i.status === 'FAILED' && i.errorMessage && (
                    <p className="mt-1 max-w-xs text-xs text-red-600 dark:text-red-400">{i.errorMessage}</p>
                  )}
                </td>
                <td className="text-leaf-900/60 dark:text-white/60">
                  {i.sentAt ? new Date(i.sentAt).toLocaleString('uk-UA') : new Date(i.createdAt).toLocaleString('uk-UA')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
