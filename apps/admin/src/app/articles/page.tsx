'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '../../lib/api';
import type { Article } from '../../lib/api';
import { useAdminLocale } from '../../lib/locale-context';

interface RunParserResult {
  summary: string;
  itemsProcessed: number;
  itemsFailed: number;
  status: string;
  debugLog?: {
    found: number;
    created: number;
    batchSubmitted: boolean;
    xaiBatchId?: string;
    batchError?: string;
  };
}

interface PollResult {
  summary: string;
  itemsProcessed: number;
  itemsFailed: number;
  status: string;
  debugLog?: {
    processed: number;
    stillPending: number;
    translatedTotal: number;
    failedTotal: number;
  };
}

// За прямим запитом користувача — "скоринг показывать цветной большой
// цифрой в админке". Пороги — та сама логіка, що LLM явно
// проінструктовано враховувати: >=60 добре, 35-59 середньо, <35 слабко.
function scoreColorClass(score: number): string {
  if (score >= 60) return 'text-green-600 dark:text-green-400';
  if (score >= 35) return 'text-orange-500 dark:text-orange-400';
  return 'text-red-500 dark:text-red-400';
}

export default function ArticlesPage() {
  const [items, setItems] = useState<Article[] | null>(null);
  const [sortBy, setSortBy] = useState<'createdAt' | 'score'>('createdAt');
  const [statusFilter, setStatusFilter] = useState<'DRAFT' | 'PUBLISHED' | 'ARCHIVED' | 'ALL'>('DRAFT');
  const [running, setRunning] = useState(false);
  const [polling, setPolling] = useState(false);
  const [lastParserResult, setLastParserResult] = useState<RunParserResult | null>(null);
  const [lastPollResult, setLastPollResult] = useState<PollResult | null>(null);
  const [backfilling, setBackfilling] = useState(false);
  const [backfillResult, setBackfillResult] = useState<{ attempted: number; succeeded: number; stillMissing: number } | null>(null);
  const { dict } = useAdminLocale();
  const d = dict.pages.articles;
  const STATUS_FILTER_OPTIONS: ['DRAFT' | 'PUBLISHED' | 'ARCHIVED' | 'ALL', string][] = [
    ['DRAFT', d.statusDraft],
    ['PUBLISHED', d.statusPublished],
    ['ARCHIVED', d.statusArchived],
    ['ALL', d.statusAll],
  ];

  async function backfillCoverImages() {
    setBackfilling(true);
    setBackfillResult(null);
    try {
      const result = await apiFetch<{ attempted: number; succeeded: number; stillMissing: number }>(
        '/admin/articles/backfill-cover-images',
        { method: 'POST' },
      );
      setBackfillResult(result);
      await load();
    } catch (err) {
      alert(err instanceof Error ? err.message : d.genericError);
    } finally {
      setBackfilling(false);
    }
  }

  async function load() {
    const statusQs = statusFilter !== 'ALL' ? `&status=${statusFilter}` : '';
    setItems(await apiFetch<Article[]>(`/admin/articles?sortBy=${sortBy}${statusQs}`));
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sortBy, statusFilter]);

  async function runParser() {
    setRunning(true);
    setLastParserResult(null);
    try {
      const result = await apiFetch<RunParserResult>('/admin/cron/article_parser/run?debug=true', { method: 'POST' });
      setLastParserResult(result);
      await load();
    } finally {
      setRunning(false);
    }
  }

  async function pollBatches() {
    setPolling(true);
    setLastPollResult(null);
    try {
      const result = await apiFetch<PollResult>('/admin/cron/article_batch_poll/run?debug=true', { method: 'POST' });
      setLastPollResult(result);
      await load();
    } finally {
      setPolling(false);
    }
  }

  async function publishTranslation(translationId: string) {
    await apiFetch(`/admin/articles/translations/${translationId}`, {
      method: 'PUT',
      body: JSON.stringify({ status: 'PUBLISHED' }),
    });
    load();
  }

  async function publishAllTranslations(article: Article) {
    const unpublished = article.translations.filter((t) => t.status !== 'PUBLISHED');
    if (unpublished.length === 0) return;
    try {
      for (const t of unpublished) {
        await apiFetch(`/admin/articles/translations/${t.id}`, {
          method: 'PUT',
          body: JSON.stringify({ status: 'PUBLISHED' }),
        });
      }
      await load();
    } catch (err) {
      alert(err instanceof Error ? err.message : d.genericError);
    }
  }

  async function deleteArticle(id: string) {
    if (!confirm(d.confirmDelete)) return;
    try {
      await apiFetch(`/admin/articles/${id}`, { method: 'DELETE' });
      await load();
    } catch (err) {
      alert(err instanceof Error ? err.message : d.deleteError);
    }
  }

  async function setArticleStatus(id: string, status: 'DRAFT' | 'ARCHIVED') {
    try {
      await apiFetch(`/admin/articles/${id}`, { method: 'PUT', body: JSON.stringify({ status }) });
      await load();
    } catch (err) {
      alert(err instanceof Error ? err.message : d.genericError);
    }
  }

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-leaf-900 dark:text-white">{d.title}</h1>
        <div className="flex gap-2">
          <button
            disabled={running}
            onClick={runParser}
            className="rounded-full bg-sun-500 px-4 py-2 text-sm font-medium text-leaf-900 disabled:opacity-60"
          >
            {running ? d.submittingBatch : d.findNewArticles}
          </button>
          <button
            disabled={polling}
            onClick={pollBatches}
            className="rounded-full border border-leaf-800 px-4 py-2 text-sm font-medium text-leaf-800 disabled:opacity-60 dark:border-white dark:text-white"
          >
            {polling ? d.checking : d.checkBatches}
          </button>
          <button
            disabled={backfilling}
            onClick={backfillCoverImages}
            className="rounded-full border border-leaf-800/30 px-4 py-2 text-sm font-medium text-leaf-800/70 disabled:opacity-60 dark:border-white/30 dark:text-white/70"
          >
            {backfilling ? d.fetchingPhotos : d.backfillPhotos}
          </button>
        </div>
      </div>
      <p className="mb-2 text-sm text-leaf-900/50 dark:text-white/50">{d.intro}</p>
      <p className="mb-4 text-xs text-leaf-900/40 dark:text-white/40">
        {d.stepsNote} (<code>article_batch_poll</code>)
      </p>

      {backfillResult && (
        <div className="mb-4 rounded-lg bg-leaf-50 p-3 text-sm dark:bg-white/5 dark:text-white">
          {d.backfillAttempted} {backfillResult.attempted}, {d.backfillSucceeded} {backfillResult.succeeded}, {d.backfillStillMissing}{' '}
          {backfillResult.stillMissing}
          {backfillResult.attempted === 0 && (
            <p className="mt-1 text-xs text-leaf-900/50 dark:text-white/50">{d.backfillNoneNote}</p>
          )}
        </div>
      )}

      {lastParserResult && (
        <div className="mb-2 rounded-lg bg-leaf-50 p-3 text-sm dark:bg-white/5 dark:text-white">
          {lastParserResult.debugLog ? (
            <>
              Знайдено {lastParserResult.debugLog.found}, нових статей {lastParserResult.debugLog.created}
              {lastParserResult.debugLog.batchSubmitted ? (
                <> — {d.batchSubmitted.replace('{id}', lastParserResult.debugLog.xaiBatchId ?? '')}</>
              ) : lastParserResult.debugLog.created > 0 ? (
                <span className="text-red-600 dark:text-red-400"> — {d.batchSubmitError} {lastParserResult.debugLog.batchError}</span>
              ) : (
                '.'
              )}
            </>
          ) : (
            lastParserResult.summary
          )}
        </div>
      )}
      {lastPollResult && (
        <div className="mb-4 rounded-lg bg-leaf-50 p-3 text-sm dark:bg-white/5 dark:text-white">
          {lastPollResult.debugLog ? (
            <>
              {d.pollProcessed} {lastPollResult.debugLog.processed}, {d.pollTranslated}{' '}
              {lastPollResult.debugLog.translatedTotal}, {d.pollFailed} {lastPollResult.debugLog.failedTotal}, {d.pollPending}{' '}
              {lastPollResult.debugLog.stillPending}
              {lastPollResult.debugLog.stillPending > 0 && ` ${d.pollRetryNote}`}
            </>
          ) : (
            lastPollResult.summary
          )}
        </div>
      )}

      <div className="mb-3 flex items-center gap-2">
        {STATUS_FILTER_OPTIONS.map(([value, label]) => (
          <button
            key={value}
            onClick={() => setStatusFilter(value)}
            className={`rounded-full px-3 py-1.5 text-xs font-medium ${
              statusFilter === value ? 'bg-sun-500 text-leaf-900' : 'bg-leaf-800/5 text-leaf-900/60 hover:bg-leaf-800/10 dark:bg-white/10 dark:text-white/60 dark:hover:bg-white/20'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="mb-3 flex items-center gap-2">
        <span className="text-xs text-leaf-900/50 dark:text-white/50">{d.sortLabel}</span>
        <button
          onClick={() => setSortBy('createdAt')}
          className={`rounded-full px-3 py-1 text-xs font-medium ${sortBy === 'createdAt' ? 'bg-leaf-900 text-white' : 'bg-leaf-800/5 text-leaf-900/60 dark:bg-white/10 dark:text-white/60'}`}
        >
          {d.sortByDate}
        </button>
        <button
          onClick={() => setSortBy('score')}
          className={`rounded-full px-3 py-1 text-xs font-medium ${sortBy === 'score' ? 'bg-leaf-900 text-white' : 'bg-leaf-800/5 text-leaf-900/60 dark:bg-white/10 dark:text-white/60'}`}
        >
          {d.sortByScore}
        </button>
      </div>

      {!items ? (
        <p className="text-leaf-900/50 dark:text-white/50">{dict.common.loading}</p>
      ) : items.length === 0 ? (
        <p className="text-leaf-900/50 dark:text-white/50">{d.noItems}</p>
      ) : (
        <div className="flex flex-col gap-3">
          {items.map((a) => (
            <div key={a.id} className="rounded-xl border border-leaf-800/10 p-4 dark:border-white/10">
              <div className="mb-2 flex items-start gap-3">
                {a.coverImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={a.coverImage} alt="" className="h-14 w-20 shrink-0 rounded-lg bg-leaf-50 object-cover" />
                ) : (
                  <div className="flex h-14 w-20 shrink-0 items-center justify-center rounded-lg bg-leaf-50 text-[10px] text-leaf-900/30 dark:bg-white/5 dark:text-white/30">
                    {d.noPhoto}
                  </div>
                )}

                <div className="flex-1">
                  <div className="mb-1 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {a.score !== null ? (
                        <span className={`text-2xl font-bold ${scoreColorClass(a.score)}`}>{a.score}</span>
                      ) : (
                        <span className="text-xs text-leaf-900/30 dark:text-white/30">{d.scoreNotReady}</span>
                      )}
                      <p className="text-xs text-leaf-900/40 dark:text-white/40">{a.sourceSite}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      {a.translations.some((t) => t.status !== 'PUBLISHED') && (
                        <button onClick={() => publishAllTranslations(a)} className="text-xs text-green-700 underline dark:text-green-400">
                          {d.publishAll}
                        </button>
                      )}
                      {a.status === 'ARCHIVED' ? (
                        <button onClick={() => setArticleStatus(a.id, 'DRAFT')} className="text-xs text-leaf-700 underline dark:text-sun-500">
                          {d.unarchive}
                        </button>
                      ) : (
                        <button onClick={() => setArticleStatus(a.id, 'ARCHIVED')} className="text-xs text-orange-700 underline dark:text-orange-400">
                          {d.archive}
                        </button>
                      )}
                      <button onClick={() => deleteArticle(a.id)} className="text-xs text-red-600 underline dark:text-red-400">
                        {dict.common.delete}
                      </button>
                    </div>
                  </div>
                  {a.scoreReasoning && <p className="text-xs italic text-leaf-900/50 dark:text-white/50">{a.scoreReasoning}</p>}
                </div>
              </div>
              {a.translations.length === 0 ? (
                <p className="text-xs text-leaf-900/40 dark:text-white/40">{d.noTranslationsYet}</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {a.translations.map((t) => (
                    <div key={t.id} className="flex items-center gap-2 rounded-lg bg-leaf-50 px-3 py-1.5 text-sm dark:bg-white/5">
                      <span className="font-medium uppercase text-leaf-900/50 dark:text-white/50">{t.locale}</span>
                      <span className="max-w-xs truncate text-leaf-900 dark:text-white">{t.title}</span>
                      {t.status === 'PUBLISHED' ? (
                        <span className="text-xs text-green-600 dark:text-green-400">{d.published}</span>
                      ) : (
                        <button onClick={() => publishTranslation(t.id)} className="text-xs text-leaf-700 underline dark:text-sun-500">
                          {d.publishOne}
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
