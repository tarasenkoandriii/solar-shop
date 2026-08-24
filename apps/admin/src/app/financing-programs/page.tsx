'use client';

import { useEffect, useRef, useState } from 'react';
import { apiFetch } from '../../lib/api';
import type { FinancingProgram, PendingFinancingReview } from '../../lib/api';
import { useAdminLocale } from '../../lib/locale-context';

// ТЗ п.32.1/32.2 — ІІ знаходить кандидатів, НЕ публікує сам. Черга
// модерації — окремий фільтр status:DRAFT.
export default function FinancingProgramsPage() {
  const [items, setItems] = useState<FinancingProgram[] | null>(null);
  const [filter, setFilter] = useState<'ALL' | FinancingProgram['status']>('DRAFT');
  const [running, setRunning] = useState(false);
  const [runResult, setRunResult] = useState<string | null>(null);
  const [imageDiagnostics, setImageDiagnostics] = useState<{ name: string; url: string; diagnostic: string }[]>([]);
  const { dict } = useAdminLocale();
  const d = dict.pages.financingPrograms;
  const STATUS_LABEL: Record<FinancingProgram['status'], string> = {
    DRAFT: d.statusDraft,
    PUBLISHED: d.statusPublished,
    ARCHIVED: d.statusArchived,
  };

  const [pendingReviews, setPendingReviews] = useState<PendingFinancingReview[] | null>(null);

  async function loadPendingReviews() {
    setPendingReviews(await apiFetch<PendingFinancingReview[]>('/admin/financing-reviews/pending'));
  }

  async function approveReviewText(id: string) {
    await apiFetch(`/admin/financing-reviews/${id}/approve-text`, { method: 'POST' });
    loadPendingReviews();
  }

  async function rejectReviewText(id: string) {
    await apiFetch(`/admin/financing-reviews/${id}/reject-text`, { method: 'POST' });
    loadPendingReviews();
  }

  async function load() {
    const qs = filter === 'ALL' ? '' : `?status=${filter}`;
    setItems(await apiFetch<FinancingProgram[]>(`/admin/financing-programs${qs}`));
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  useEffect(() => {
    loadPendingReviews();
  }, []);

  async function runParser() {
    setRunning(true);
    setRunResult(null);
    setImageDiagnostics([]);
    try {
      const result = await apiFetch<{
        summary: string;
        itemsProcessed: number;
        itemsFailed: number;
        status: string;
        debugLog?: {
          found: number;
          created: number;
          updated: number;
          changed: string[];
          imagesBackfilled: number;
          imageDiagnostics: { name: string; url: string; diagnostic: string }[];
          flaggedForRecheck: number;
        };
      }>('/admin/cron/financing_program_parser/run?debug=true', { method: 'POST' });
      if (result.debugLog) {
        const dl = result.debugLog;
        setRunResult(
          `${d.resultFound} ${dl.found}, ${d.resultNew} ${dl.created}, ${d.updatedLabel} ${dl.updated}` +
            (dl.changed.length > 0 ? ` (${d.resultRealChanges} ${dl.changed.join(', ')})` : '') +
            (dl.imagesBackfilled > 0 ? `, ${d.resultImagesBackfilled} ${dl.imagesBackfilled}` : ''),
        );
        setImageDiagnostics(dl.imageDiagnostics);
      } else {
        setRunResult(result.summary);
      }
      load();
    } catch (err) {
      alert(err instanceof Error ? err.message : d.genericError);
    } finally {
      setRunning(false);
    }
  }

  async function publish(id: string) {
    await apiFetch(`/admin/financing-programs/${id}/publish`, { method: 'POST' });
    load();
  }

  async function archive(id: string) {
    await apiFetch(`/admin/financing-programs/${id}/archive`, { method: 'POST' });
    load();
  }

  async function remove(id: string, name: string) {
    if (!confirm(d.confirmDelete.replace('{name}', name))) return;
    await apiFetch(`/admin/financing-programs/${id}`, { method: 'DELETE' });
    load();
  }

  async function mergeInto(draftId: string, targetId: string, targetName: string) {
    if (!confirm(d.confirmMerge.replace('{name}', targetName))) return;
    try {
      await apiFetch(`/admin/financing-programs/${draftId}/merge`, {
        method: 'POST',
        body: JSON.stringify({ targetId }),
      });
      await load();
    } catch (err) {
      alert(err instanceof Error ? err.message : d.genericError);
    }
  }

  const [refetchingImageId, setRefetchingImageId] = useState<string | null>(null);
  async function refetchImage(id: string) {
    setRefetchingImageId(id);
    try {
      await apiFetch(`/admin/financing-programs/${id}/refetch-image`, { method: 'POST' });
      await load();
    } catch (err) {
      alert(err instanceof Error ? err.message : d.genericError);
    } finally {
      setRefetchingImageId(null);
    }
  }

  const [exporting, setExporting] = useState(false);
  const [importResult, setImportResult] = useState<{ created: number; updated: number; errors: string[] } | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleExport() {
    setExporting(true);
    try {
      const data = await apiFetch('/admin/financing-programs/export');
      const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `financing-programs-export-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert(err instanceof Error ? err.message : d.genericError);
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
      const result = await apiFetch<{ created: number; updated: number; errors: string[] }>('/admin/financing-programs/import', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      setImportResult(result);
      await load();
    } catch (err) {
      setImportError(err instanceof Error ? err.message : d.genericError);
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-leaf-900 dark:text-white">{d.title}</h1>
        <button
          onClick={runParser}
          disabled={running}
          className="rounded-full bg-sun-500 px-4 py-2 text-sm font-medium text-leaf-900 disabled:opacity-50"
        >
          {running ? d.finding : d.findNew}
        </button>
      </div>
      <p className="mb-4 text-sm text-leaf-900/50 dark:text-white/50">{d.intro}</p>

      <div className="mb-4 flex items-center gap-3 rounded-xl border border-dashed border-leaf-800/20 p-3 dark:border-white/20">
        <button
          onClick={handleExport}
          disabled={exporting}
          className="rounded-full border border-leaf-800 px-4 py-1.5 text-xs font-medium text-leaf-800 disabled:opacity-50 dark:border-white dark:text-white"
        >
          {exporting ? '...' : d.exportJson}
        </button>
        <input ref={fileInputRef} type="file" accept="application/json" onChange={handleImportFile} className="text-xs" />
        {importResult && (
          <span className="text-xs text-leaf-900/60 dark:text-white/60">
            {d.importedLabel} {importResult.created}, {d.updatedLabel} {importResult.updated}
            {importResult.errors.length > 0 && `, ${d.withErrorLabel} ${importResult.errors.length}`}
          </span>
        )}
        {importError && <span className="text-xs text-red-600 dark:text-red-400">{importError}</span>}
      </div>

      {runResult && <p className="mb-4 rounded-lg bg-leaf-50 p-3 text-xs font-mono dark:bg-white/5 dark:text-white">{runResult}</p>}
      {imageDiagnostics.length > 0 && (
        <div className="mb-4 rounded-lg border border-leaf-800/10 p-3 text-xs dark:border-white/10">
          <p className="mb-2 font-medium text-leaf-900/70 dark:text-white/70">{d.imageDiagnosticsTitle}</p>
          {imageDiagnostics.map((diag, i) => (
            <p key={i} className="mb-1 text-leaf-900/60 dark:text-white/60">
              <span className="font-medium">{diag.name}</span> ({diag.url}): {diag.diagnostic}
            </p>
          ))}
        </div>
      )}

      {pendingReviews && pendingReviews.length > 0 && (
        <div className="mb-6 rounded-xl border border-orange-300 bg-orange-50 p-4 dark:border-orange-800 dark:bg-orange-950">
          <h2 className="mb-3 font-medium text-leaf-900 dark:text-white">
            {d.pendingReviewsTitle} ({pendingReviews.length})
          </h2>
          <div className="flex flex-col gap-3">
            {pendingReviews.map((r) => (
              <div key={r.id} className="rounded-lg bg-white p-3 dark:bg-leaf-900">
                <div className="mb-1 flex items-center justify-between">
                  <p className="text-sm font-medium text-leaf-900 dark:text-white">
                    {r.financingProgram.name} — {r.city}, {r.branch}
                  </p>
                  <p className="text-xs text-leaf-900/40 dark:text-white/40">{new Date(r.createdAt).toLocaleDateString('uk-UA')}</p>
                </div>
                <p className="mb-2 text-xs text-leaf-900/50 dark:text-white/50">
                  {d.qualityLabel} {r.businessPlanQualityScore}/10 · {d.responsivenessLabel} {r.bankResponsivenessScore}/10 · {d.speedLabel}{' '}
                  {r.processingSpeedScore}/10 · {d.successLabel} {r.applicationSuccessScore}/10
                  {r.coveragePercent !== null && ` (${r.coveragePercent}${d.coverageLabel})`}
                </p>
                <p className="mb-3 text-sm text-leaf-900/80 dark:text-white/80">«{r.reviewText}»</p>
                <div className="flex gap-2">
                  <button onClick={() => approveReviewText(r.id)} className="text-xs text-green-700 underline dark:text-green-400">
                    {d.approveText}
                  </button>
                  <button onClick={() => rejectReviewText(r.id)} className="text-xs text-red-600 underline dark:text-red-400">
                    {d.rejectText}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mb-4 flex gap-2">
        {(['DRAFT', 'PUBLISHED', 'ARCHIVED', 'ALL'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-full px-3 py-1 text-xs font-medium ${filter === f ? 'bg-sun-500 text-leaf-900' : 'border border-leaf-800/20 text-leaf-900/60 dark:border-white/20 dark:text-white/60'}`}
          >
            {f === 'ALL' ? d.filterAll : STATUS_LABEL[f]}
          </button>
        ))}
      </div>

      {!items ? (
        <p className="text-leaf-900/50 dark:text-white/50">{dict.common.loading}</p>
      ) : items.length === 0 ? (
        <p className="text-leaf-900/50 dark:text-white/50">{d.noItemsInFilter}</p>
      ) : (
        <div className="flex flex-col gap-3">
          {items.map((p) => (
            <div
              key={p.id}
              className={`flex gap-4 rounded-xl border p-4 ${
                p.similarPublished
                  ? 'border-amber-400 bg-amber-50 dark:border-amber-700 dark:bg-amber-950'
                  : p.needsRecheck
                    ? 'border-orange-300 bg-orange-50 dark:border-orange-800 dark:bg-orange-950'
                    : 'border-leaf-800/10 dark:border-white/10'
              }`}
            >
              {p.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={p.imageUrl} alt="" className="h-20 w-20 shrink-0 rounded-lg object-cover" />
              ) : (
                <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-lg bg-leaf-800/5 text-xs text-leaf-900/30 dark:bg-white/10 dark:text-white/30">
                  {d.noPhoto}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="mb-1 flex items-center justify-between">
                  <p className="font-medium text-leaf-900 dark:text-white">{p.name}</p>
                  <span className="text-xs text-leaf-900/50 dark:text-white/50">{STATUS_LABEL[p.status]}</span>
                </div>
                {p.similarPublished && (
                  <p className="mb-1 text-xs text-amber-700 dark:text-amber-400">
                    {d.similarPublishedWarning} <span className="font-medium">{p.similarPublished.name}</span>
                  </p>
                )}
                <p className="mb-1 text-xs text-leaf-900/50 dark:text-white/50">
                  {p.eligibility} · {p.minLoanUsd ? `$${p.minLoanUsd}` : '—'}–{p.maxLoanUsd ? `$${p.maxLoanUsd}` : '—'}
                </p>
                <p className="mb-2 text-sm text-leaf-900/70 dark:text-white/70">{p.description}</p>
                <a href={p.url} target="_blank" rel="noopener noreferrer" className="text-xs text-leaf-700 underline dark:text-sun-500">
                  {p.url}
                </a>
                {p.discoverySourceUrl && (
                  <p className="mt-1 text-xs text-leaf-900/40 dark:text-white/40">
                    {d.foundVia}{' '}
                    <a href={p.discoverySourceUrl} target="_blank" rel="noopener noreferrer" className="underline">
                      {p.discoverySourceUrl}
                    </a>
                  </p>
                )}
                {p.needsRecheck && (
                  <p className="mt-2 text-xs font-medium text-orange-700 dark:text-orange-400">{d.needsRecheckWarning}</p>
                )}
                <div className="mt-3 flex gap-2">
                  {p.similarPublished && (
                    <button
                      onClick={() => mergeInto(p.id, p.similarPublished!.id, p.similarPublished!.name)}
                      className="text-xs text-amber-700 underline dark:text-amber-400"
                    >
                      {d.mergeAction}
                    </button>
                  )}
                  {!p.imageUrl && (
                    <button
                      onClick={() => refetchImage(p.id)}
                      disabled={refetchingImageId === p.id}
                      className="text-xs text-blue-700 underline disabled:opacity-50 dark:text-blue-400"
                    >
                      {refetchingImageId === p.id ? d.fetchingPhoto : d.fetchPhoto}
                    </button>
                  )}
                  {p.status !== 'PUBLISHED' && (
                    <button onClick={() => publish(p.id)} className="text-xs text-green-700 underline dark:text-green-400">
                      {d.publish}
                    </button>
                  )}
                  {p.status !== 'ARCHIVED' && (
                    <button onClick={() => archive(p.id)} className="text-xs text-red-600 underline dark:text-red-400">
                      {d.archiveReject}
                    </button>
                  )}
                  <button onClick={() => remove(p.id, p.name)} className="text-xs text-red-900 underline dark:text-red-500">
                    {d.deleteForever}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
