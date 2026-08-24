'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { WindyWidget } from './WindyWidget';
import type { CompactGridPoint } from './SolarPotentialMap';

const SolarPotentialMap = dynamic(() => import('./SolarPotentialMap').then((m) => m.SolarPotentialMap), { ssr: false });

// За прямим запитом користувача — "карту ветров из windy первым слоем
// (by default) - потенциально займемся и ветро энергетикой". Клієнтський
// компонент, а не сама сторінка (яка лишається async Server Component
// для SSR-фетчу points) — керує лише вибором активного шару, той самий
// принцип, що вже застосований у RoadScout (CityMapPanel.tsx: один
// перемикач над кількома незалежними джерелами шарів).
export function EnergyPotentialTabs({ solarPoints }: { solarPoints: CompactGridPoint[] }) {
  const [tab, setTab] = useState<'wind' | 'solar'>('wind');

  return (
    <div>
      <div className="mb-4 flex gap-2">
        <button
          onClick={() => setTab('wind')}
          className={`rounded-full px-4 py-2 text-sm font-medium ${
            tab === 'wind' ? 'bg-leaf-900 text-white' : 'bg-leaf-800/5 text-leaf-900/60 hover:bg-leaf-800/10'
          }`}
        >
          💨 Вітер
        </button>
        <button
          onClick={() => setTab('solar')}
          className={`rounded-full px-4 py-2 text-sm font-medium ${
            tab === 'solar' ? 'bg-leaf-900 text-white' : 'bg-leaf-800/5 text-leaf-900/60 hover:bg-leaf-800/10'
          }`}
        >
          ☀️ Сонячний потенціал
        </button>
      </div>

      {tab === 'wind' ? (
        <>
          {/* Центр і зум — ті самі значення, що вже стандартні для карти
              всієї країни (SolarPotentialMap.tsx setView). Windy показує
              ПОТОЧНІ/прогнозні умови вітру, не середньорічний потенціал
              для вітроенергетики (це принципово інший, накопичений
              статистичний показник — Global Wind Atlas чи подібне
              джерело, не Windy) — чесно про це в підписі нижче, не
              видається за готовий інструмент вибору майданчика під
              вітропарк. */}
          <WindyWidget lat={48.5} lng={31.5} zoom={5} overlay="wind" height={550} />
          <p className="mt-3 text-xs text-leaf-900/40">
            Джерело: Windy.com · Показує поточні та прогнозні умови вітру, не середньорічний
            потенціал для вітроенергетики (це окремий, накопичений статистичний показник — з’явиться
            окремо, якщо/коли напрямок вітроенергетики розвиватиметься).
          </p>
        </>
      ) : (
        <>
          <SolarPotentialMap points={solarPoints} height={550} />
          <p className="mt-3 text-xs text-leaf-900/40">
            Джерело: PVGIS, Об&apos;єднаний дослідницький центр Європейської комісії ·{' '}
            <a
              href="https://joint-research-centre.ec.europa.eu/photovoltaic-geographical-information-system-pvgis_en"
              target="_blank"
              rel="noopener noreferrer"
              className="underline"
            >
              офіційний сайт PVGIS
            </a>
          </p>
        </>
      )}
    </div>
  );
}
