'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '../../lib/api';
import type { Category, PendingCategory } from '../../lib/api';
import { useAdminLocale } from '../../lib/locale-context';
import type { AdminDictionary } from '../../lib/i18n';

// За прямим запитом користувача — "если явного соответствия нет
// добавить категорию на модерацию в админке с указанием сколько
// товаров ждут эту категорию, при успешной модерации менять на новую у
// всех этих товаров". Дві дії на кожен PENDING-кандидат: "Затвердити як
// нову" (форма з перекладами назв) або "Влити в існуючу" (вибір з
// уже APPROVED категорій — ретроактивно переносить усі товари).

// Той самий грубий алгоритм словоформ, що вже був у оригіналі (не
// повна ICU-плюралізація, лише 3 форми, той самий рівень точності).
function pluralizeProducts(count: number, d: AdminDictionary['pages']['categories']): string {
  if (count === 1) return d.waitingProductsOne;
  if (count >= 2 && count <= 4) return d.waitingProductsFew;
  return d.waitingProductsMany;
}

export default function CategoriesPage() {
  const [all, setAll] = useState<Category[] | null>(null);
  const [pending, setPending] = useState<PendingCategory[] | null>(null);
  const [approveForm, setApproveForm] = useState<Record<string, { nameUk: string; nameRu: string; nameEn: string; prefix: string }>>({});
  const [mergeTarget, setMergeTarget] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const { dict } = useAdminLocale();
  const d = dict.pages.categories;

  async function load() {
    const [allCats, pendingCats] = await Promise.all([
      apiFetch<Category[]>('/admin/categories'),
      apiFetch<PendingCategory[]>('/admin/categories/pending'),
    ]);
    setAll(allCats);
    setPending(pendingCats);
    const forms: typeof approveForm = {};
    for (const p of pendingCats) {
      forms[p.id] = { nameUk: p.nameUk, nameRu: p.nameRu, nameEn: p.nameEn, prefix: p.articleNumberPrefix };
    }
    setApproveForm(forms);
  }

  useEffect(() => {
    load();
  }, []);

  const approvedCategories = all?.filter((c) => c.status === 'APPROVED') ?? [];

  async function handleApprove(id: string) {
    const form = approveForm[id];
    if (!form) return;
    setBusy(id);
    try {
      await apiFetch(`/admin/categories/${id}/approve`, {
        method: 'POST',
        body: JSON.stringify({ nameUk: form.nameUk, nameRu: form.nameRu, nameEn: form.nameEn, articleNumberPrefix: form.prefix }),
      });
      load();
    } catch (err) {
      alert(err instanceof Error ? err.message : d.genericError);
    } finally {
      setBusy(null);
    }
  }

  async function handleMerge(id: string) {
    const targetId = mergeTarget[id];
    if (!targetId) {
      alert(d.selectTargetAlert);
      return;
    }
    if (!confirm(d.confirmMerge)) return;
    setBusy(id);
    try {
      const result = await apiFetch<{ mergedProductCount: number }>(`/admin/categories/${id}/merge`, {
        method: 'POST',
        body: JSON.stringify({ targetCategoryId: targetId }),
      });
      alert(`${d.mergedAlert} ${result.mergedProductCount}`);
      load();
    } catch (err) {
      alert(err instanceof Error ? err.message : d.genericError);
    } finally {
      setBusy(null);
    }
  }

  async function handleReject(id: string) {
    if (!confirm(d.confirmReject)) return;
    setBusy(id);
    try {
      await apiFetch(`/admin/categories/${id}/reject`, { method: 'POST' });
      load();
    } catch (err) {
      alert(err instanceof Error ? err.message : d.genericError);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div>
      <h1 className="mb-1 text-xl font-semibold text-leaf-900 dark:text-white">{d.title}</h1>
      <p className="mb-6 text-sm text-leaf-900/50 dark:text-white/50">{d.intro}</p>

      <h2 className="mb-3 font-medium text-leaf-900 dark:text-white">{d.pendingTitle}</h2>
      {!pending ? (
        <p className="mb-8 text-leaf-900/50 dark:text-white/50">{dict.common.loading}</p>
      ) : pending.length === 0 ? (
        <p className="mb-8 text-sm text-leaf-900/50 dark:text-white/50">{d.noPending}</p>
      ) : (
        <div className="mb-8 flex flex-col gap-4">
          {pending.map((p) => (
            <div key={p.id} className="rounded-xl border border-orange-300 bg-orange-50 p-4 dark:border-orange-800 dark:bg-orange-950">
              <div className="mb-3 flex items-center justify-between">
                <p className="font-medium text-leaf-900 dark:text-white">
                  «{p.nameUk}» <span className="font-mono text-xs text-leaf-900/40 dark:text-white/40">({p.key})</span>
                </p>
                <span className="rounded-full bg-orange-200 px-2.5 py-0.5 text-xs font-medium text-orange-900 dark:bg-orange-800 dark:text-orange-100">
                  {p.waitingProductCount} {pluralizeProducts(p.waitingProductCount, d)} {d.waitingSuffix}
                </span>
              </div>

              <div className="mb-3 grid grid-cols-1 gap-2 md:grid-cols-4">
                <input
                  placeholder={d.fieldNameUk}
                  value={approveForm[p.id]?.nameUk ?? ''}
                  onChange={(e) => setApproveForm({ ...approveForm, [p.id]: { ...approveForm[p.id], nameUk: e.target.value } })}
                  className="rounded-lg border border-leaf-800/20 px-3 py-1.5 text-sm dark:border-white/20 dark:bg-leaf-900 dark:text-white"
                />
                <input
                  placeholder={d.fieldNameRu}
                  value={approveForm[p.id]?.nameRu ?? ''}
                  onChange={(e) => setApproveForm({ ...approveForm, [p.id]: { ...approveForm[p.id], nameRu: e.target.value } })}
                  className="rounded-lg border border-leaf-800/20 px-3 py-1.5 text-sm dark:border-white/20 dark:bg-leaf-900 dark:text-white"
                />
                <input
                  placeholder={d.fieldNameEn}
                  value={approveForm[p.id]?.nameEn ?? ''}
                  onChange={(e) => setApproveForm({ ...approveForm, [p.id]: { ...approveForm[p.id], nameEn: e.target.value } })}
                  className="rounded-lg border border-leaf-800/20 px-3 py-1.5 text-sm dark:border-white/20 dark:bg-leaf-900 dark:text-white"
                />
                <input
                  placeholder={d.fieldPrefix}
                  value={approveForm[p.id]?.prefix ?? ''}
                  onChange={(e) => setApproveForm({ ...approveForm, [p.id]: { ...approveForm[p.id], prefix: e.target.value.toUpperCase() } })}
                  className="rounded-lg border border-leaf-800/20 px-3 py-1.5 text-sm dark:border-white/20 dark:bg-leaf-900 dark:text-white"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => handleApprove(p.id)}
                  disabled={busy === p.id}
                  className="rounded-full bg-sun-500 px-4 py-1.5 text-xs font-medium text-leaf-900 disabled:opacity-50"
                >
                  {d.approveButton}
                </button>

                <span className="text-xs text-leaf-900/40 dark:text-white/40">{d.or}</span>

                <select
                  value={mergeTarget[p.id] ?? ''}
                  onChange={(e) => setMergeTarget({ ...mergeTarget, [p.id]: e.target.value })}
                  className="rounded-lg border border-leaf-800/20 px-2 py-1.5 text-xs dark:border-white/20 dark:bg-leaf-900 dark:text-white"
                >
                  <option value="">{d.mergeSelectPrompt}</option>
                  {approvedCategories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nameUk}
                    </option>
                  ))}
                </select>
                <button
                  onClick={() => handleMerge(p.id)}
                  disabled={busy === p.id}
                  className="rounded-full border border-leaf-800 px-4 py-1.5 text-xs font-medium text-leaf-800 disabled:opacity-50 dark:border-white dark:text-white"
                >
                  {d.mergeButton}
                </button>

                <button onClick={() => handleReject(p.id)} disabled={busy === p.id} className="ml-auto text-xs text-red-600 underline dark:text-red-400">
                  {d.rejectButton}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <h2 className="mb-3 font-medium text-leaf-900 dark:text-white">{d.allTitle}</h2>
      {!all ? (
        <p className="text-leaf-900/50 dark:text-white/50">{dict.common.loading}</p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-leaf-800/10 text-left text-leaf-900/50 dark:border-white/10 dark:text-white/50">
              <th className="py-2">{d.colKey}</th>
              <th>{d.colNameUk}</th>
              <th>{d.colPrefix}</th>
              <th>{d.colStatus}</th>
            </tr>
          </thead>
          <tbody>
            {all.map((c) => (
              <tr key={c.id} className="border-b border-leaf-800/5 dark:border-white/5">
                <td className="py-1.5 font-mono text-xs text-leaf-900 dark:text-white">{c.key}</td>
                <td className="text-leaf-900 dark:text-white">{c.nameUk}</td>
                <td className="text-leaf-900 dark:text-white">{c.articleNumberPrefix}</td>
                <td>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      c.status === 'APPROVED'
                        ? 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300'
                        : c.status === 'PENDING'
                          ? 'bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300'
                          : 'bg-leaf-800/10 text-leaf-800/50 dark:bg-white/10 dark:text-white/50'
                    }`}
                  >
                    {c.status === 'APPROVED' ? d.statusApproved : c.status === 'PENDING' ? d.statusPending : d.statusRejected}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
