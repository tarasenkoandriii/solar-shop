'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '../../lib/api';
import type { Lead } from '../../lib/api';
import { useAdminLocale } from '../../lib/locale-context';

export default function LeadsPage() {
  const [items, setItems] = useState<Lead[] | null>(null);
  const [filter, setFilter] = useState<Lead['status'] | 'ALL'>('ALL');
  const { dict } = useAdminLocale();
  const d = dict.pages.leads;
  const STATUS_LABEL: Record<Lead['status'], string> = {
    NEW: dict.leadStatus.new,
    IN_PROGRESS: dict.leadStatus.inProgress,
    CLOSED: dict.leadStatus.closed,
  };

  async function load() {
    setItems(await apiFetch<Lead[]>('/leads/admin/all'));
  }

  useEffect(() => {
    load();
  }, []);

  async function updateStatus(id: string, status: Lead['status']) {
    await apiFetch(`/leads/admin/${id}/status`, { method: 'PUT', body: JSON.stringify({ status }) });
    load();
  }

  const filtered = items?.filter((l) => filter === 'ALL' || l.status === filter) ?? [];

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
          <option value="NEW">{d.filterNew}</option>
          <option value="IN_PROGRESS">{d.filterInProgress}</option>
          <option value="CLOSED">{d.filterClosed}</option>
        </select>
      </div>

      {!items ? (
        <p className="text-leaf-900/50 dark:text-white/50">{dict.common.loading}</p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-leaf-800/10 text-left text-leaf-900/50 dark:border-white/10 dark:text-white/50">
              <th className="py-2">{d.colName}</th>
              <th>{d.colPhone}</th>
              <th>{d.colComment}</th>
              <th>{d.colSource}</th>
              <th>{d.colStatus}</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((lead) => (
              <tr key={lead.id} className="border-b border-leaf-800/5 dark:border-white/5">
                <td className="py-2 text-leaf-900 dark:text-white">{lead.name}</td>
                <td className="text-leaf-900 dark:text-white">{lead.phone}</td>
                <td className="max-w-xs truncate text-leaf-900/60 dark:text-white/60">{lead.comment ?? '—'}</td>
                <td className="text-leaf-900 dark:text-white">{lead.source}</td>
                <td>
                  <select
                    value={lead.status}
                    onChange={(e) => updateStatus(lead.id, e.target.value as Lead['status'])}
                    className="rounded-lg border border-leaf-800/20 px-2 py-1 text-xs dark:border-white/20 dark:bg-leaf-900 dark:text-white"
                  >
                    {Object.entries(STATUS_LABEL).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
