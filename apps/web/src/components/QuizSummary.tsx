'use client';

import { useEffect, useState } from 'react';
import { clientApi } from '../lib/client-api';
import type { ProjectEstimate, ProjectGoal } from '../lib/api';

const BUDGET_RANGES = [
  { label: '$300–700', min: 300, max: 700 },
  { label: '$700–1500', min: 700, max: 1500 },
  { label: '$1500–3500', min: 1500, max: 3500 },
  { label: '$3500+', min: 3500, max: null },
];

// За прямим запитом користувача — ті самі значення, що вже
// FinancingFilters.tsx на /financing та CalculatorQuiz.tsx.
const CLIENT_TYPE_LABEL: Record<string, string> = {
  фізичні: 'Фізична особа',
  ОСББ: 'ОСББ/ЖБК',
  бізнес: 'Бізнес',
};

// За прямим запитом користувача — "перша вкладка квиз" в акордеоні
// результатів. Перша `type: 'quiz'` запис у conversationLog містить
// ВЕСЬ вихідний DTO (`input`) — не потрібно перепитувати окремі кроки,
// достатньо прочитати вже збережені відповіді. Той самий формат
// "Питання: Відповідь", що вже в CalculatorQuiz.tsx (розділ README) —
// консистентний вигляд між проходженням квизу й переглядом
// результату.
export function QuizSummary({ estimate }: { estimate: ProjectEstimate }) {
  const [goals, setGoals] = useState<ProjectGoal[] | null>(null);

  useEffect(() => {
    clientApi<ProjectGoal[]>('/project-goals').then(setGoals).catch(() => setGoals([]));
  }, []);

  const quizEntry = estimate.conversationLog.find((e) => e.type === 'quiz');
  const input = quizEntry?.input as
    | {
        city?: string;
        budgetUsd?: number;
        goals?: string[];
        dailyConsumptionKwh?: number;
        cableRunMeters?: number;
        hasExistingInverter?: boolean;
        scalingStrategy?: 'HEADROOM' | 'IDENTICAL_SEGMENTS';
        financingNeeded?: boolean;
        ownFundsPercent?: number;
        clientType?: string;
      }
    | undefined;

  if (!input) {
    return <p className="text-sm text-leaf-900/50">Дані квизу недоступні для цього розрахунку.</p>;
  }

  const range = BUDGET_RANGES.find((r) => (r.max ?? r.min * 2) === input.budgetUsd);
  const goalLabels = goals && input.goals ? goals.filter((g) => input.goals!.includes(g.key)).map((g) => g.label) : input.goals;

  const rows = [
    { label: 'Місто', value: input.city || '—' },
    { label: 'Бюджет', value: range ? range.label : input.budgetUsd ? `$${input.budgetUsd}` : '—' },
    { label: 'Цілі', value: goalLabels && goalLabels.length ? goalLabels.join(', ') : '—' },
    {
      label: 'Споживання',
      value: input.dailyConsumptionKwh ? `${input.dailyConsumptionKwh} кВт·год/добу` : 'не вказано',
    },
    { label: 'Кабель зниження', value: input.cableRunMeters ? `${input.cableRunMeters} м` : 'не вказано' },
    { label: 'Інвертор', value: input.hasExistingInverter ? 'вже є (доповнення до системи)' : 'потрібен новий' },
    {
      label: 'Поетапне докуповування',
      value: input.scalingStrategy === 'IDENTICAL_SEGMENTS' ? 'два менших контролери' : 'один контролер із запасом',
    },
    {
      label: 'Фінансування',
      value: input.financingNeeded
        ? `так, власних коштів ${input.ownFundsPercent ?? '—'}%${input.clientType ? `, ${CLIENT_TYPE_LABEL[input.clientType] ?? input.clientType}` : ''}`
        : 'не потрібне',
    },
  ];

  return (
    <div className="flex flex-col gap-2">
      {rows.map((r) => (
        <p key={r.label} className="text-sm text-leaf-900/70">
          <span className="font-medium text-leaf-900">{r.label}:</span> {r.value}
        </p>
      ))}
    </div>
  );
}
