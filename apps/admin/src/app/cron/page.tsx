'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '../../lib/api';
import type { CronJobInfo, CronJobRun } from '../../lib/api';
import { useAdminLocale } from '../../lib/locale-context';

const STATUS_COLOR: Record<CronJobRun['status'], string> = {
  RUNNING: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300',
  SUCCESS: 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300',
  FAILED: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300',
  PARTIAL: 'bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300',
};

export default function CronPage() {
  const [registry, setRegistry] = useState<CronJobInfo[] | null>(null);
  const [history, setHistory] = useState<CronJobRun[] | null>(null);
  const [runningKey, setRunningKey] = useState<string | null>(null);
  const [debugByJob, setDebugByJob] = useState<Record<string, boolean>>({});
  const [expanded, setExpanded] = useState<string | null>(null);
  const { dict } = useAdminLocale();
  const d = dict.pages.cron;

  async function load() {
    const [r, h] = await Promise.all([
      apiFetch<CronJobInfo[]>('/admin/cron/registry'),
      apiFetch<CronJobRun[]>('/admin/cron/history'),
    ]);
    setRegistry(r);
    setHistory(h);
  }

  useEffect(() => {
    load();
  }, []);

  async function runJob(jobKey: string) {
    setRunningKey(jobKey);
    try {
      const debug = debugByJob[jobKey] ?? false;
      await apiFetch(`/admin/cron/${jobKey}/run?debug=${debug}`, { method: 'POST' });
      await load();
    } finally {
      setRunningKey(null);
    }
  }

  function lastRunFor(jobKey: string): CronJobRun | undefined {
    return history?.find((h) => h.jobKey === jobKey);
  }

  return (
    <div>
      <h1 className="mb-1 text-xl font-semibold text-leaf-900 dark:text-white">{d.title}</h1>
      <p className="mb-6 text-sm text-leaf-900/50 dark:text-white/50">{d.intro}</p>

      {!registry ? (
        <p className="text-leaf-900/50 dark:text-white/50">{dict.common.loading}</p>
      ) : (
        <div className="flex flex-col gap-3">
          {registry.map((job) => {
            const last = lastRunFor(job.jobKey);
            return (
              <div key={job.jobKey} className="rounded-xl border border-leaf-800/10 p-4 dark:border-white/10">
                <div className="mb-2 flex items-center justify-between">
                  <div>
                    <p className="font-medium text-leaf-900 dark:text-white">{job.jobKey}</p>
                    <p className="text-xs text-leaf-900/50 dark:text-white/50">{job.description}</p>
                  </div>
                  {last && (
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLOR[last.status]}`}>
                      {last.status}
                    </span>
                  )}
                </div>

                {last && (
                  <button
                    onClick={() => setExpanded(expanded === job.jobKey ? null : job.jobKey)}
                    className="mb-2 text-xs text-leaf-700 underline dark:text-sun-500"
                  >
                    {last.summary} ({last.durationMs}мс) {expanded === job.jobKey ? '▲' : '▼'}
                  </button>
                )}
                {/* За прямим запитом користувача ("через админку 500 /
                    консоль детерменировано") — знайдено реальний пробіл:
                    CronService.run() зберігає РЕАЛЬНУ причину помилки в
                    CronJobRun.errorMessage ПЕРЕД тим, як прокинути
                    виняток далі (це й дає 500 у браузера), але сторінка
                    НІКОЛИ не показувала це поле — адмін бачив лише
                    порожній/безглуздий summary (для FAILED-запусків
                    summary взагалі не оновлюється в run(), лише
                    status/errorMessage) замість реальної причини, вже
                    наявної в БД. */}
                {last?.status === 'FAILED' && last.errorMessage && (
                  <p className="mb-2 rounded-lg bg-red-50 p-2 text-xs text-red-700 dark:bg-red-950 dark:text-red-300">⚠ {last.errorMessage}</p>
                )}
                {expanded === job.jobKey && last?.debugLog !== undefined && last?.debugLog !== null && (
                  <pre className="mb-2 max-h-64 overflow-auto rounded-lg bg-leaf-900 p-3 text-xs text-white">
                    {JSON.stringify(last.debugLog, null, 2)}
                  </pre>
                )}

                <div className="flex items-center gap-3">
                  <button
                    disabled={runningKey === job.jobKey}
                    onClick={() => runJob(job.jobKey)}
                    className="rounded-full bg-sun-500 px-4 py-1.5 text-xs font-medium text-leaf-900 disabled:opacity-60"
                  >
                    {runningKey === job.jobKey ? d.running : d.runNow}
                  </button>
                  <label className="flex items-center gap-1.5 text-xs text-leaf-900/60 dark:text-white/60">
                    <input
                      type="checkbox"
                      checked={debugByJob[job.jobKey] ?? false}
                      onChange={(e) => setDebugByJob({ ...debugByJob, [job.jobKey]: e.target.checked })}
                    />
                    {d.debugMode}
                  </label>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
