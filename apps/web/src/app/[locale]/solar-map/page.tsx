import { notFound } from 'next/navigation';
import Link from 'next/link';
import { isLocale, type Locale } from '../../../lib/i18n';
import { apiGet } from '../../../lib/api';
import type { CompactGridPoint } from '../../../components/SolarPotentialMap';
import { EnergyPotentialTabs } from '../../../components/EnergyPotentialTabs';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// ТЗ п.34.3 — окрема SEO-сторінка для інтерактивної версії карти.
// За прямим запитом користувача — додано шар вітру (Windy, за
// замовчуванням активний) поряд із наявним сонячним потенціалом
// (PVGIS) — "потенциально займемся и ветро энергетикой", карта готова
// до цього розширення заздалегідь.
export default async function SolarMapPage({ params }: { params: { locale: string } }) {
  if (!isLocale(params.locale)) notFound();
  const locale = params.locale as Locale;

  const points = await apiGet<CompactGridPoint[]>('/solar-map/grid', 86400).catch(() => [] as CompactGridPoint[]);

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="mb-2 text-2xl font-semibold text-leaf-900">Карта енергетичного потенціалу України</h1>
      <p className="mb-6 text-leaf-900/70">
        Вітер (поточні умови, Windy) та очікувана річна генерація сонячної енергії на 1 кВт·пік встановленої
        потужності (PVGIS, стандартні припущення: нахил 35°, орієнтація на південь).
      </p>

      <EnergyPotentialTabs solarPoints={points} />

      <div className="mt-6 flex items-center justify-between rounded-2xl border border-leaf-800/10 bg-white p-5">
        <p className="text-leaf-900/70">Хочете дізнатись, скільки коштуватиме СЕС для вашого міста?</p>
        <Link href={`/${locale}/calculator`} className="rounded-full bg-sun-500 px-5 py-2 text-sm font-medium text-leaf-900 hover:bg-sun-400">
          Розрахувати →
        </Link>
      </div>
    </div>
  );
}
