import dynamic from 'next/dynamic';
import { headers } from 'next/headers';
import { apiGet } from '../../../lib/api';
import { EmbedViewTracker } from '../../../components/EmbedViewTracker';
import type { CompactGridPoint } from '../../../components/SolarPotentialMap';

const SolarPotentialMap = dynamic(
  () => import('../../../components/SolarPotentialMap').then((m) => m.SolarPotentialMap),
  { ssr: false },
);

// ТЗ п.34.6.1/34.6.2 — простий iframe-роут, ?theme=light|dark (light за
// замовчуванням, dark — легка інверсія фону/тексту атрибуції), ?city/?region
// поки не впливають на дані (у нас єдина сітка по всій Україні, не
// регіональні набори) — параметр приймається, але фокусування карти на
// регіоні залишено як TODO, чесно відмічено в AUDIT-PHASE-4.md.
export default async function EmbedSolarMapPage({
  searchParams,
}: {
  searchParams: { theme?: string; city?: string; region?: string };
}) {
  const points = await apiGet<CompactGridPoint[]>('/solar-map/grid', 86400).catch(() => [] as CompactGridPoint[]);
  const isDark = searchParams.theme === 'dark';
  const refererHost = headers().get('referer');

  return (
    <div style={{ background: isDark ? '#153a20' : '#ffffff', padding: 12 }}>
      <EmbedViewTracker refererHost={refererHost} />
      <SolarPotentialMap points={points} height={400} />
      <div
        style={{
          marginTop: 8,
          fontSize: 12,
          textAlign: 'right',
          color: isDark ? '#e7f0ea' : '#153a20',
          fontFamily: 'sans-serif',
        }}
      >
        Мапа від{' '}
        <a
          href="https://solarshop.ua/uk/solar-map"
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: 'inherit', fontWeight: 600 }}
        >
          Solar Shop
        </a>{' '}
        · solarshop.ua/solar-map
      </div>
    </div>
  );
}
