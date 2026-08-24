'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '../../lib/api';
import type { Manufacturer } from '../../lib/api';
import { useAdminLocale } from '../../lib/locale-context';

// Фаза 1: простой CRUD без загрузки логотипа файлом (logoUrl — просто поле
// URL), полноценный менеджер загрузки — по аналогии с фото товаров, если
// понадобится позже.
export default function ManufacturersPage() {
  const [items, setItems] = useState<Manufacturer[] | null>(null);
  const [form, setForm] = useState({ name: '', region: 'EUROPE', country: '', logoUrl: '' });
  const { dict } = useAdminLocale();
  const d = dict.pages.manufacturers;

  async function load() {
    setItems(await apiFetch<Manufacturer[]>('/manufacturers'));
  }

  useEffect(() => {
    load();
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name || !form.country) return;
    await apiFetch('/manufacturers', { method: 'POST', body: JSON.stringify(form) });
    setForm({ name: '', region: 'EUROPE', country: '', logoUrl: '' });
    load();
  }

  async function handleDelete(id: string) {
    if (!confirm(d.confirmDelete)) return;
    await apiFetch(`/manufacturers/${id}`, { method: 'DELETE' });
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
              <th className="py-2">{d.colName}</th>
              <th>{d.colRegion}</th>
              <th>{d.colCountry}</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {items.map((m) => (
              <tr key={m.id} className="border-b border-leaf-800/5 dark:border-white/5">
                <td className="py-2 text-leaf-900 dark:text-white">{m.name}</td>
                <td className="text-leaf-900 dark:text-white">{m.region}</td>
                <td className="text-leaf-900 dark:text-white">{m.country}</td>
                <td className="text-right">
                  <button onClick={() => handleDelete(m.id)} className="text-red-600 underline dark:text-red-400">
                    {dict.common.delete}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <form onSubmit={handleCreate} className="flex max-w-md flex-col gap-3">
        <h2 className="font-medium text-leaf-900 dark:text-white">{d.addTitle}</h2>
        <input
          placeholder={d.fieldName}
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          className="rounded-lg border border-leaf-800/20 px-3 py-2 text-sm dark:border-white/20 dark:bg-leaf-900 dark:text-white"
        />
        <select
          value={form.region}
          onChange={(e) => setForm({ ...form, region: e.target.value })}
          className="rounded-lg border border-leaf-800/20 px-3 py-2 text-sm dark:border-white/20 dark:bg-leaf-900 dark:text-white"
        >
          <option value="EUROPE">Europe</option>
          <option value="CHINA">China</option>
        </select>
        <input
          placeholder={d.fieldCountry}
          value={form.country}
          onChange={(e) => setForm({ ...form, country: e.target.value })}
          className="rounded-lg border border-leaf-800/20 px-3 py-2 text-sm dark:border-white/20 dark:bg-leaf-900 dark:text-white"
        />
        <button type="submit" className="w-fit rounded-full bg-sun-500 px-5 py-2 text-sm font-medium text-leaf-900">
          {dict.pages.offices.add}
        </button>
      </form>
    </div>
  );
}
