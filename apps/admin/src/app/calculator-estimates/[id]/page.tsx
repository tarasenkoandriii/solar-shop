'use client';

import { useEffect, useState } from 'react';
import { Fragment } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { apiFetch } from '../../../lib/api';
import type { ProjectEstimateDetail, ProjectGoal } from '../../../lib/api';
import { Accordion } from '../../../components/Accordion';
import { useAdminLocale } from '../../../lib/locale-context';

// За прямим запитом користувача — "в админке дать возможность
// просмотра результатов детально на странице в том же дизайне
// (аккордеон)". READ-ONLY — адмін ПЕРЕГЛЯДАЄ чужий розрахунок, не діє
// від імені клієнта (немає степперів/кнопок "В кошик"/форми
// уточнення — на відміну від клієнтської сторінки, тут це були б дії
// не на своєму акаунті).
export default function CalculatorEstimateDetailPage() {
  const params = useParams<{ id: string }>();
  const [estimate, setEstimate] = useState<ProjectEstimateDetail | null | undefined>(undefined);
  // За прямим запитом користувача — "бізнес цілі показувати текстом
  // (лейбами)" — не сирими ключами (ENSURE_BACKUP_POWER тощо).
  const [goals, setGoals] = useState<ProjectGoal[]>([]);
  const { dict } = useAdminLocale();
  const d = dict.pages.calculatorEstimateDetail;
  // За прямим запитом користувача — "аудит... особое внимание
  // переводам" — знайдено: ці 2 константи були захардкоджені
  // українською незалежно від обраної мови, пропущені в
  // попередньому проході (розділ README).
  const CATEGORY_LABEL: Record<string, string> = {
    SOLAR_PANEL: dict.categoryLabelsPlural.solarPanel,
    BATTERY: dict.categoryLabelsPlural.battery,
    CONTROLLER: dict.categoryLabelsPlural.controller,
    INVERTER: dict.categoryLabelsPlural.inverter,
    CABLE: dict.categoryLabelsPlural.cable,
    CONNECTOR: dict.categoryLabelsPlural.connector,
  };
  // Ключі об'єкта ("фізичні"/"ОСББ"/"бізнес") — контракт з бекендом
  // (реальні значення поля clientType з БД, ті самі, що вже
  // FinancingFilters.tsx/CalculatorQuiz.tsx), НЕ перекладаються —
  // лише значення-лейбли з словника.
  const CLIENT_TYPE_LABEL: Record<string, string> = {
    фізичні: dict.clientTypeLabels.physical,
    ОСББ: dict.clientTypeLabels.osbb,
    бізнес: dict.clientTypeLabels.business,
  };
  const STATUS_LABEL: Record<ProjectEstimateDetail['status'], string> = {
    DRAFT: d.statusDraft,
    FINALIZED: d.statusFinalized,
    SENT: d.statusSent,
    CONVERTED_TO_ORDER: d.statusConverted,
  };
  const GENERATION_LABEL: Record<ProjectEstimateDetail['generationStatus'], string> = {
    NOT_REQUESTED: d.generationNotRequested,
    QUEUED: d.generationQueued,
    PROCESSING: d.generationProcessing,
    COMPLETED: d.generationCompleted,
    FAILED: d.generationFailed,
  };

  useEffect(() => {
    apiFetch<ProjectEstimateDetail>(`/admin/calculator/estimates/${params.id}`)
      .then(setEstimate)
      .catch(() => setEstimate(null));
    apiFetch<ProjectGoal[]>('/admin/project-goals').then(setGoals).catch(() => setGoals([]));
  }, [params.id]);

  if (estimate === undefined) return <p className="text-leaf-900/50 dark:text-white/50">{d.loading}</p>;
  if (estimate === null) return <p className="text-leaf-900/50 dark:text-white/50">{d.notFound}</p>;

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

  const goalLabels = input?.goals?.length
    ? input.goals.map((key) => goals.find((g) => g.key === key)?.label ?? key)
    : [];

  const grouped = estimate.recommendedSpec.reduce<Record<string, ProjectEstimateDetail['recommendedSpec']>>((acc, item) => {
    (acc[item.category] ??= []).push(item);
    return acc;
  }, {});

  // За прямим запитом користувача — "телеграм изернейм замовника -
  // дає можливість зразу написати". Клікабельне посилання лише якщо
  // username РЕАЛЬНО є (не в усіх Telegram-акаунтів він встановлений)
  // — інакше чесний fallback, не вигадана посилання без сенсу.
  const customerName = estimate.user
    ? [estimate.user.firstName, estimate.user.lastName].filter(Boolean).join(' ') || d.customerNoName
    : d.guestSession;

  return (
    <div>
      <Link href="/calculator-estimates" className="mb-3 inline-block text-sm text-leaf-700 underline dark:text-sun-500">
        {d.backToList}
      </Link>
      <h1 className="mb-1 text-xl font-semibold text-leaf-900 dark:text-white">{estimate.name}</h1>
      <p className="mb-1 text-sm text-leaf-900/50 dark:text-white/50">
        {estimate.city ? `${estimate.city} · ` : ''}{d.statusLabel} {STATUS_LABEL[estimate.status]}
      </p>
      <p className="mb-6 text-sm text-leaf-900/70 dark:text-white/70">
        {customerName}
        {estimate.user?.username ? (
          <>
            {' · '}
            <a href={`https://t.me/${estimate.user.username}`} target="_blank" rel="noopener noreferrer" className="text-leaf-700 underline dark:text-sun-500">
              @{estimate.user.username} →
            </a>
          </>
        ) : estimate.user ? (
          <span className="text-leaf-900/40 dark:text-white/40"> · {d.noUsername}</span>
        ) : null}
      </p>

      <Accordion
        defaultOpenKey="spec"
        sections={[
          {
            key: 'quiz',
            title: d.quizTab,
            content: !input ? (
              <p className="text-sm text-leaf-900/50 dark:text-white/50">{d.quizUnavailable}</p>
            ) : (
              <div className="flex flex-col gap-2">
                <p className="text-sm text-leaf-900/70 dark:text-white/70">
                  <span className="font-medium text-leaf-900 dark:text-white">{d.cityLabel}</span> {input.city || '—'}
                </p>
                <p className="text-sm text-leaf-900/70 dark:text-white/70">
                  <span className="font-medium text-leaf-900 dark:text-white">{d.budgetLabel}</span> {input.budgetUsd ? `$${input.budgetUsd}` : '—'}
                </p>
                <p className="text-sm text-leaf-900/70 dark:text-white/70">
                  <span className="font-medium text-leaf-900 dark:text-white">{d.goalsLabel}</span> {goalLabels.length ? goalLabels.join(', ') : '—'}
                </p>
                <p className="text-sm text-leaf-900/70 dark:text-white/70">
                  <span className="font-medium text-leaf-900 dark:text-white">{d.consumptionLabel}</span>{' '}
                  {input.dailyConsumptionKwh ? `${input.dailyConsumptionKwh} ${d.consumptionSuffix}` : d.notSpecified}
                </p>
                <p className="text-sm text-leaf-900/70 dark:text-white/70">
                  <span className="font-medium text-leaf-900 dark:text-white">{d.cableLabel}</span>{' '}
                  {input.cableRunMeters ? `${input.cableRunMeters} ${d.meterSuffix}` : d.notSpecified}
                </p>
                <p className="text-sm text-leaf-900/70 dark:text-white/70">
                  <span className="font-medium text-leaf-900 dark:text-white">{d.inverterLabel}</span>{' '}
                  {input.hasExistingInverter ? d.inverterExisting : d.inverterNew}
                </p>
                <p className="text-sm text-leaf-900/70 dark:text-white/70">
                  <span className="font-medium text-leaf-900 dark:text-white">{d.scalingLabel}</span>{' '}
                  {input.scalingStrategy === 'IDENTICAL_SEGMENTS' ? d.scalingSegments : d.scalingHeadroom}
                </p>
                <p className="text-sm text-leaf-900/70 dark:text-white/70">
                  <span className="font-medium text-leaf-900 dark:text-white">{d.financingLabel}</span>{' '}
                  {input.financingNeeded
                    ? `${d.financingOwnFunds} ${input.ownFundsPercent ?? '—'}%${input.clientType ? `, ${CLIENT_TYPE_LABEL[input.clientType] ?? input.clientType}` : ''}`
                    : d.financingNone}
                </p>
              </div>
            ),
          },
          {
            key: 'spec',
            title: d.specTab,
            badge: `$${Number(estimate.totalUsd).toFixed(0)}`,
            content: (
              <div className="flex flex-col gap-4">
                <table className="w-full text-sm">
                  <tbody>
                    {Object.entries(grouped).map(([category, groupItems]) => (
                      <Fragment key={category}>
                        <tr className="border-b border-leaf-800/10 bg-leaf-50 dark:border-white/10 dark:bg-white/5">
                          <td colSpan={3} className="py-2 pl-2 font-medium text-leaf-900 dark:text-white">
                            {CATEGORY_LABEL[category] ?? category}
                          </td>
                        </tr>
                        {groupItems.map((item) => (
                          <tr key={item.productId} className="border-b border-leaf-800/5 dark:border-white/5">
                            <td className="py-2 pl-2 text-leaf-900 dark:text-white">
                              {item.name}
                              <p className="text-xs text-leaf-900/40 dark:text-white/40">{item.articleNumber}</p>
                            </td>
                            <td className="text-leaf-900/60 dark:text-white/60">
                              {item.quantity}
                              {item.soldByMeter ? ` ${d.meterSuffix}` : ` ${d.pcsSuffix}`}
                            </td>
                            <td className="text-right pr-2 font-medium text-leaf-900 dark:text-white">${(item.priceUsd * item.quantity).toFixed(2)}</td>
                          </tr>
                        ))}
                      </Fragment>
                    ))}
                  </tbody>
                </table>
                <div className="flex items-center justify-between rounded-xl bg-leaf-50 p-3 dark:bg-white/5">
                  <span className="font-semibold text-leaf-900 dark:text-white">{d.totalLabel}</span>
                  <span className="text-lg font-bold text-leaf-800 dark:text-sun-500">${Number(estimate.totalUsd).toFixed(2)}</span>
                </div>
                {estimate.exchangeRateUah && (
                  <p className="text-xs text-leaf-900/40 dark:text-white/40">
                    {d.nbuRateNote} {estimate.exchangeRateDate ? new Date(estimate.exchangeRateDate).toLocaleDateString('uk-UA') : ''}:{' '}
                    {Number(estimate.exchangeRateUah).toFixed(4)} ₴/$
                    {estimate.totalUah && ` · ${Number(estimate.totalUah).toFixed(2)} ₴`}
                  </p>
                )}
              </div>
            ),
          },
          {
            key: 'reasoning',
            title: d.reasoningTab,
            content: !estimate.selectionReasoning ? (
              <p className="text-sm text-leaf-900/50 dark:text-white/50">{d.reasoningUnavailable}</p>
            ) : (
              <div className="flex flex-col gap-4">
                <div className="rounded-xl bg-leaf-50 p-3 dark:bg-white/5">
                  <p className="mb-1 text-sm font-medium text-leaf-900 dark:text-white">{d.goalsAlignmentTitle}</p>
                  <p className="text-sm text-leaf-900/70 dark:text-white/70">{estimate.selectionReasoning.goalsAlignmentText}</p>
                </div>
                <div className="rounded-xl bg-leaf-50 p-3 dark:bg-white/5">
                  <p className="mb-1 text-sm font-medium text-leaf-900 dark:text-white">{d.recommendationsTitle}</p>
                  <p className="text-sm text-leaf-900/70 dark:text-white/70">
                    {estimate.trustRecommendations ? d.recommendationsOn : d.recommendationsOff}
                  </p>
                </div>
                <div className="flex flex-col gap-2">
                  {estimate.selectionReasoning.reasoning.map((r, i) => (
                    <div key={i} className="rounded-xl border border-leaf-800/10 p-3 dark:border-white/10">
                      <div className="mb-1 flex items-center justify-between">
                        <span className="text-xs font-medium uppercase text-leaf-900/40 dark:text-white/40">{CATEGORY_LABEL[r.category] ?? r.category}</span>
                        <span className="text-sm font-medium text-leaf-900 dark:text-white">${r.priceUsd.toFixed(2)}</span>
                      </div>
                      <p className="mb-1 text-sm text-leaf-900 dark:text-white">{r.productName}</p>
                      <p className="text-xs text-leaf-900/60 dark:text-white/60">{r.reasoning}</p>
                      {r.reliabilityInfluencedChoice && (
                        <p className="mt-1 text-xs font-medium text-sun-600">
                          {d.choiceChangedNote} ({r.reliabilityScore}/10, {r.reliabilityReviewCount} {d.reviewsSuffix})
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ),
          },
          {
            key: 'documents',
            title: d.documentsTab,
            badge: GENERATION_LABEL[estimate.generationStatus],
            content: (
              <div className="flex flex-col gap-2 text-sm">
                <p className="text-leaf-900/70 dark:text-white/70">
                  <span className="font-medium text-leaf-900 dark:text-white">{d.statusLabelShort}</span> {GENERATION_LABEL[estimate.generationStatus]}
                </p>
                {estimate.annotationText && (
                  <div className="mt-2 whitespace-pre-wrap rounded-lg bg-leaf-50 p-3 text-leaf-900/70 dark:bg-white/5 dark:text-white/70">{estimate.annotationText}</div>
                )}
                {estimate.generationStatus === 'NOT_REQUESTED' && (
                  <p className="text-leaf-900/40 dark:text-white/40">{d.noBusinessPlanYet}</p>
                )}
              </div>
            ),
          },
          {
            key: 'export',
            title: d.exportTab,
            content: estimate.pdfUrl ? (
              <a href={estimate.pdfUrl} target="_blank" rel="noopener noreferrer" className="text-leaf-700 underline dark:text-sun-500">
                {d.openPdf}
              </a>
            ) : (
              <p className="text-sm text-leaf-900/50 dark:text-white/50">{d.pdfNotGenerated}</p>
            ),
          },
        ]}
      />
    </div>
  );
}
