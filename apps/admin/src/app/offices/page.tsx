'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '../../lib/api';
import type { Office } from '../../lib/api';
import { useAdminLocale } from '../../lib/locale-context';

const EMPTY = { city: '', address: '', phone: '', email: '', workHours: '' };

export default function OfficesPage() {
  const [items, setItems] = useState<Office[] | null>(null);
  const [form, setForm] = useState(EMPTY);
  const { dict } = useAdminLocale();
  const d = dict.pages.offices;
  const FIELD_LABEL: Record<keyof typeof EMPTY, string> = {
    city: d.fieldCity,
    address: d.fieldAddress,
    phone: d.fieldPhone,
    email: d.fieldEmail,
    workHours: d.fieldWorkHours,
  };

  async function load() {
    setItems(await apiFetch<Office[]>('/offices'));
  }

  useEffect(() => {
    load();
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!form.city || !form.address) return;
    await apiFetch('/offices', { method: 'POST', body: JSON.stringify(form) });
    setForm(EMPTY);
    load();
  }

  async function handleDelete(id: string) {
    if (!confirm(d.confirmDelete)) return;
    await apiFetch(`/offices/${id}`, { method: 'DELETE' });
    load();
  }

  return (
    <div>
      <h1 className="mb-4 text-xl font-semibold text-leaf-900 dark:text-white">{d.title}</h1>

      {!items ? (
        <p className="text-leaf-900/50 dark:text-white/50">{dict.common.loading}</p>
      ) : (
        <table className="mb-8 w-full text-sm">
          <thead>
            <tr className="border-b border-leaf-800/10 text-left text-leaf-900/50 dark:border-white/10 dark:text-white/50">
              <th className="py-2">{d.colCity}</th>
              <th>{d.colAddress}</th>
              <th>{d.colPhone}</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {items.map((o) => (
              <tr key={o.id} className="border-b border-leaf-800/5 dark:border-white/5">
                <td className="py-2 text-leaf-900 dark:text-white">{o.city}</td>
                <td className="text-leaf-900 dark:text-white">{o.address}</td>
                <td className="text-leaf-900 dark:text-white">{o.phone}</td>
                <td className="text-right">
                  <button onClick={() => handleDelete(o.id)} className="text-red-600 underline dark:text-red-400">
                    {dict.common.delete}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <form onSubmit={handleCreate} className="flex max-w-md flex-col gap-3">
        <h2 className="font-medium text-leaf-900 dark:text-white">{d.addOffice}</h2>
        {(['city', 'address', 'phone', 'email', 'workHours'] as const).map((field) => (
          <input
            key={field}
            placeholder={FIELD_LABEL[field]}
            value={form[field]}
            onChange={(e) => setForm({ ...form, [field]: e.target.value })}
            className="rounded-lg border border-leaf-800/20 px-3 py-2 text-sm dark:border-white/20 dark:bg-leaf-900 dark:text-white"
          />
        ))}
        <button type="submit" className="w-fit rounded-full bg-sun-500 px-5 py-2 text-sm font-medium text-leaf-900">
          {d.add}
        </button>
      </form>
    </div>
  );
}
