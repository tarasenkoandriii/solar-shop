'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '../../lib/api';
import type { GrokUsageSummaryResponse, GrokBalanceResponse, AdminExpense, ExpenseLogEntry } from '../../lib/api';
import { useAdminLocale } from '../../lib/locale-context';

// За прямим запитом користувача — "добавить в админку вкладку расходы
// - сверху плашка баланс аккаунта grok ai / ниже - административные
// расходы / ниже - список аккаунтов телеграм и их расходы / снизу лог
// расходов". Чотири секції, згори вниз, точно в тому порядку, що
// попросив користувач.
export default function ExpensesPage() {
  const [balance, setBalance] = useState<GrokBalanceResponse | null>(null);
  const [adminExpenses, setAdminExpenses] = useState<AdminExpense[] | null>(null);
  const [usage, setUsage] = useState<GrokUsageSummaryResponse | null>(null);
  const [log, setLog] = useState<ExpenseLogEntry[] | null>(null);
  const [periodDays, setPeriodDays] = useState<number | undefined>(30);
  const { dict } = useAdminLocale();
  const d = dict.pages.expenses;
  const PERIODS = [
    { label: d.period7, days: 7 },
    { label: d.period30, days: 30 },
    { label: d.period90, days: 90 },
    { label: d.periodAll, days: undefined },
  ];

  const [expDescription, setExpDescription] = useState('');
  const [expCategory, setExpCategory] = useState('');
  const [expAmount, setExpAmount] = useState('');
  const [savingExpense, setSavingExpense] = useState(false);

  async function loadAll() {
    const qs = periodDays ? `?sinceDays=${periodDays}` : '';
    const [b, ae, u, l] = await Promise.all([
      apiFetch<GrokBalanceResponse>('/admin/grok-balance'),
      apiFetch<AdminExpense[]>('/admin/admin-expenses'),
      apiFetch<GrokUsageSummaryResponse>(`/admin/grok-usage${qs}`),
      apiFetch<ExpenseLogEntry[]>('/admin/expense-log?limit=100'),
    ]);
    setBalance(b);
    setAdminExpenses(ae);
    setUsage(u);
    setLog(l);
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [periodDays]);

  async function addExpense() {
    if (!expDescription.trim() || !expAmount) return;
    setSavingExpense(true);
    try {
      await apiFetch('/admin/admin-expenses', {
        method: 'POST',
        body: JSON.stringify({ description: expDescription.trim(), amountUsd: Number(expAmount), category: expCategory.trim() || undefined }),
      });
      setExpDescription('');
      setExpCategory('');
      setExpAmount('');
      await loadAll();
    } catch (err) {
      alert(err instanceof Error ? err.message : d.genericError);
    } finally {
      setSavingExpense(false);
    }
  }

  async function deleteExpense(id: string) {
    if (!confirm(d.confirmDeleteExpense)) return;
    await apiFetch(`/admin/admin-expenses/${id}`, { method: 'DELETE' });
    loadAll();
  }

  const totalAdminExpenses = (adminExpenses ?? []).reduce((sum, e) => sum + Number(e.amountUsd), 0);
  const grandTotal = totalAdminExpenses + (usage?.totalCostUsd ?? 0);

  return (
    <div>
      <h1 className="mb-1 text-xl font-semibold text-leaf-900 dark:text-white">{d.title}</h1>
      <p className="mb-6 text-sm text-leaf-900/50 dark:text-white/50">{d.intro}</p>

      {/* 1. Плашка балансу Grok AI — за прямим запитом користувача
          ("сделай как у самого Grok ai") ПІСЛЯ трьох невдалих спроб
          самостійно вирахувати число через недокументоване API
          (щоразу давало ІНШЕ, дедалі менш точне значення). Замість
          відтворення числа — пряме посилання на РЕАЛЬНУ панель
          console.x.ai, джерело істини, яке ми намагались відтворити. */}
      <div className="mb-6 rounded-xl border border-leaf-800/10 bg-white p-4 dark:border-white/10 dark:bg-white/5">
        <p className="mb-1 text-xs text-leaf-900/50 dark:text-white/50">{d.balanceTitle}</p>
        {!balance ? (
          <p className="text-leaf-900/40 dark:text-white/40">{dict.common.loading}</p>
        ) : balance.consoleUrl !== null ? (
          <a
            href={balance.consoleUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-full bg-sun-500 px-4 py-2 text-sm font-medium text-leaf-900 hover:bg-sun-400"
          >
            {d.viewBalance}
          </a>
        ) : (
          <>
            <p className="text-lg font-medium text-leaf-900/40 dark:text-white/40">{d.balanceUnavailable}</p>
            <p className="mt-1 text-xs text-orange-600 dark:text-orange-400">{balance.diagnostic}</p>
          </>
        )}
      </div>

      {/* 2. Адміністративні витрати */}
      <div className="mb-6 rounded-xl border border-leaf-800/10 p-4 dark:border-white/10">
        <h2 className="mb-3 font-medium text-leaf-900 dark:text-white">{d.adminExpensesTitle}</h2>
        <div className="mb-3 grid grid-cols-1 gap-2 sm:grid-cols-4">
          <input
            placeholder={d.descriptionPlaceholder}
            value={expDescription}
            onChange={(e) => setExpDescription(e.target.value)}
            className="rounded-lg border border-leaf-800/20 px-3 py-2 text-sm sm:col-span-2 dark:border-white/20 dark:bg-leaf-900 dark:text-white"
          />
          <input
            placeholder={d.categoryPlaceholder}
            value={expCategory}
            onChange={(e) => setExpCategory(e.target.value)}
            className="rounded-lg border border-leaf-800/20 px-3 py-2 text-sm dark:border-white/20 dark:bg-leaf-900 dark:text-white"
          />
          <div className="flex gap-2">
            <input
              type="number"
              placeholder="$"
              value={expAmount}
              onChange={(e) => setExpAmount(e.target.value)}
              className="w-full rounded-lg border border-leaf-800/20 px-3 py-2 text-sm dark:border-white/20 dark:bg-leaf-900 dark:text-white"
            />
            <button
              onClick={addExpense}
              disabled={savingExpense}
              className="shrink-0 rounded-full bg-sun-500 px-4 py-2 text-sm font-medium text-leaf-900 disabled:opacity-50"
            >
              +
            </button>
          </div>
        </div>

        {!adminExpenses ? (
          <p className="text-leaf-900/50 dark:text-white/50">{dict.common.loading}</p>
        ) : adminExpenses.length === 0 ? (
          <p className="text-sm text-leaf-900/40 dark:text-white/40">{d.noAdminExpenses}</p>
        ) : (
          <>
            <p className="mb-2 text-sm text-leaf-900/70 dark:text-white/70">{d.totalLabel} ${totalAdminExpenses.toFixed(2)}</p>
            <div className="flex flex-col gap-1">
              {adminExpenses.map((e) => (
                <div key={e.id} className="flex items-center justify-between rounded-lg bg-leaf-50 px-3 py-1.5 text-sm dark:bg-white/5">
                  <span className="text-leaf-900 dark:text-white">
                    {e.description}
                    {e.category && <span className="ml-2 text-xs text-leaf-900/40 dark:text-white/40">{e.category}</span>}
                    <span className="ml-2 text-xs text-leaf-900/40 dark:text-white/40">{new Date(e.createdAt).toLocaleDateString('uk-UA')}</span>
                  </span>
                  <span className="flex items-center gap-3">
                    <span className="font-medium text-leaf-900 dark:text-white">${Number(e.amountUsd).toFixed(2)}</span>
                    <button onClick={() => deleteExpense(e.id)} className="text-xs text-red-600 underline dark:text-red-400">
                      {dict.common.delete}
                    </button>
                  </span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* 3. Витрати на ШІ по Telegram-користувачах */}
      <div className="mb-6 rounded-xl border border-leaf-800/10 p-4 dark:border-white/10">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-medium text-leaf-900 dark:text-white">{d.aiUsageTitle}</h2>
          <div className="flex gap-2">
            {PERIODS.map((p) => (
              <button
                key={p.label}
                onClick={() => setPeriodDays(p.days)}
                className={`rounded-full px-3 py-1 text-xs font-medium ${
                  periodDays === p.days ? 'bg-leaf-900 text-white' : 'bg-leaf-800/5 text-leaf-900/60 hover:bg-leaf-800/10 dark:bg-white/10 dark:text-white/60 dark:hover:bg-white/20'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {!usage ? (
          <p className="text-leaf-900/50 dark:text-white/50">{dict.common.loading}</p>
        ) : (
          <>
            <div className="mb-4 grid grid-cols-2 gap-4 sm:grid-cols-3">
              <div className="rounded-lg bg-leaf-50 p-3 dark:bg-white/5">
                <p className="text-xs text-leaf-900/50 dark:text-white/50">{d.aiCostLabel}</p>
                <p className="text-xl font-bold text-leaf-900 dark:text-white">${usage.totalCostUsd.toFixed(4)}</p>
              </div>
              <div className="rounded-lg bg-leaf-50 p-3 dark:bg-white/5">
                <p className="text-xs text-leaf-900/50 dark:text-white/50">{d.requestsLabel}</p>
                <p className="text-xl font-bold text-leaf-900 dark:text-white">{usage.totalRequests}</p>
              </div>
              <div className="rounded-lg bg-leaf-50 p-3 dark:bg-white/5">
                <p className="text-xs text-leaf-900/50 dark:text-white/50">{d.usersLabel}</p>
                <p className="text-xl font-bold text-leaf-900 dark:text-white">{usage.perUser.length}</p>
              </div>
            </div>

            {usage.perUser.length === 0 ? (
              <p className="text-leaf-900/50 dark:text-white/50">{d.noPeriodData}</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-leaf-800/10 text-left text-leaf-900/50 dark:border-white/10 dark:text-white/50">
                    <th className="py-2">{d.colUser}</th>
                    <th>{d.colRequests}</th>
                    <th>{d.colTokens}</th>
                    <th>{d.colCost}</th>
                  </tr>
                </thead>
                <tbody>
                  {usage.perUser.map((u) => (
                    <tr key={u.userId ?? u.sessionId} className="border-b border-leaf-800/5 dark:border-white/5">
                      <td className="py-2">
                        {u.telegramId ? (
                          <>
                            <span className="font-medium text-leaf-900 dark:text-white">{u.firstName ?? u.username ?? d.noName}</span>
                            <span className="ml-2 font-mono text-xs text-leaf-900/40 dark:text-white/40">tg:{u.telegramId}</span>
                          </>
                        ) : (
                          <span className="text-leaf-900/40 dark:text-white/40">{d.guestNoLogin}</span>
                        )}
                      </td>
                      <td className="text-leaf-900 dark:text-white">{u.requestCount}</td>
                      <td className="text-leaf-900 dark:text-white">{u.totalTokens.toLocaleString('uk-UA')}</td>
                      <td className="font-medium text-leaf-900 dark:text-white">${u.totalCostUsd.toFixed(4)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </>
        )}
      </div>

      <p className="mb-3 text-sm font-medium text-leaf-900 dark:text-white">
        {d.grandTotalLabel} ${grandTotal.toFixed(2)}
      </p>

      {/* 4. Лог витрат */}
      <div className="rounded-xl border border-leaf-800/10 p-4 dark:border-white/10">
        <h2 className="mb-3 font-medium text-leaf-900 dark:text-white">{d.logTitle}</h2>
        {!log ? (
          <p className="text-leaf-900/50 dark:text-white/50">{dict.common.loading}</p>
        ) : log.length === 0 ? (
          <p className="text-sm text-leaf-900/40 dark:text-white/40">{d.logEmpty}</p>
        ) : (
          <div className="flex flex-col gap-1">
            {log.map((entry) => (
              <div key={entry.id} className="flex items-center justify-between rounded-lg bg-leaf-50 px-3 py-1.5 text-sm dark:bg-white/5">
                <span className="text-leaf-900 dark:text-white">
                  <span className={`mr-2 rounded-full px-2 py-0.5 text-xs ${entry.type === 'ai_usage' ? 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300' : 'bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300'}`}>
                    {entry.type === 'ai_usage' ? d.typeAi : d.typeAdmin}
                  </span>
                  {entry.description}
                  <span className="ml-2 text-xs text-leaf-900/40 dark:text-white/40">{new Date(entry.createdAt).toLocaleString('uk-UA')}</span>
                </span>
                <span className="font-medium text-leaf-900 dark:text-white">${entry.amountUsd.toFixed(4)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
