'use client';

import type { VendorImportResult } from '../lib/api';
import { useAdminLocale } from '../lib/locale-context';

export function ImportResultBanner({ result, onClose }: { result: VendorImportResult; onClose: () => void }) {
  const { dict } = useAdminLocale();
  const d = dict.pages.importResultBanner;
  const hasErrors = result.errors.length > 0;
  const hasSkipped = result.productLinksSkipped.length > 0;
  const tone = hasErrors
    ? 'border-red-300 bg-red-50 dark:border-red-800 dark:bg-red-950'
    : hasSkipped
      ? 'border-orange-300 bg-orange-50 dark:border-orange-800 dark:bg-orange-950'
      : 'border-green-300 bg-green-50 dark:border-green-800 dark:bg-green-950';

  return (
    <div className={`mb-6 rounded-xl border p-4 text-sm ${tone}`}>
      <div className="mb-2 flex items-center justify-between">
        <p className="font-semibold text-leaf-900 dark:text-white">
          {hasErrors ? d.withErrors : hasSkipped ? d.withSkipped : d.success}
          {' — '}
          {result.vendorName}
        </p>
        <button onClick={onClose} className="text-leaf-900/40 hover:text-leaf-900 dark:text-white/40 dark:hover:text-white">
          ✕
        </button>
      </div>

      <ul className="mb-2 grid grid-cols-2 gap-x-6 gap-y-1 text-leaf-900/80 dark:text-white/80 sm:grid-cols-3">
        <li>{d.vendorLabel} {result.vendorCreated ? d.vendorCreated : d.vendorExisted}</li>
        <li>{d.listingsProcessed} {result.listingsProcessed}</li>
        <li>{d.listingsCreated} {result.listingsCreated}</li>
        <li>{d.listingsUpdated} {result.listingsUpdated}</li>
        <li>{d.linksCreated} {result.productLinksCreated}</li>
        <li>{d.linksUpdated} {result.productLinksUpdated}</li>
      </ul>

      {hasSkipped && (
        <details className="mt-2">
          <summary className="cursor-pointer font-medium text-orange-700 dark:text-orange-400">
            {d.skippedLinksLabel} {result.productLinksSkipped.length} {d.skippedLinksReason}
          </summary>
          <ul className="mt-2 max-h-48 overflow-y-auto rounded-lg bg-white/60 p-2 text-xs dark:bg-black/20">
            {result.productLinksSkipped.map((s, i) => (
              <li key={i} className="border-b border-leaf-800/5 py-1 dark:border-white/5">
                <span className="font-mono">{s.articleNumber}</span> — {s.sourceUrl}
                <br />
                <span className="text-leaf-900/50 dark:text-white/50">{s.reason}</span>
              </li>
            ))}
          </ul>
        </details>
      )}

      {hasErrors && (
        <details className="mt-2" open>
          <summary className="cursor-pointer font-medium text-red-700 dark:text-red-400">{d.errorsLabel} {result.errors.length}</summary>
          <ul className="mt-2 max-h-48 overflow-y-auto rounded-lg bg-white/60 p-2 text-xs dark:bg-black/20">
            {result.errors.map((err, i) => (
              <li key={i} className="border-b border-leaf-800/5 py-1 font-mono dark:border-white/5">
                {err}
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
