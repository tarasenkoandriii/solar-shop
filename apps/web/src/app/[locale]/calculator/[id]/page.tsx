'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { isLocale, type Locale } from '../../../../lib/i18n';
import { clientApi, getOrCreateSessionId } from '../../../../lib/client-api';
import type { CalculatorStepResult, ProjectEstimate, ResolvedSpecItem } from '../../../../lib/api';
import { SpecTable } from '../../../../components/SpecTable';
import { SchemaDiagram } from '../../../../components/SchemaDiagram';
import { ExportPanel } from '../../../../components/ExportPanel';
import { DocumentChecklist } from '../../../../components/DocumentChecklist';
import { GridConnectionDocuments } from '../../../../components/GridConnectionDocuments';
import { PriceTag } from '../../../../components/PriceTag';
import { Accordion } from '../../../../components/Accordion';
import { QuizSummary } from '../../../../components/QuizSummary';
import { SelectionReasoning } from '../../../../components/SelectionReasoning';
import { useExchangeRate } from '../../../../lib/use-exchange-rate';

export default function CalculatorResultPage() {
  const params = useParams<{ locale: string; id: string }>();
  const locale = (isLocale(params.locale) ? params.locale : 'uk') as Locale;
  const rateUah = useExchangeRate();

  const [estimate, setEstimate] = useState<ProjectEstimate | null | undefined>(undefined);
  const [blockDiagramSvg, setBlockDiagramSvg] = useState<string | null>(null);
  const [refinementText, setRefinementText] = useState('');
  const [refining, setRefining] = useState(false);
  const [refineError, setRefineError] = useState<string | null>(null);
  const [budgetNote, setBudgetNote] = useState<{ withinBudget: boolean; gap: number | null } | null>(null);
  const [finalizing, setFinalizing] = useState(false);
  const [showChecklist, setShowChecklist] = useState(false);

  async function load() {
    try {
      const data = await clientApi<ProjectEstimate>(`/calculator/${params.id}?sessionId=${getOrCreateSessionId()}`);
      setEstimate(data);
    } catch {
      setEstimate(null);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  async function handleRefine(e: React.FormEvent) {
    e.preventDefault();
    if (!refinementText.trim()) return;
    setRefining(true);
    setRefineError(null);
    try {
      const result = await clientApi<CalculatorStepResult>(
        `/calculator/${params.id}/refine?sessionId=${getOrCreateSessionId()}`,
        { method: 'POST', body: JSON.stringify({ text: refinementText }) },
      );
      setEstimate(result.estimate);
      setBlockDiagramSvg(result.blockDiagramSvg);
      setBudgetNote({ withinBudget: result.withinBudget, gap: result.budgetGapUsd });
      setRefinementText('');
    } catch (err) {
      setRefineError(err instanceof Error ? err.message : 'Не вдалося перерахувати, спробуйте ще раз');
    } finally {
      setRefining(false);
    }
  }

  async function handleFinalize() {
    setFinalizing(true);
    try {
      const updated = await clientApi<ProjectEstimate>(
        `/calculator/${params.id}/finalize?sessionId=${getOrCreateSessionId()}`,
        { method: 'POST' },
      );
      setEstimate(updated);
    } finally {
      setFinalizing(false);
    }
  }

  function handleSpecChange(items: ResolvedSpecItem[]) {
    if (!estimate) return;
    const totalUsd = items.reduce((s, i) => s + i.priceUsd * i.quantity, 0).toFixed(2);
    setEstimate({ ...estimate, recommendedSpec: items, totalUsd });
  }

  if (estimate === undefined) return <div className="mx-auto max-w-3xl px-4 py-10 text-leaf-900/50">Завантаження...</div>;
  if (estimate === null) return <div className="mx-auto max-w-3xl px-4 py-10 text-leaf-900/50">Розрахунок не знайдено</div>;

  // За прямим запитом користувача — "показывать как аккордеон / перша
  // вкладка квиз / друга специфікація / третя генерація пакета
  // документації / четверта експорт результатів". Кожна секція —
  // логічне групування вже наявного контенту (не новий функціонал,
  // лише реорганізація), у ТОМУ ПОРЯДКУ, що прямо вказав користувач.
  const specSection = (
    <div className="flex flex-col gap-4">
      {budgetNote && !budgetNote.withinBudget && (
        <p className="rounded-lg bg-orange-50 p-3 text-sm text-orange-700">
          У бюджет повністю не вкладається — найближчий варіант дорожчий на ${budgetNote.gap?.toFixed(2)}. Спробуйте
          збільшити бюджет або уточнити вимоги нижче.
        </p>
      )}

      {/* Аудит 27.08.2026: якщо ємність акумуляторів у каталозі не
          вказана, кількість у кошторисі — заглушка (1 шт.), і людина має
          побачити це одразу, а не знайти всередині згорнутого блоку
          "Обґрунтування вибору". Читаємо зі збереженого estimate, а не з
          відповіді start/refine: ця сторінка відповіді не бачить. */}
      {estimate.selectionReasoning?.batteryWarning && (
        <p className="rounded-lg bg-orange-50 p-3 text-sm text-orange-700">{estimate.selectionReasoning.batteryWarning}</p>
      )}

      {!estimate.cableRunMeters && estimate.recommendedSpec.some((i) => i.category === 'CABLE') && (
        <p className="rounded-lg bg-blue-50 p-3 text-sm text-blue-700">
          Відстань до точки підключення споживача не вказана — кабель у кошторисі розрахований за орієнтовним
          дефолтом (15м). Для точнішого розрахунку почніть новий розрахунок і вкажіть реальну відстань на кроці
          про споживання.
        </p>
      )}

      <SpecTable estimateId={estimate.id} items={estimate.recommendedSpec} onItemsChange={handleSpecChange} locale={locale} />

      <div className="flex items-center justify-between rounded-2xl border border-leaf-800/10 bg-leaf-50 p-4">
        <span className="text-lg font-semibold text-leaf-900">Разом за проєктом</span>
        <div className="text-right">
          <p className="text-xl font-bold text-leaf-800">
            <PriceTag priceUsd={estimate.totalUsd} rateUah={rateUah} />
          </p>
          {estimate.exchangeRateUah && (
            <p className="text-xs text-leaf-900/40">
              по курсу НБУ на {estimate.exchangeRateDate ? new Date(estimate.exchangeRateDate).toLocaleDateString('uk-UA') : ''}:{' '}
              {Number(estimate.exchangeRateUah).toFixed(4)} ₴/$
            </p>
          )}
        </div>
      </div>

      {(blockDiagramSvg || estimate.schemaTopology) && blockDiagramSvg && <SchemaDiagram svg={blockDiagramSvg} title="Блочна схема" />}

      {estimate.status === 'DRAFT' && (
        <form onSubmit={handleRefine} className="flex flex-col gap-3 rounded-2xl border border-leaf-800/10 bg-white p-4">
          <label className="text-sm font-medium text-leaf-900">Опишіть побажання — перерахуємо з урахуванням контексту</label>
          <textarea
            value={refinementText}
            onChange={(e) => setRefinementText(e.target.value)}
            placeholder='Наприклад: "хочу автономність на 3 дні без сонця" або "бюджет можна збільшити до $2000"'
            rows={3}
            className="rounded-lg border border-leaf-800/20 px-3 py-2 text-sm"
          />
          {refineError && <p className="text-sm text-red-600">{refineError}</p>}
          <button
            type="submit"
            disabled={refining || !refinementText.trim()}
            className="w-fit rounded-full bg-sun-500 px-5 py-2 text-sm font-medium text-leaf-900 disabled:opacity-50"
          >
            {refining ? 'Перераховуємо...' : 'Перерахувати'}
          </button>
        </form>
      )}

      {estimate.status === 'DRAFT' && (
        <button
          onClick={handleFinalize}
          disabled={finalizing}
          className="w-full rounded-full bg-leaf-900 py-3 text-center font-medium text-white hover:bg-leaf-800 disabled:opacity-50"
        >
          {finalizing ? '...' : 'Завершити розрахунок (зафіксувати курс)'}
        </button>
      )}
    </div>
  );

  // За прямим запитом користувача — "Если одна из бизнес целей
  // создать генерацию то добавить в список документов необходимые
  // для подачи заявки на подключение к общественным электрическим
  // сетям". Незалежно від кредиту (не пов'язано з financingNeeded) —
  // окрема тема, показується завжди, коли релевантна.
  const needsGridConnectionDocs = estimate.goals.includes('GREEN_TARIFF') || estimate.goals.includes('BILL_REDUCTION');

  const documentsSection = (
    <div className="flex flex-col gap-4">
      {needsGridConnectionDocs && <GridConnectionDocuments />}
      {estimate.financingNeeded || showChecklist || estimate.generationStatus !== 'NOT_REQUESTED' ? (
        <DocumentChecklist estimate={estimate} onQueued={setEstimate} />
      ) : (
        <button
          onClick={() => setShowChecklist(true)}
          className="w-full rounded-full border border-dashed border-leaf-800/30 py-2.5 text-center text-sm text-leaf-900/60 hover:border-leaf-800/60"
        >
          💳 Потрібен бізнес-план для кредиту?
        </button>
      )}
    </div>
  );

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="mb-1 text-2xl font-semibold text-leaf-900">{estimate.name}</h1>
      <p className="mb-6 text-sm text-leaf-900/50">
        {estimate.city ? `${estimate.city} · ` : ''}
        Статус: {estimate.status === 'DRAFT' ? 'Чернетка' : estimate.status === 'FINALIZED' ? 'Зафіксовано' : estimate.status}
      </p>

      <Accordion
        defaultOpenKey="spec"
        sections={[
          { key: 'quiz', title: '1. Квиз', content: <QuizSummary estimate={estimate} /> },
          {
            key: 'spec',
            title: '2. Специфікація',
            badge: `$${Number(estimate.totalUsd).toFixed(0)}`,
            content: specSection,
          },
          // За прямим запитом користувача — "как ещё одну вкладку
          // аккордеона написать обоснование выбора компонентов
          // системы". Розміщено ПІСЛЯ специфікації (пояснює саме її),
          // ПЕРЕД документацією/експортом.
          { key: 'reasoning', title: '3. Обґрунтування вибору', content: <SelectionReasoning estimate={estimate} /> },
          { key: 'documents', title: '4. Генерація пакета документації', content: documentsSection },
          { key: 'export', title: '5. Експорт результатів', content: <ExportPanel estimate={estimate} /> },
        ]}
      />
    </div>
  );
}
