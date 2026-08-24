import { notFound } from 'next/navigation';
import Link from 'next/link';
import { isLocale, type Locale } from '../../../../../lib/i18n';
import { apiGet } from '../../../../../lib/api';
import { ReviewForm } from '../../../../../components/ReviewForm';

interface FinancingProgramDetail {
  id: string;
  name: string;
  eligibility: string;
  url: string;
}

export interface PublicReview {
  id: string;
  city: string;
  branch: string;
  businessPlanQualityScore: number;
  bankResponsivenessScore: number;
  processingSpeedScore: number;
  applicationSuccessScore: number;
  coveragePercent: number | null;
  reviewText: string | null;
  reviewTextStatus: 'PENDING' | 'APPROVED' | 'REJECTED';
  createdAt: string;
}

const SCALE_LABELS: Record<string, string> = {
  businessPlanQualityScore: 'Якість бізнес-плану',
  bankResponsivenessScore: 'Відзивчивість банку',
  processingSpeedScore: 'Швидкість обробки заявки',
  applicationSuccessScore: 'Успішність заявки',
};

// За прямим запитом користувача — "отзывы подробно для каждого банка -
// новая страница отзывов с возможностью оставить свой". Server
// Component — фетчить дані програми + наявні відгуки, форма подачі
// (клієнтський стан, перевірка авторизації) — окремий 'use client'
// компонент ReviewForm нижче.
export default async function FinancingReviewsPage({ params }: { params: { locale: string; id: string } }) {
  if (!isLocale(params.locale)) notFound();
  const locale = params.locale as Locale;

  const program = await apiGet<FinancingProgramDetail>(`/financing-programs/${params.id}`, 300).catch(() => null);
  if (!program) notFound();

  const reviews = await apiGet<PublicReview[]>(`/financing-programs/${params.id}/reviews`, 60).catch(() => [] as PublicReview[]);

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <Link href={`/${locale}/financing`} className="mb-4 inline-block text-xs text-leaf-900/50 hover:underline">
        ← Усі програми кредитування
      </Link>
      <h1 className="mb-1 text-2xl font-semibold text-leaf-900">{program.name}</h1>
      <p className="mb-8 text-sm text-leaf-900/50">{program.eligibility}</p>

      <ReviewForm locale={locale} financingProgramId={program.id} />

      <h2 className="mb-4 mt-10 font-medium text-leaf-900">Відгуки клієнтів ({reviews.length})</h2>
      {reviews.length === 0 ? (
        <p className="text-sm text-leaf-900/50">Ще немає відгуків про цю програму.</p>
      ) : (
        <div className="flex flex-col gap-4">
          {reviews.map((r) => (
            <div key={r.id} className="rounded-xl border border-leaf-800/10 p-4">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-sm font-medium text-leaf-900">
                  {r.city} · {r.branch}
                </p>
                <p className="text-xs text-leaf-900/40">{new Date(r.createdAt).toLocaleDateString('uk-UA')}</p>
              </div>
              <div className="mb-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-leaf-900/70 sm:grid-cols-4">
                <span>{SCALE_LABELS.businessPlanQualityScore}: {r.businessPlanQualityScore}/10</span>
                <span>{SCALE_LABELS.bankResponsivenessScore}: {r.bankResponsivenessScore}/10</span>
                <span>{SCALE_LABELS.processingSpeedScore}: {r.processingSpeedScore}/10</span>
                <span>
                  {SCALE_LABELS.applicationSuccessScore}: {r.applicationSuccessScore}/10
                  {r.coveragePercent !== null && ` (${r.coveragePercent}% покриття)`}
                </span>
              </div>
              {r.reviewText && <p className="mt-2 text-sm text-leaf-900/80">{r.reviewText}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
