import { notFound } from 'next/navigation';
import { isLocale } from '../../../lib/i18n';
import { CalculatorQuiz } from '../../../components/CalculatorQuiz';

export default function CalculatorPage({ params }: { params: { locale: string } }) {
  if (!isLocale(params.locale)) notFound();
  return <CalculatorQuiz locale={params.locale} />;
}
