'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '../../lib/api';
import type { BusinessPlanManifest } from '../../lib/api';
import { useAdminLocale } from '../../lib/locale-context';

const POWER_TAGS = ['SMALL', 'MEDIUM', 'LARGE', 'COMMERCIAL'];

// ТЗ п.31.11.4 — манифести групуються по комбінації тегів (цілі+діапазон
// потужності), всередині кожної — список версій.
export default function BusinessPlanManifestsPage() {
  const [items, setItems] = useState<BusinessPlanManifest[] | null>(null);
  const [goalTags, setGoalTags] = useState('');
  const [powerRangeTag, setPowerRangeTag] = useState('');
  const [brief, setBrief] = useState('');
  const [manualContent, setManualContent] = useState('');
  const [generating, setGenerating] = useState(false);
  const { dict } = useAdminLocale();
  const d = dict.pages.businessPlanManifests;

  async function load() {
    setItems(await apiFetch<BusinessPlanManifest[]>('/admin/business-plan-manifests'));
  }

  useEffect(() => {
    load();
  }, []);

  const groups = new Map<string, BusinessPlanManifest[]>();
  for (const m of items ?? []) {
    const key = `${[...m.goalTags].sort().join(',')}__${m.powerRangeTag ?? 'universal'}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(m);
  }

  async function generateViaAi() {
    setGenerating(true);
    try {
      await apiFetch('/admin/business-plan-manifests/generate-ai', {
        method: 'POST',
        body: JSON.stringify({
          goalTags: goalTags ? goalTags.split(',').map((t) => t.trim()) : [],
          powerRangeTag: powerRangeTag || null,
          brief: brief || undefined,
        }),
      });
      setBrief('');
      load();
    } catch (err) {
      alert(err instanceof Error ? err.message : d.generateError);
    } finally {
      setGenerating(false);
    }
  }

  async function createManual() {
    if (!manualContent.trim()) return;
    await apiFetch('/admin/business-plan-manifests', {
      method: 'POST',
      body: JSON.stringify({
        goalTags: goalTags ? goalTags.split(',').map((t) => t.trim()) : [],
        powerRangeTag: powerRangeTag || null,
        content: manualContent,
      }),
    });
    setManualContent('');
    load();
  }

  async function activate(id: string) {
    await apiFetch(`/admin/business-plan-manifests/${id}/activate`, { method: 'POST' });
    load();
  }

  return (
    <div>
      <h1 className="mb-1 text-xl font-semibold text-leaf-900 dark:text-white">{d.title}</h1>
      <p className="mb-6 text-sm text-leaf-900/50 dark:text-white/50">{d.intro}</p>

      <div className="mb-6 rounded-xl border border-dashed border-leaf-800/20 p-4 dark:border-white/20">
        <h2 className="mb-2 font-medium text-leaf-900 dark:text-white">{d.newVersionTitle}</h2>
        <div className="mb-2 grid grid-cols-2 gap-2">
          <input
            placeholder={d.goalTagsPlaceholder}
            value={goalTags}
            onChange={(e) => setGoalTags(e.target.value)}
            className="rounded-lg border border-leaf-800/20 px-3 py-2 text-sm dark:border-white/20 dark:bg-leaf-900 dark:text-white"
          />
          <select
            value={powerRangeTag}
            onChange={(e) => setPowerRangeTag(e.target.value)}
            className="rounded-lg border border-leaf-800/20 px-3 py-2 text-sm dark:border-white/20 dark:bg-leaf-900 dark:text-white"
          >
            <option value="">{d.universalPower}</option>
            {POWER_TAGS.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
        <div className="mb-2 flex gap-2">
          <input
            value={brief}
            onChange={(e) => setBrief(e.target.value)}
            placeholder={d.briefPlaceholder}
            className="flex-1 rounded-lg border border-leaf-800/20 px-3 py-2 text-sm dark:border-white/20 dark:bg-leaf-900 dark:text-white"
          />
          <button onClick={generateViaAi} disabled={generating} className="rounded-full bg-sun-500 px-4 py-2 text-sm font-medium text-leaf-900 disabled:opacity-50">
            {generating ? '...' : d.generateViaAi}
          </button>
        </div>
        <textarea
          value={manualContent}
          onChange={(e) => setManualContent(e.target.value)}
          placeholder={d.manualContentPlaceholder}
          rows={4}
          className="mb-2 w-full rounded-lg border border-leaf-800/20 px-3 py-2 font-mono text-xs dark:border-white/20 dark:bg-leaf-900 dark:text-white"
        />
        <button onClick={createManual} className="rounded-full border border-leaf-800 px-4 py-2 text-sm font-medium text-leaf-800 dark:border-white dark:text-white">
          {d.saveManual}
        </button>
      </div>

      {!items ? (
        <p className="text-leaf-900/50 dark:text-white/50">{dict.common.loading}</p>
      ) : (
        <div className="flex flex-col gap-4">
          {[...groups.entries()].map(([key, versions]) => (
            <div key={key} className="rounded-xl border border-leaf-800/10 p-4 dark:border-white/10">
              <p className="mb-2 font-medium text-leaf-900 dark:text-white">
                {versions[0].goalTags.length > 0 ? versions[0].goalTags.join(', ') : d.universal} ·{' '}
                {versions[0].powerRangeTag ?? d.anyPower}
              </p>
              <div className="flex flex-col gap-2">
                {versions.map((v) => (
                  <div key={v.id} className={`rounded-lg border p-2 text-sm ${v.isActive ? 'border-green-400 bg-green-50 dark:border-green-700 dark:bg-green-950' : 'border-leaf-800/10 dark:border-white/10'}`}>
                    <div className="flex items-center justify-between">
                      <span className="text-leaf-900 dark:text-white">
                        v{v.version} · {v.generatedBy === 'ai' ? d.byAi : d.manually} · {new Date(v.createdAt).toLocaleDateString('uk-UA')}
                        {v.isActive && <span className="ml-2 text-xs text-green-700 dark:text-green-400">{d.active}</span>}
                      </span>
                      {!v.isActive && (
                        <button onClick={() => activate(v.id)} className="text-xs text-leaf-700 underline dark:text-sun-500">
                          {d.activate}
                        </button>
                      )}
                    </div>
                    <details className="mt-1">
                      <summary className="cursor-pointer text-xs text-leaf-900/50 dark:text-white/50">{d.showContent}</summary>
                      <pre className="mt-1 max-h-40 overflow-auto whitespace-pre-wrap rounded bg-leaf-50 p-2 text-xs dark:bg-white/5 dark:text-white">{v.content}</pre>
                    </details>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
