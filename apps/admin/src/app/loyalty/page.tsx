'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '../../lib/api';
import type { LoyaltyTier } from '../../lib/api';
import { useAdminLocale } from '../../lib/locale-context';

const EMPTY = { minSpendUah: '', discountPercent: '' };

export default function LoyaltyPage() {
  const [tiers, setTiers] = useState<LoyaltyTier[] | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState<string | null>(null);
  const { dict } = useAdminLocale();
  const d = dict.pages.loyalty;

  async function load() {
    setTiers(await apiFetch<LoyaltyTier[]>('/loyalty/tiers'));
  }

  useEffect(() => {
    load();
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await apiFetch('/admin/loyalty/tiers', {
        method: 'POST',
        body: JSON.stringify({ minSpendUah: Number(form.minSpendUah), discountPercent: Number(form.discountPercent) }),
      });
      setForm(EMPTY);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : d.genericError);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm(d.confirmDelete)) return;
    await apiFetch(`/admin/loyalty/tiers/${id}`, { method: 'DELETE' });
    load();
  }

  return (
    <div>
      <h1 className="mb-1 text-xl font-semibold text-leaf-900 dark:text-white">{d.title}</h1>
      <p className="mb-6 text-sm text-leaf-900/50 dark:text-white/50">{d.intro}</p>

      {!tiers ? (
        <p className="text-leaf-900/50 dark:text-white/50">{dict.common.loading}</p>
      ) : (
        <table className="mb-8 w-full text-sm">
          <thead>
            <tr className="border-b border-leaf-800/10 text-left text-leaf-900/50 dark:border-white/10 dark:text-white/50">
              <th className="py-2">{d.colThreshold}</th>
              <th>{d.colDiscount}</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {tiers.map((t) => (
              <tr key={t.id} className="border-b border-leaf-800/5 dark:border-white/5">
                <td className="py-2 text-leaf-900 dark:text-white">{Number(t.minSpendUah).toLocaleString('uk-UA')}</td>
                <td className="text-leaf-900 dark:text-white">{t.discountPercent}%</td>
                <td className="text-right">
                  <button onClick={() => handleDelete(t.id)} className="text-red-600 underline dark:text-red-400">
                    {dict.common.delete}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {error && <p className="mb-3 rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">{error}</p>}

      <form onSubmit={handleCreate} className="flex max-w-sm flex-col gap-3">
        <h2 className="font-medium text-leaf-900 dark:text-white">{d.addTitle}</h2>
        <input
          type="number"
          placeholder={d.fieldThreshold}
          value={form.minSpendUah}
          onChange={(e) => setForm({ ...form, minSpendUah: e.target.value })}
          className="rounded-lg border border-leaf-800/20 px-3 py-2 text-sm dark:border-white/20 dark:bg-leaf-900 dark:text-white"
        />
        <input
          type="number"
          placeholder={d.fieldDiscount}
          value={form.discountPercent}
          onChange={(e) => setForm({ ...form, discountPercent: e.target.value })}
          className="rounded-lg border border-leaf-800/20 px-3 py-2 text-sm dark:border-white/20 dark:bg-leaf-900 dark:text-white"
        />
        <button type="submit" className="w-fit rounded-full bg-sun-500 px-5 py-2 text-sm font-medium text-leaf-900">
          {dict.pages.offices.add}
        </button>
      </form>
    </div>
  );
}
