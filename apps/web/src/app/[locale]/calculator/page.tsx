import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import { isLocale } from '../../../lib/i18n';
import { resolveGeoCity } from '../../../lib/geo-city';
import { CalculatorQuiz } from '../../../components/CalculatorQuiz';

// За запитом користувача (27.08.2026) — місто в першому питанні квизу
// підставляється з заголовків Vercel, але лишається редагованим.
//
// Читається на сервері й передається пропом: сам квиз — клієнтський
// компонент, до заголовків запиту він доступу не має. Наслідок, який
// варто знати: виклик headers() робить сторінку динамічною (у збірці вона
// перестає бути ● і стає ƒ). Для сторінки, що по суті є формою, це
// нормально — кешувати там нічого.
//
// Значення НІЧОГО не вирішує за людину: воно лише лягає в поле пошуку, а
// далі працює той самий автодоповнювач по довіднику Нової Пошти, що й
// раніше. Не визначилось місто — поле порожнє, крок поводиться як був.
export default function CalculatorPage({ params }: { params: { locale: string } }) {
  if (!isLocale(params.locale)) notFound();

  const geoCity = resolveGeoCity(headers().get('x-vercel-ip-city'));

  return <CalculatorQuiz locale={params.locale} initialCity={geoCity} />;
}
