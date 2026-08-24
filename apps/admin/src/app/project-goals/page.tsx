'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '../../lib/api';
import type { ProjectGoal } from '../../lib/api';
import { useAdminLocale } from '../../lib/locale-context';

const TOPOLOGIES = ['OFF_GRID', 'BACKUP_UPS', 'GRID_TIE', 'COMMERCIAL'];
const EMPTY = { key: '', label: '', description: '', defaultTopology: '' };

// ТЗ п.31.1.1/31.1.2 — довідник цілей проєкту калькулятора, не хардкод.
// AI-кандидати створюються з isActive:false — чекають ручного review.
export default function ProjectGoalsPage() {
  const [items, setItems] = useState<ProjectGoal[] | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [brief, setBrief] = useState('');
  const [suggesting, setSuggesting] = useState(false);
  const [filter, setFilter] = useState<'all' | 'active' | 'pending'>('all');
  const { dict } = useAdminLocale();
  const d = dict.pages.projectGoals;

  async function load() {
    setItems(await apiFetch<ProjectGoal[]>('/admin/project-goals'));
  }

  useEffect(() => {
    load();
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!form.key || !form.label) return;
    await apiFetch('/admin/project-goals', {
      method: 'POST',
      body: JSON.stringify({ ...form, defaultTopology: form.defaultTopology || undefined }),
    });
    setForm(EMPTY);
    load();
  }

  async function handleSuggest() {
    setSuggesting(true);
    try {
      await apiFetch('/admin/project-goals/suggest-ai', { method: 'POST', body: JSON.stringify({ brief: brief || undefined }) });
      setBrief('');
      load();
    } catch (err) {
      alert(err instanceof Error ? err.message : d.generateError);
    } finally {
      setSuggesting(false);
    }
  }

  async function activate(id: string) {
    await apiFetch(`/admin/project-goals/${id}/activate`, { method: 'POST' });
    load();
  }

  async function reject(id: string) {
    await apiFetch(`/admin/project-goals/${id}/reject`, { method: 'POST' });
    load();
  }

  async function remove(id: string) {
    if (!confirm(d.confirmDelete)) return;
    await apiFetch(`/admin/project-goals/${id}`, { method: 'DELETE' });
    load();
  }

  const filtered = items?.filter((g) => {
    if (filter === 'active') return g.isActive;
    if (filter === 'pending') return !g.isActive && g.generatedBy === 'ai';
    return true;
  });

  return (
    <div>
      <h1 className="mb-1 text-xl font-semibold text-leaf-900 dark:text-white">{d.title}</h1>
      <p className="mb-6 text-sm text-leaf-900/50 dark:text-white/50">{d.intro}</p>

      <div className="mb-6 rounded-xl border border-dashed border-leaf-800/20 p-4 dark:border-white/20">
        <h2 className="mb-2 font-medium text-leaf-900 dark:text-white">{d.suggestAiTitle}</h2>
        <div className="flex gap-2">
          <input
            value={brief}
            onChange={(e) => setBrief(e.target.value)}
            placeholder={d.briefPlaceholder}
            className="flex-1 rounded-lg border border-leaf-800/20 px-3 py-2 text-sm dark:border-white/20 dark:bg-leaf-900 dark:text-white"
          />
          <button
            onClick={handleSuggest}
            disabled={suggesting}
            className="rounded-full bg-sun-500 px-4 py-2 text-sm font-medium text-leaf-900 disabled:opacity-50"
          >
            {suggesting ? '...' : d.suggestViaAi}
          </button>
        </div>
      </div>

      <div className="mb-3 flex gap-2">
        {(['all', 'active', 'pending'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-full px-3 py-1 text-xs font-medium ${filter === f ? 'bg-sun-500 text-leaf-900' : 'border border-leaf-800/20 text-leaf-900/60 dark:border-white/20 dark:text-white/60'}`}
          >
            {f === 'all' ? d.filterAll : f === 'active' ? d.filterActive : d.filterPending}
          </button>
        ))}
      </div>

      {!filtered ? (
        <p className="text-leaf-900/50 dark:text-white/50">{dict.common.loading}</p>
      ) : (
        <div className="mb-8 flex flex-col gap-3">
          {filtered.map((g) => (
            <div key={g.id} className={`rounded-xl border p-4 ${g.isActive ? 'border-leaf-800/10 dark:border-white/10' : 'border-orange-300 bg-orange-50 dark:border-orange-800 dark:bg-orange-950'}`}>
              <div className="mb-1 flex items-center justify-between">
                <p className="font-medium text-leaf-900 dark:text-white">{g.label}</p>
                <div className="flex items-center gap-2 text-xs">
                  {g.generatedBy === 'ai' && <span className="rounded-full bg-leaf-800/10 px-2 py-0.5 dark:bg-white/10 dark:text-white">{d.aiBadge}</span>}
                  <span className={g.isActive ? 'text-green-700 dark:text-green-400' : 'text-orange-700 dark:text-orange-400'}>{g.isActive ? d.active : d.draft}</span>
                </div>
              </div>
              <p className="mb-1 font-mono text-xs text-leaf-900/40 dark:text-white/40">
                {g.key} · {g.defaultTopology ?? d.noTopologyImpact}
              </p>
              {g.description && <p className="mb-2 whitespace-pre-line text-sm text-leaf-900/70 dark:text-white/70">{g.description}</p>}
              <div className="flex gap-2">
                {!g.isActive && (
                  <>
                    <button onClick={() => activate(g.id)} className="text-xs text-green-700 underline dark:text-green-400">
                      {d.activate}
                    </button>
                    <button onClick={() => reject(g.id)} className="text-xs text-orange-700 underline dark:text-orange-400">
                      {d.reject}
                    </button>
                  </>
                )}
                <button onClick={() => remove(g.id)} className="text-xs text-red-600 underline dark:text-red-400">
                  {dict.common.delete}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <form onSubmit={handleCreate} className="flex max-w-md flex-col gap-3">
        <h2 className="font-medium text-leaf-900 dark:text-white">{d.addManuallyTitle}</h2>
        <input
          placeholder={d.keyPlaceholder}
          value={form.key}
          onChange={(e) => setForm({ ...form, key: e.target.value.toUpperCase() })}
          className="rounded-lg border border-leaf-800/20 px-3 py-2 text-sm dark:border-white/20 dark:bg-leaf-900 dark:text-white"
        />
        <input
          placeholder={d.labelPlaceholder}
          value={form.label}
          onChange={(e) => setForm({ ...form, label: e.target.value })}
          className="rounded-lg border border-leaf-800/20 px-3 py-2 text-sm dark:border-white/20 dark:bg-leaf-900 dark:text-white"
        />
        <textarea
          placeholder={d.descriptionPlaceholder}
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          rows={2}
          className="rounded-lg border border-leaf-800/20 px-3 py-2 text-sm dark:border-white/20 dark:bg-leaf-900 dark:text-white"
        />
        <select
          value={form.defaultTopology}
          onChange={(e) => setForm({ ...form, defaultTopology: e.target.value })}
          className="rounded-lg border border-leaf-800/20 px-3 py-2 text-sm dark:border-white/20 dark:bg-leaf-900 dark:text-white"
        >
          <option value="">{d.noTopologySelect}</option>
          {TOPOLOGIES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <button type="submit" className="w-fit rounded-full bg-sun-500 px-5 py-2 text-sm font-medium text-leaf-900">
          {dict.pages.offices.add}
        </button>
      </form>
    </div>
  );
}
