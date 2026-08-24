'use client';

import { useEffect, useRef, useState } from 'react';
import { apiFetch } from '../../lib/api';
import type { EmbedStats } from '../../lib/api';
import { useAdminLocale } from '../../lib/locale-context';

type CompactGridPoint = [number, number, number];

interface SolarMapImportResult {
  rawPointsCreated: number;
  rawPointsUpdated: number;
  gridsCreated: number;
  gridsUpdated: number;
  errors: string[];
}

// ТЗ п.34.2/34.6.5 — ручний перерахунок сітки + дашборд трекінгу embed-віджету
export default function SolarMapAdminPage() {
  const [stats, setStats] = useState<EmbedStats | null>(null);
  const [period, setPeriod] = useState<'today' | 'week' | 'month' | 'all'>('week');
  const [recomputing, setRecomputing] = useState(false);
  const [recomputeResult, setRecomputeResult] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [importResult, setImportResult] = useState<SolarMapImportResult | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { dict } = useAdminLocale();
  const d = dict.pages.solarMapAdmin;

  // За запитом користувача — "прогрес індикація" для нового ітеративного
  // тайм-боксованого (~200с) крон-джоба pvgis_country_grid. На відміну
  // від "Перерахувати сітку" нижче (один синхронний прохід, для ручного
  // кліку, де людина свідомо чекає) — цей джоб розрахований на декілька
  // прогонів за розкладом до повного покриття, тому прогрес потрібно
  // бачити в БУДЬ-який момент, не тільки одразу після запуску.
  const [coverage, setCoverage] = useState<{ totalPoints: number; cachedPoints: number; progressPercent: number } | null>(null);
  const [runningGridJob, setRunningGridJob] = useState(false);
  const [gridJobResult, setGridJobResult] = useState<string | null>(null);
  const [resettingCache, setResettingCache] = useState(false);

  async function loadCoverage() {
    setCoverage(await apiFetch<{ totalPoints: number; cachedPoints: number; progressPercent: number }>('/admin/solar-map/raw-grid-coverage'));
  }

  // За прямим запитом користувача — "pvgis кеш как обнулить". Особливо
  // актуально після зміни джерела даних (напр. перехід на іншу версію
  // PVGIS API) — старі закешовані значення варто перерахувати заново, а
  // не лишати змішаними зі свіжими.
  async function resetCache() {
    if (!confirm(d.confirmResetCache)) return;
    setResettingCache(true);
    try {
      const result = await apiFetch<{ deletedRawPoints: number; deletedGrids: number }>('/admin/solar-map/reset-cache', { method: 'POST' });
      alert(d.resetCacheDone.replace('{a}', String(result.deletedRawPoints)).replace('{b}', String(result.deletedGrids)));
      loadCoverage();
    } catch (err) {
      alert(err instanceof Error ? err.message : d.genericError);
    } finally {
      setResettingCache(false);
    }
  }

  async function runGridJobOnce() {
    setRunningGridJob(true);
    setGridJobResult(null);
    try {
      // За тим самим принципом, що вже виправлено для статей (README) —
      // РЕАЛЬНА форма відповіді cron-ендпоінта (cron.service.ts, case
      // 'pvgis_country_grid') — стандартний конверт {summary, debugLog,
      // itemsProcessed, itemsFailed, status}, а не плаский об'єкт.
      const result = await apiFetch<{
        summary: string;
        itemsProcessed: number;
        itemsFailed: number;
        status: string;
        debugLog?: {
          newlyComputed: number;
          newlyFailed: number;
          failedPoints: { lat: number; lng: number; diagnostic: string; permanent: boolean }[];
          elapsedMs: number;
          progressPercent: number;
          isComplete: boolean;
          remainingPoints: number;
        };
      }>('/admin/cron/pvgis_country_grid/run?debug=true', { method: 'POST' });
      if (result.debugLog) {
        const dl = result.debugLog;
        setGridJobResult(
          `+${dl.newlyComputed} ${d.resultNewPoints} ${Math.round(dl.elapsedMs / 1000)}${d.resultOverSeconds}, ${d.resultProgress} ${dl.progressPercent}%, ${d.resultRemaining} ${dl.remainingPoints}` +
            (dl.isComplete ? ` ${d.resultFullyCollected}` : '') +
            (dl.failedPoints.length > 0
              ? '\n' + dl.failedPoints.map((f) => `${f.permanent ? `🌊 ${d.resultOutOfCoverage}` : '⚠️'} (${f.lat}, ${f.lng}): ${f.diagnostic}`).join('\n')
              : ''),
        );
      } else {
        setGridJobResult(result.summary);
      }
      loadCoverage();
    } catch (err) {
      alert(err instanceof Error ? err.message : d.genericError);
    } finally {
      setRunningGridJob(false);
    }
  }

  async function load() {
    setStats(await apiFetch<EmbedStats>(`/admin/embed-views/stats?widgetKey=solar-map&period=${period}`));
  }

  useEffect(() => {
    load();
    loadCoverage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period]);

  async function recompute() {
    if (!confirm(d.confirmRecompute)) return;
    setRecomputing(true);
    setRecomputeResult(null);
    try {
      const result = await apiFetch<{ pointsComputed: number; pointsFailed: number; interpolatedCells: number }>(
        '/admin/solar-map/recompute-grid',
        { method: 'POST', body: JSON.stringify({ stepDegrees: 1 }) },
      );
      setRecomputeResult(
        `${d.pvgisPointsLabel} ${result.pointsComputed}, ${d.errorsLabel} ${result.pointsFailed}. ${d.interpolatedCellsLabel} ${result.interpolatedCells}`,
      );
    } catch (err) {
      alert(err instanceof Error ? err.message : d.genericError);
    } finally {
      setRecomputing(false);
    }
  }

  async function recomputeInterpolationOnly() {
    setRecomputing(true);
    setRecomputeResult(null);
    try {
      const result = await apiFetch<CompactGridPoint[]>('/admin/solar-map/recompute-interpolation', { method: 'POST' });
      setRecomputeResult(`${d.recomputedInterpolationOnly} ${result.length}`);
    } catch (err) {
      alert(err instanceof Error ? err.message : d.genericError);
    } finally {
      setRecomputing(false);
    }
  }

  // Міграція даних карти між оточеннями (напр. локальна розробка без
  // мережевого доступу до PVGIS → staging → прод) — той самий паттерн, що
  // «Постачальники» (VendorDataTransferService, Фаза 2): експорт у файл,
  // ідемпотентний імпорт з розширеним результатом.
  async function handleExport() {
    setExporting(true);
    try {
      const data = await apiFetch('/admin/solar-map/export');
      const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `solar-map-export-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert(err instanceof Error ? err.message : d.exportError);
    } finally {
      setExporting(false);
    }
  }

  async function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportError(null);
    setImportResult(null);
    try {
      const text = await file.text();
      const payload = JSON.parse(text);
      const result = await apiFetch<SolarMapImportResult>('/admin/solar-map/import', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      setImportResult(result);
    } catch (err) {
      setImportError(err instanceof Error ? err.message : d.importFileError);
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  return (
    <div>
      <h1 className="mb-1 text-xl font-semibold text-leaf-900 dark:text-white">{d.title}</h1>
      <p className="mb-6 text-sm text-leaf-900/50 dark:text-white/50">{d.intro}</p>

      <div className="mb-8 rounded-xl border border-leaf-800/10 bg-leaf-50 p-4 dark:border-white/10 dark:bg-white/5">
        <h2 className="mb-1 font-medium text-leaf-900 dark:text-white">{d.iterativeTitle}</h2>
        <p className="mb-3 text-xs text-leaf-900/50 dark:text-white/50">{d.iterativeIntro}</p>
        {coverage && (
          <div className="mb-3">
            <div className="mb-1 flex items-center justify-between text-xs text-leaf-900/60 dark:text-white/60">
              <span>
                {coverage.cachedPoints} / {coverage.totalPoints} {d.pointsOf} ({coverage.progressPercent}%)
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-leaf-800/10 dark:bg-white/10">
              <div className="h-full rounded-full bg-sun-500 transition-all" style={{ width: `${coverage.progressPercent}%` }} />
            </div>
          </div>
        )}
        <button
          onClick={runGridJobOnce}
          disabled={runningGridJob}
          className="rounded-full bg-sun-500 px-4 py-2 text-sm font-medium text-leaf-900 disabled:opacity-50"
        >
          {runningGridJob ? d.running : d.runOnce}
        </button>
        <button
          onClick={resetCache}
          disabled={resettingCache}
          className="ml-2 rounded-full border border-red-300 px-4 py-2 text-sm font-medium text-red-700 disabled:opacity-50 dark:border-red-800 dark:text-red-400"
        >
          {resettingCache ? d.resetting : d.resetCache}
        </button>
        {gridJobResult && <p className="mt-2 whitespace-pre-line text-sm text-leaf-900/70 dark:text-white/70">{gridJobResult}</p>}
      </div>

      <div className="mb-8 rounded-xl border border-dashed border-leaf-800/20 p-4 dark:border-white/20">
        <p className="mb-2 text-xs text-leaf-900/50 dark:text-white/50">{d.recomputeIntro}</p>
        <div className="flex gap-2">
          <button onClick={recompute} disabled={recomputing} className="rounded-full bg-sun-500 px-4 py-2 text-sm font-medium text-leaf-900 disabled:opacity-50">
            {recomputing ? d.recomputing : d.recomputeFull}
          </button>
          <button onClick={recomputeInterpolationOnly} disabled={recomputing} className="rounded-full border border-leaf-800 px-4 py-2 text-sm font-medium text-leaf-800 disabled:opacity-50 dark:border-white dark:text-white">
            {d.recomputeInterpolationOnly}
          </button>
        </div>
        {recomputeResult && <p className="mt-2 text-sm text-leaf-900/70 dark:text-white/70">{recomputeResult}</p>}
      </div>

      <div className="mb-8 rounded-xl border border-dashed border-leaf-800/20 p-4 dark:border-white/20">
        <h2 className="mb-1 font-medium text-leaf-900 dark:text-white">{d.migrationTitle}</h2>
        <p className="mb-3 text-xs text-leaf-900/50 dark:text-white/50">{d.migrationIntro}</p>
        <div className="mb-3 flex items-center gap-3">
          <button
            onClick={handleExport}
            disabled={exporting}
            className="rounded-full border border-leaf-800 px-4 py-2 text-sm font-medium text-leaf-800 disabled:opacity-50 dark:border-white dark:text-white"
          >
            {exporting ? '...' : d.exportJson}
          </button>
          <input ref={fileInputRef} type="file" accept="application/json" onChange={handleImportFile} className="text-xs" />
        </div>

        {importError && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">{d.importErrorPrefix} {importError}</p>}
        {importResult && (
          <div className="rounded-lg bg-leaf-50 p-3 text-sm dark:bg-white/5">
            <p className="mb-1 font-medium text-leaf-900 dark:text-white">
              {importResult.errors.length > 0 ? d.importWithErrors : d.importSuccess}
            </p>
            <ul className="text-leaf-900/70 dark:text-white/70">
              <li>{d.pvgisPointsCreated} {importResult.rawPointsCreated}, {d.pvgisPointsUpdated} {importResult.rawPointsUpdated}</li>
              <li>{d.gridsCreated} {importResult.gridsCreated}, {d.gridsUpdated} {importResult.gridsUpdated}</li>
            </ul>
            {importResult.errors.length > 0 && (
              <ul className="mt-2 max-h-32 overflow-auto rounded bg-white/60 p-2 text-xs text-red-700 dark:bg-black/20 dark:text-red-300">
                {importResult.errors.map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-medium text-leaf-900 dark:text-white">{d.embedStatsTitle}</h2>
        <div className="flex gap-2">
          {(['today', 'week', 'month', 'all'] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`rounded-full px-3 py-1 text-xs font-medium ${period === p ? 'bg-sun-500 text-leaf-900' : 'border border-leaf-800/20 text-leaf-900/60 dark:border-white/20 dark:text-white/60'}`}
            >
              {p === 'today' ? d.periodToday : p === 'week' ? d.periodWeek : p === 'month' ? d.periodMonth : d.periodAll}
            </button>
          ))}
        </div>
      </div>

      {!stats ? (
        <p className="text-leaf-900/50 dark:text-white/50">{dict.common.loading}</p>
      ) : (
        <>
          <p className="mb-4 text-lg font-semibold text-leaf-900 dark:text-white">{stats.totalViews} {d.viewsCount}</p>
          <table className="mb-6 w-full text-sm">
            <thead>
              <tr className="border-b border-leaf-800/10 text-left text-leaf-900/50 dark:border-white/10 dark:text-white/50">
                <th className="py-2">{d.colDomain}</th>
                <th>{d.colViews}</th>
              </tr>
            </thead>
            <tbody>
              {stats.topDomains.map((dom) => (
                <tr key={dom.host} className="border-b border-leaf-800/5 dark:border-white/5">
                  <td className="py-1.5 text-leaf-900 dark:text-white">{dom.host}</td>
                  <td className="text-leaf-900 dark:text-white">{dom.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {stats.timeline.length > 0 && (
            <div className="text-xs text-leaf-900/50 dark:text-white/50">
              {stats.timeline.map((t) => (
                <div key={t.date} className="flex justify-between border-b border-leaf-800/5 py-1 dark:border-white/5">
                  <span>{t.date}</span>
                  <span>{t.count}</span>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
