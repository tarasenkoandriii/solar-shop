import type { ProjectEstimate } from '../lib/api';

const CATEGORY_LABEL: Record<string, string> = {
  SOLAR_PANEL: 'Сонячні панелі',
  BATTERY: 'Акумулятори',
  CONTROLLER: 'Контролери заряду',
  INVERTER: 'Інвертори',
  CABLE: 'Кабель',
  CONNECTOR: 'Конектори',
};

// За прямим запитом користувача — "написать обоснование выбора
// компонентов системы, и учтены ли рекомендации при подборе и какие,
// соответствие бизнес целям тоже внести". Читає ВЖЕ ЗБЕРЕЖЕНИЙ
// `estimate.selectionReasoning` (детерміновано записаний бекендом у
// calculator.service.ts на момент розрахунку) — не генерує пояснення
// на льоту, показує РЕАЛЬНУ причину вибору кожного компонента.
export function SelectionReasoning({ estimate }: { estimate: ProjectEstimate }) {
  if (!estimate.selectionReasoning) {
    return <p className="text-sm text-leaf-900/50">Обґрунтування недоступне для цього розрахунку.</p>;
  }

  const { reasoning, goalsAlignmentText } = estimate.selectionReasoning;

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-xl bg-leaf-50 p-3">
        <p className="mb-1 text-sm font-medium text-leaf-900">Відповідність цілям проєкту</p>
        <p className="text-sm text-leaf-900/70">{goalsAlignmentText}</p>
      </div>

      <div className="rounded-xl bg-leaf-50 p-3">
        <p className="mb-1 text-sm font-medium text-leaf-900">Врахування рекомендацій покупців</p>
        <p className="text-sm text-leaf-900/70">
          {estimate.trustRecommendations
            ? 'Увімкнено — при підборі враховувався рейтинг надійності товарів на основі відгуків покупців (деталі по кожному компоненту нижче).'
            : 'Вимкнено — компоненти підбиралися лише за ціною/технічними параметрами, без урахування відгуків покупців.'}
        </p>
      </div>

      <div className="flex flex-col gap-2">
        {reasoning.map((r, i) => (
          <div key={i} className="rounded-xl border border-leaf-800/10 p-3">
            <div className="mb-1 flex items-center justify-between">
              <span className="text-xs font-medium uppercase text-leaf-900/40">{CATEGORY_LABEL[r.category] ?? r.category}</span>
              <span className="text-sm font-medium text-leaf-900">${r.priceUsd.toFixed(2)}</span>
            </div>
            <p className="mb-1 text-sm text-leaf-900">{r.productName}</p>
            <p className="text-xs text-leaf-900/60">{r.reasoning}</p>
            {r.reliabilityInfluencedChoice && (
              <p className="mt-1 text-xs font-medium text-sun-600">
                ☀ Вибір змінено на користь надійності ({r.reliabilityScore}/10, {r.reliabilityReviewCount} відгуків)
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
