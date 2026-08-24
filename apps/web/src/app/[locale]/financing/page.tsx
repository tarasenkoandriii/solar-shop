import { notFound } from 'next/navigation';
import { isLocale, type Locale } from '../../../lib/i18n';
import { apiGet } from '../../../lib/api';
import { FinancingFilters } from '../../../components/FinancingFilters';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export interface ReviewAggregate {
  reviewCount: number;
  avgBusinessPlanQuality: number | null;
  avgBankResponsiveness: number | null;
  avgProcessingSpeed: number | null;
  avgApplicationSuccess: number | null;
  avgCoveragePercent: number | null;
}

export interface FinancingProgramPublic {
  id: string;
  name: string;
  eligibility: string;
  description: string;
  url: string;
  minLoanUsd: string | null;
  maxLoanUsd: string | null;
  imageUrl: string | null;
  lastVerifiedAt: string | null;
  reviewAggregate: ReviewAggregate | null;
}

// За прямим запитом користувача — середній бал по 4 шкалах разом, для
// компактного відображення на картці (детальний розклад по кожній
// шкалі — лише на сторінці відгуків конкретного банку). НЕ export —
// Next.js App Router дозволяє лише певний фіксований набір іменованих
// експортів із page.tsx (default/metadata/generateMetadata тощо),
// довільна допоміжна функція ламає збірку ("is not a valid Page export
// field") — знайдено прямим прогоном npm run build, не здогадкою.
function overallScore(agg: ReviewAggregate): number | null {
  const scores = [agg.avgBusinessPlanQuality, agg.avgBankResponsiveness, agg.avgProcessingSpeed, agg.avgApplicationSuccess].filter(
    (s): s is number => s !== null,
  );
  if (scores.length === 0) return null;
  return scores.reduce((sum, s) => sum + s, 0) / scores.length;
}

// ТЗ п.32.3 — публічна сторінка /financing, SEO-контент, не лише допоміжний
// для бізнес-плану.
//
// Перероблено 19.08.2026 за запитом користувача — "плитки компактніше і в
// 2 колонки, продумати верстку і стилі" (реальний скріншот показав: 1
// колонка, max-w-3xl, великі відступи p-5, картинка h-40 — сторінка
// займала багато вертикального простору на мало інформації). Container
// розширено до max-w-5xl (між шириною каталогу max-w-6xl і статей
// max-w-4xl — узгоджено з рештою сайту, не довільне число), grid
// grid-cols-1 md:grid-cols-2 — 1 колонка на мобільному, 2 на десктопі.
// Працює в межах уже встановленої палітри сайту (leaf-900/sun-500,
// rounded-2xl картки) — це сторінка всередині наявного сайту, не окремий
// лендинг, тому свідомо НЕ вигадується новий візуальний ідентитет для
// однієї сторінки (frontend-design skill: "reshape existing UI" —
// послідовність із рештою сайту важливіша за унікальність тут).
export default async function FinancingPage({
  params,
  searchParams,
}: {
  params: { locale: string };
  searchParams: { eligibility?: string; sort?: string };
}) {
  if (!isLocale(params.locale)) notFound();
  const locale = params.locale as Locale;

  const qs = new URLSearchParams();
  if (searchParams.eligibility) qs.set('eligibility', searchParams.eligibility);
  if (searchParams.sort) qs.set('sort', searchParams.sort);

  const programs = await apiGet<FinancingProgramPublic[]>(`/financing-programs?${qs.toString()}`, 3600).catch(
    () => [] as FinancingProgramPublic[],
  );

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="mb-2 text-2xl font-semibold text-leaf-900">Кредитування та гранти на СЕС</h1>
      <p className="mb-6 max-w-2xl text-sm text-leaf-900/60">
        Актуальні програми кредитування, державні програми та гранти на встановлення сонячних електростанцій в
        Україні.
      </p>

      <FinancingFilters />

      {programs.length === 0 ? (
        <p className="text-leaf-900/50">Наразі немає активних програм за цим фільтром.</p>
      ) : (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          {programs.map((p) => (
            <div
              key={p.id}
              className="flex flex-col overflow-hidden rounded-2xl border border-leaf-800/10 bg-white transition-shadow hover:shadow-md"
            >
              {/* Звичайний <img>, не next/image — джерела картинок
                  непередбачувані (будь-який банк/держсайт), суворий
                  remotePatterns allowlist next/image тут не підходить. Сирий
                  imageUrl, знайдений ІІ, не перевантажений на власний Blob
                  (на відміну від обкладинок статей) — свідоме спрощення,
                  задокументоване в README. h-28 (не h-40, як було) —
                  компактніше, object-contain + фон — уся картинка видима
                  цілком без обрізки країв при нестандартних пропорціях. */}
              {p.imageUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={p.imageUrl} alt={p.name} className="h-28 w-full bg-leaf-50 object-contain" loading="lazy" />
              )}
              <div className="flex flex-1 flex-col p-4">
                <div className="mb-2 flex items-start justify-between gap-2">
                  <h2 className="font-semibold leading-snug text-leaf-900">{p.name}</h2>
                  <span className="shrink-0 rounded-full bg-leaf-50 px-2 py-0.5 text-[11px] font-medium text-leaf-800/70">
                    {p.eligibility}
                  </span>
                </div>
                <p className="mb-3 line-clamp-3 text-sm text-leaf-900/70">{p.description}</p>
                {(p.minLoanUsd || p.maxLoanUsd) && (
                  <p className="mb-3 text-sm font-medium text-leaf-900">
                    {p.minLoanUsd ? `$${p.minLoanUsd}` : '—'} – {p.maxLoanUsd ? `$${p.maxLoanUsd}` : '—'}
                  </p>
                )}
                {/* За прямим запитом користувача — "агрегацию отзывов
                    показать на существующих карточках". Середній бал по
                    4 шкалах (overallScore) + кількість відгуків,
                    посилання на детальну сторінку відгуків цього банку.
                    Якщо відгуків ще немає — заохочення залишити перший,
                    не порожнеча. */}
                <a href={`/${locale}/financing/${p.id}/reviews`} className="mb-3 flex items-center gap-1.5 text-xs">
                  {p.reviewAggregate && p.reviewAggregate.reviewCount > 0 ? (
                    <>
                      <span className="font-semibold text-sun-600">☀ {overallScore(p.reviewAggregate)?.toFixed(1)}/10</span>
                      <span className="text-leaf-900/50 underline">
                        {p.reviewAggregate.reviewCount} відгук{p.reviewAggregate.reviewCount === 1 ? '' : p.reviewAggregate.reviewCount >= 2 && p.reviewAggregate.reviewCount <= 4 ? 'и' : 'ів'}
                      </span>
                    </>
                  ) : (
                    <span className="text-leaf-900/40 underline">Залишити перший відгук</span>
                  )}
                </a>
                <div className="mt-auto flex items-center justify-between gap-3 pt-1">
                  <a
                    href={p.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block shrink-0 rounded-full bg-sun-500 px-4 py-1.5 text-xs font-medium text-leaf-900 hover:bg-sun-400"
                  >
                    Офіційна сторінка →
                  </a>
                  {p.lastVerifiedAt && (
                    <p className="text-[11px] text-leaf-900/40">
                      Перевірено {new Date(p.lastVerifiedAt).toLocaleDateString('uk-UA')}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <p className="mt-8 text-xs text-leaf-900/40">
        Це не є фінансовою консультацією. Умови кредитування, ставки та вимоги до позичальника уточнюйте
        безпосередньо в банку/операторі програми на дату звернення.
      </p>
    </div>
  );
}
