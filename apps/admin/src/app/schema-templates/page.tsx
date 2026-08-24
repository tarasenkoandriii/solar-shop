'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '../../lib/api';
import type { SchemaTemplateAdmin } from '../../lib/api';
import { useAdminLocale } from '../../lib/locale-context';

// ТЗ п.31.10.1a — розовий ІІ-аудит готових (не згенерованих ІІ) шаблонів
// схем: перевірка логічної послідовності, не переписування SVG.
export default function SchemaTemplatesPage() {
  const [items, setItems] = useState<SchemaTemplateAdmin[] | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [auditingId, setAuditingId] = useState<string | null>(null);
  const { dict } = useAdminLocale();
  const d = dict.pages.schemaTemplates;

  async function load() {
    setItems(await apiFetch<SchemaTemplateAdmin[]>('/admin/schema-templates'));
  }

  useEffect(() => {
    load();
  }, []);

  function startEdit(t: SchemaTemplateAdmin) {
    setEditingId(t.id);
    setEditValue(t.svgTemplate);
  }

  async function saveEdit(id: string) {
    await apiFetch(`/admin/schema-templates/${id}`, { method: 'PUT', body: JSON.stringify({ svgTemplate: editValue }) });
    setEditingId(null);
    load();
  }

  async function runAudit(id: string) {
    setAuditingId(id);
    try {
      await apiFetch(`/admin/schema-templates/${id}/audit`, { method: 'POST' });
      load();
    } catch (err) {
      alert(err instanceof Error ? err.message : d.auditError);
    } finally {
      setAuditingId(null);
    }
  }

  return (
    <div>
      <h1 className="mb-1 text-xl font-semibold text-leaf-900 dark:text-white">{d.title}</h1>
      <p className="mb-6 text-sm text-leaf-900/50 dark:text-white/50">{d.intro}</p>

      {!items ? (
        <p className="text-leaf-900/50 dark:text-white/50">{dict.common.loading}</p>
      ) : (
        <div className="flex flex-col gap-4">
          {items.map((t) => (
            <div key={t.id} className="rounded-xl border border-leaf-800/10 p-4 dark:border-white/10">
              <div className="mb-2 flex items-center justify-between">
                <p className="font-medium text-leaf-900 dark:text-white">
                  {t.topology} · {t.diagramType === 'BLOCK' ? d.block : d.principal}
                </p>
                <div className="flex gap-2">
                  <button onClick={() => startEdit(t)} className="text-xs text-leaf-700 underline dark:text-sun-500">
                    {d.editSvg}
                  </button>
                  <button
                    onClick={() => runAudit(t.id)}
                    disabled={auditingId === t.id}
                    className="rounded-full bg-sun-500 px-3 py-1 text-xs font-medium text-leaf-900 disabled:opacity-50"
                  >
                    {auditingId === t.id ? '...' : d.runAudit}
                  </button>
                </div>
              </div>

              {t.notes && <p className="mb-2 text-xs text-leaf-900/50 dark:text-white/50">{t.notes}</p>}

              <div className="mb-2 max-h-48 overflow-auto rounded-lg bg-leaf-50 p-2 dark:bg-white/5">
                {/* eslint-disable-next-line react/no-danger */}
                <div dangerouslySetInnerHTML={{ __html: t.svgTemplate }} />
              </div>

              {editingId === t.id ? (
                <div className="flex flex-col gap-2">
                  <textarea
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    rows={8}
                    className="rounded-lg border border-leaf-800/20 px-3 py-2 font-mono text-xs dark:border-white/20 dark:bg-leaf-900 dark:text-white"
                  />
                  <div className="flex gap-2">
                    <button onClick={() => saveEdit(t.id)} className="rounded-full bg-sun-500 px-4 py-1.5 text-xs font-medium text-leaf-900">
                      {d.save}
                    </button>
                    <button onClick={() => setEditingId(null)} className="text-xs text-leaf-900/50 dark:text-white/50">
                      {d.cancel}
                    </button>
                  </div>
                </div>
              ) : null}

              {t.lastAuditReport && (
                <div className="mt-2 rounded-lg bg-leaf-50 p-3 text-xs dark:bg-white/5">
                  <p className="mb-1 font-medium text-leaf-900 dark:text-white">
                    {d.auditReportTitle} {t.lastAuditAt ? new Date(t.lastAuditAt).toLocaleString('uk-UA') : ''}
                  </p>
                  <p className="whitespace-pre-line text-leaf-900/70 dark:text-white/70">{t.lastAuditReport}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
