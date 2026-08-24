'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiFetch } from '../../lib/api';
import type { ProjectEstimateAdmin } from '../../lib/api';
import { useAdminLocale } from '../../lib/locale-context';

// ТЗ п.31.8 — розрахунки калькулятора теж теплий лід, навіть без Order
export default function CalculatorEstimatesPage() {
  const [items, setItems] = useState<ProjectEstimateAdmin[] | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const { dict } = useAdminLocale();
  const d = dict.pages.calculatorEstimates;
  const STATUS_LABEL: Record<ProjectEstimateAdmin['status'], string> = {
    DRAFT: d.statusDraft,
    FINALIZED: d.statusFinalized,
    SENT: d.statusSent,
    CONVERTED_TO_ORDER: d.statusConverted,
  };

  async function load() {
    setItems(await apiFetch<ProjectEstimateAdmin[]>('/admin/calculator/estimates'));
  }

  useEffect(() => {
    load();
  }, []);

  async function convertToOrder(id: string) {
    setBusyId(id);
    try {
      await apiFetch(`/admin/calculator/estimates/${id}/convert-to-order`, { method: 'POST' });
      load();
    } catch (err) {
      alert(err instanceof Error ? err.message : d.genericError);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      <h1 className="mb-1 text-xl font-semibold text-leaf-900 dark:text-white">{d.title}</h1>
      <p className="mb-6 text-sm text-leaf-900/50 dark:text-white/50">{d.intro}</p>

      {!items ? (
        <p className="text-leaf-900/50 dark:text-white/50">{dict.common.loading}</p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-leaf-800/10 text-left text-leaf-900/50 dark:border-white/10 dark:text-white/50">
              <th className="py-2">{d.colProject}</th>
              <th>{d.colCity}</th>
              <th>{d.colBudget}</th>
              <th>{d.colGoals}</th>
              <th>{d.colSum}</th>
              <th>{d.colStatus}</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {items.map((e) => (
              <tr key={e.id} className="border-b border-leaf-800/5 dark:border-white/5">
                <td className="py-2 text-leaf-900 dark:text-white">{e.name}</td>
                <td className="text-leaf-900/60 dark:text-white/60">{e.city ?? '—'}</td>
                <td className="text-leaf-900/60 dark:text-white/60">{e.budgetUsd ? `$${e.budgetUsd}` : '—'}</td>
                <td className="max-w-xs truncate text-leaf-900/60 dark:text-white/60">{e.goals.join(', ') || '—'}</td>
                <td className="font-medium text-leaf-900 dark:text-white">${Number(e.totalUsd).toFixed(2)}</td>
                <td className="text-leaf-900 dark:text-white">{STATUS_LABEL[e.status]}</td>
                <td className="text-right">
                  {/* За прямим запитом користувача — "в админке дать
                      возможность просмотра результатов детально на
                      странице в том же дизайне (аккордеон)" */}
                  <Link href={`/calculator-estimates/${e.id}`} className="mr-3 text-leaf-700 underline dark:text-sun-500">
                    {d.view}
                  </Link>
                  {e.status !== 'CONVERTED_TO_ORDER' && e.userId && (
                    <button
                      onClick={() => convertToOrder(e.id)}
                      disabled={busyId === e.id}
                      className="text-leaf-700 underline disabled:opacity-50 dark:text-sun-500"
                    >
                      {busyId === e.id ? '...' : d.toOrder}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
