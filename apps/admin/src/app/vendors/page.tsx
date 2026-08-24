'use client';

import { useEffect, useRef, useState } from 'react';
import { apiFetch } from '../../lib/api';
import type { Vendor, VendorImportResult, VendorCandidate, VendorCatalogEstimate } from '../../lib/api';
import { ImportResultBanner } from '../../components/ImportResultBanner';
import { useAdminLocale } from '../../lib/locale-context';

const EMPTY = { name: '', website: '', warehouseCities: '' };
const EMPTY_AI_FORM = { country: '', category: '', city: '' };

export default function VendorsPage() {
  const [items, setItems] = useState<Vendor[] | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [busyVendorId, setBusyVendorId] = useState<string | null>(null);
  const [importResult, setImportResult] = useState<VendorImportResult | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { dict } = useAdminLocale();
  const d = dict.pages.vendors;
  // За прямим запитом користувача — "аудит... особое внимание
  // переводам" — знайдено: ця константа була захардкоджена
  // українською незалежно від обраної мови, пропущена в попередньому
  // проході (розділ README). Тепер зі спільної secції словника.
  const CATEGORY_LABEL: Record<string, string> = {
    SOLAR_PANEL: dict.categoryLabelsPlural.solarPanel,
    BATTERY: dict.categoryLabelsPlural.battery,
    CONTROLLER: dict.categoryLabelsPlural.controller,
    INVERTER: dict.categoryLabelsPlural.inverter,
    CABLE: dict.categoryLabelsPlural.cable,
    CONNECTOR: dict.categoryLabelsPlural.connector,
  };
  const CONTRACT_LABEL: Record<Vendor['contractStatus'], string> = {
    NOT_CONTACTED: d.contractNotContacted,
    NEGOTIATING: d.contractNegotiating,
    SIGNED: d.contractSigned,
    DECLINED: d.contractDeclined,
  };
  const PARSER_STATUS_LABEL: Record<Vendor['parserStatus'], string> = {
    NOT_WRITTEN: d.parserNotWritten,
    WORKING: d.parserWorking,
    NEEDS_DEBUG: d.parserNeedsDebug,
  };
  const PARSER_STATUS_STYLE: Record<Vendor['parserStatus'], string> = {
    NOT_WRITTEN: 'bg-leaf-800/10 text-leaf-800/50 dark:bg-white/10 dark:text-white/50',
    WORKING: 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300',
    NEEDS_DEBUG: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300',
  };

  // За запитом користувача — ІІ-пошук нових постачальників, крім ручного
  // додавання. Двопрохідно: спочатку пошук кандидатів (country
  // обов'язково, category/city опційно), потім за явним кліком на
  // конкретного кандидата — другий ІІ-запит з оцінкою каталогу
  // (кількість товарів + категорії), щоб не робити дорогий подвійний
  // запит одразу на всіх кандидатів списку.
  const [aiForm, setAiForm] = useState(EMPTY_AI_FORM);
  const [aiSearching, setAiSearching] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [candidates, setCandidates] = useState<VendorCandidate[] | null>(null);
  const [estimates, setEstimates] = useState<Record<string, VendorCatalogEstimate | 'loading'>>({});
  const [addingWebsite, setAddingWebsite] = useState<string | null>(null);

  async function load() {
    setItems(await apiFetch<Vendor[]>('/admin/vendors'));
  }

  useEffect(() => {
    load();
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name || !form.website) return;
    await apiFetch('/admin/vendors', {
      method: 'POST',
      body: JSON.stringify({
        name: form.name,
        website: form.website,
        warehouseCities: form.warehouseCities.split(',').map((s) => s.trim()).filter(Boolean),
      }),
    });
    setForm(EMPTY);
    load();
  }

  async function handleAiSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!aiForm.country.trim()) return;
    setAiSearching(true);
    setAiError(null);
    setCandidates(null);
    setEstimates({});
    try {
      const result = await apiFetch<{ vendors: VendorCandidate[]; error: string | null }>('/admin/vendors/ai-search', {
        method: 'POST',
        body: JSON.stringify({
          country: aiForm.country.trim(),
          category: aiForm.category || undefined,
          city: aiForm.city.trim() || undefined,
        }),
      });
      if (result.error) setAiError(result.error);
      setCandidates(result.vendors);
    } catch (err) {
      setAiError(err instanceof Error ? err.message : d.searchError);
    } finally {
      setAiSearching(false);
    }
  }

  async function handleShowDetails(candidate: VendorCandidate) {
    setEstimates((prev) => ({ ...prev, [candidate.website]: 'loading' }));
    try {
      const estimate = await apiFetch<VendorCatalogEstimate>('/admin/vendors/ai-estimate', {
        method: 'POST',
        body: JSON.stringify({ website: candidate.website }),
      });
      setEstimates((prev) => ({ ...prev, [candidate.website]: estimate }));
    } catch {
      setEstimates((prev) => ({ ...prev, [candidate.website]: { estimatedProductCount: null, categories: [], notes: d.searchError } }));
    }
  }

  async function handleAddCandidate(candidate: VendorCandidate) {
    setAddingWebsite(candidate.website);
    try {
      await apiFetch('/admin/vendors', {
        method: 'POST',
        body: JSON.stringify({ name: candidate.name, website: candidate.website, warehouseCities: [] }),
      });
      setCandidates((prev) => prev?.filter((c) => c.website !== candidate.website) ?? null);
      load();
    } catch (err) {
      alert(err instanceof Error ? err.message : d.addVendorError);
    } finally {
      setAddingWebsite(null);
    }
  }

  async function updateContractStatus(id: string, contractStatus: Vendor['contractStatus']) {
    await apiFetch(`/admin/vendors/${id}`, { method: 'PUT', body: JSON.stringify({ contractStatus }) });
    load();
  }

  // Експорт данных парсера одного постачальника у JSON-файл — для міграції
  // між оточеннями (напр. локальна розробка → staging → прод).
  async function handleExport(vendor: Vendor) {
    setBusyVendorId(vendor.id);
    try {
      const data = await apiFetch(`/admin/vendors/${vendor.id}/export`);
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${vendor.name}-parser-export-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert(err instanceof Error ? err.message : d.genericError);
    } finally {
      setBusyVendorId(null);
    }
  }

  // Ідемпотентний імпорт — той самий файл можна завантажити повторно без
  // дублювання (SourceListing матчиться по (vendorId, sourceUrl), Vendor —
  // по унікальному name). Детальний результат — у плашці нижче.
  async function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportError(null);
    setImportResult(null);

    try {
      const text = await file.text();
      const payload = JSON.parse(text);
      const result = await apiFetch<VendorImportResult>('/admin/vendors/import', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      setImportResult(result);
      load();
    } catch (err) {
      setImportError(err instanceof Error ? err.message : d.genericError);
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  return (
    <div>
      <h1 className="mb-1 text-xl font-semibold text-leaf-900 dark:text-white">{d.title}</h1>
      <p className="mb-4 text-sm text-leaf-900/50 dark:text-white/50">{d.intro}</p>

      {importResult && <ImportResultBanner result={importResult} onClose={() => setImportResult(null)} />}
      {importError && (
        <div className="mb-6 rounded-xl border border-red-300 bg-red-50 p-4 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300">
          {importError}
        </div>
      )}

      <div className="mb-6 flex items-center gap-3 rounded-xl border border-dashed border-leaf-800/20 p-4 dark:border-white/20">
        <div className="flex-1">
          <p className="text-sm font-medium text-leaf-900 dark:text-white">{d.importTitle}</p>
          <p className="text-xs text-leaf-900/50 dark:text-white/50">{d.importIntro}</p>
        </div>
        <input ref={fileInputRef} type="file" accept="application/json" onChange={handleImportFile} className="text-xs" />
      </div>

      {!items ? (
        <p className="text-leaf-900/50 dark:text-white/50">{d.loading}</p>
      ) : (
        <table className="mb-8 w-full text-sm">
          <thead>
            <tr className="border-b border-leaf-800/10 text-left text-leaf-900/50 dark:border-white/10 dark:text-white/50">
              <th className="py-2">{d.colName}</th>
              <th>{d.colWebsite}</th>
              <th>{d.colWarehouseCities}</th>
              <th>{d.colParserStatus}</th>
              <th>{d.colPartnership}</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {items.map((v) => (
              <tr key={v.id} className="border-b border-leaf-800/5 dark:border-white/5">
                <td className="py-2 text-leaf-900 dark:text-white">{v.name}</td>
                <td className="text-leaf-900/60 dark:text-white/60">{v.website}</td>
                <td className="text-leaf-900/60 dark:text-white/60">{v.warehouseCities.join(', ')}</td>
                <td>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${PARSER_STATUS_STYLE[v.parserStatus]}`}>
                    {PARSER_STATUS_LABEL[v.parserStatus]}
                  </span>
                </td>
                <td>
                  <select
                    value={v.contractStatus}
                    onChange={(e) => updateContractStatus(v.id, e.target.value as Vendor['contractStatus'])}
                    className="rounded-lg border border-leaf-800/20 px-2 py-1 text-xs dark:border-white/20 dark:bg-leaf-900 dark:text-white"
                  >
                    {Object.entries(CONTRACT_LABEL).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="text-right">
                  <button
                    onClick={() => handleExport(v)}
                    disabled={busyVendorId === v.id}
                    className="text-leaf-700 underline disabled:opacity-50 dark:text-sun-500"
                  >
                    {busyVendorId === v.id ? '...' : d.exportJson}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <div className="flex flex-wrap gap-10">
        <form onSubmit={handleCreate} className="flex w-full max-w-md flex-col gap-3">
          <h2 className="font-medium text-leaf-900 dark:text-white">{d.addVendorTitle}</h2>
          <input
            placeholder={d.namePlaceholder}
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="rounded-lg border border-leaf-800/20 px-3 py-2 text-sm dark:border-white/20 dark:bg-leaf-900 dark:text-white"
          />
          <input
            placeholder={d.websitePlaceholder}
            value={form.website}
            onChange={(e) => setForm({ ...form, website: e.target.value })}
            className="rounded-lg border border-leaf-800/20 px-3 py-2 text-sm dark:border-white/20 dark:bg-leaf-900 dark:text-white"
          />
          <input
            placeholder={d.citiesPlaceholder}
            value={form.warehouseCities}
            onChange={(e) => setForm({ ...form, warehouseCities: e.target.value })}
            className="rounded-lg border border-leaf-800/20 px-3 py-2 text-sm dark:border-white/20 dark:bg-leaf-900 dark:text-white"
          />
          <button type="submit" className="w-fit rounded-full bg-sun-500 px-5 py-2 text-sm font-medium text-leaf-900">
            {d.add}
          </button>
        </form>

        <div className="flex w-full max-w-lg flex-col gap-3">
          <h2 className="font-medium text-leaf-900 dark:text-white">{d.aiSearchTitle}</h2>
          <form onSubmit={handleAiSearch} className="flex flex-col gap-3">
            <input
              placeholder={d.countryPlaceholder}
              value={aiForm.country}
              onChange={(e) => setAiForm({ ...aiForm, country: e.target.value })}
              className="rounded-lg border border-leaf-800/20 px-3 py-2 text-sm dark:border-white/20 dark:bg-leaf-900 dark:text-white"
            />
            <div className="flex gap-3">
              <select
                value={aiForm.category}
                onChange={(e) => setAiForm({ ...aiForm, category: e.target.value })}
                className="flex-1 rounded-lg border border-leaf-800/20 px-3 py-2 text-sm dark:border-white/20 dark:bg-leaf-900 dark:text-white"
              >
                <option value="">{d.anyCategory}</option>
                {Object.entries(CATEGORY_LABEL).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
              <input
                placeholder={d.cityOptionalPlaceholder}
                value={aiForm.city}
                onChange={(e) => setAiForm({ ...aiForm, city: e.target.value })}
                className="flex-1 rounded-lg border border-leaf-800/20 px-3 py-2 text-sm dark:border-white/20 dark:bg-leaf-900 dark:text-white"
              />
            </div>
            <button
              type="submit"
              disabled={aiSearching || !aiForm.country.trim()}
              className="w-fit rounded-full border border-leaf-800 px-5 py-2 text-sm font-medium text-leaf-800 disabled:opacity-50 dark:border-white dark:text-white"
            >
              {aiSearching ? d.searching : d.findVendors}
            </button>
          </form>

          {aiError && <p className="text-xs text-red-600 dark:text-red-400">{aiError}</p>}

          {candidates && candidates.length === 0 && !aiError && (
            <p className="text-xs text-leaf-900/50 dark:text-white/50">{d.nothingNewFound}</p>
          )}

          {candidates && candidates.length > 0 && (
            <div className="flex flex-col gap-3">
              {candidates.map((c) => {
                const estimate = estimates[c.website];
                return (
                  <div key={c.website} className="rounded-xl border border-leaf-800/10 p-3 dark:border-white/10">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium text-leaf-900 dark:text-white">{c.name}</p>
                        <p className="text-xs text-leaf-900/50 dark:text-white/50">{c.website}</p>
                        <p className="mt-1 text-xs text-leaf-900/60 dark:text-white/60">{c.notes}</p>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-2">
                        <button
                          onClick={() => handleAddCandidate(c)}
                          disabled={addingWebsite === c.website}
                          className="rounded-full bg-sun-500 px-3 py-1 text-xs font-medium text-leaf-900 disabled:opacity-50"
                        >
                          {addingWebsite === c.website ? '...' : d.add}
                        </button>
                        {!estimate && (
                          <button onClick={() => handleShowDetails(c)} className="text-xs text-leaf-700 underline dark:text-sun-500">
                            {d.showDetails}
                          </button>
                        )}
                      </div>
                    </div>
                    {estimate === 'loading' && <p className="mt-2 text-xs text-leaf-900/40 dark:text-white/40">{d.estimatingCatalog}</p>}
                    {estimate && estimate !== 'loading' && (
                      <div className="mt-2 rounded-lg bg-leaf-50 p-2 text-xs text-leaf-900/70 dark:bg-white/5 dark:text-white/70">
                        <p>
                          {d.estimatedProductCount}{' '}
                          {estimate.estimatedProductCount !== null ? estimate.estimatedProductCount : d.unknown}
                        </p>
                        <p>
                          {d.categoriesLabel}{' '}
                          {estimate.categories.length > 0
                            ? estimate.categories.map((cat) => CATEGORY_LABEL[cat] ?? cat).join(', ')
                            : d.notDetermined}
                        </p>
                        <p className="mt-1 italic text-leaf-900/50 dark:text-white/50">{estimate.notes}</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
