'use client';

import { useEffect, useRef, useState } from 'react';

// [lat, lng, annualKwhPerKwp] — компактный формат-кортеж с бэкенда (не
// {lat, lng, annualKwhPerKwp}), см. apps/api/src/solar-map/
// idw-interpolation.ts: на тысячах точек объектный массив означает
// многократное повторение одних и тех же ключей — реальные лишние байты
// в ответе API. Кортеж к тому же совпадает с ожидаемым форматом самого
// leaflet.heat — меньше преобразований на клиенте.
export type CompactGridPoint = [lat: number, lng: number, annualKwhPerKwp: number];

// Той самий градієнт, що leaflet.heat застосовує ЗА ЗАМОВЧУВАННЯМ (не
// перевизначався в heatLayer() нижче) — {0.4: blue, 0.6: cyan, 0.7:
// lime, 0.8: yellow, 1.0: red}. Легенда МАЄ показувати той самий
// градієнт, що реально малює карта, інакше вводить в оману — винесено
// в константу тут, а не задубльовано на око, щоб не розійшлися, якщо
// колись зміниться один із двох.
const HEAT_GRADIENT_CSS = 'linear-gradient(to right, blue 0%, cyan 40%, lime 60%, yellow 70%, red 100%)';

// ТЗ п.34.2 — тепловая карта (не анимация частицами — солнечная инсоляция
// скалярное поле, физически нет "потока" для анимации, как у ветра).
// Данные приходят уже IDW-интерполированными с бэкенда (SolarMapService) —
// плотная сетка, не сырые редкие точки PVGIS. Единственное оставшееся
// честное упрощение относительно буквы ТЗ — рендер через leaflet.heat
// (клиентский градиент по точкам), не через серверные PMTiles-тайлы. См.
// AUDIT-FULL.md для полного разбора этого решения.
export function SolarPotentialMap({ points, height = 500 }: { points: CompactGridPoint[]; height?: number }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<unknown>(null);
  // За прямим запитом користувача ("не хватает легенды на карте
  // солнечного потенциала") — реальний діапазон кВт·год/кВт·пік, що
  // відповідає 0-1 нормалізації, застосованій до heatLayer нижче.
  // Піднято в state (не залишено локальною змінною всередині ефекту) —
  // легенда рендериться в JSX компонента, потребує ці значення поза
  // useEffect.
  const [range, setRange] = useState<{ min: number; max: number } | null>(null);

  useEffect(() => {
    if (!containerRef.current || points.length === 0) return;

    let cancelled = false;

    (async () => {
      const L = (await import('leaflet')).default;
      await import('leaflet.heat');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const heatLayer = (L as any).heatLayer;

      if (cancelled || !containerRef.current) return;

      const map = L.map(containerRef.current).setView([48.5, 31.5], 6);
      mapInstanceRef.current = map;

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
      }).addTo(map);

      // Нормализуем интенсивность в диапазон 0-1 для heat-слоя
      const values = points.map(([, , value]) => value);
      const min = Math.min(...values);
      const max = Math.max(...values);
      setRange({ min, max });
      const heatPoints = points.map(([lat, lng, value]) => [
        lat,
        lng,
        max > min ? (value - min) / (max - min) : 0.5,
      ]) as [number, number, number][];

      // Радиус меньше, чем для разреженных сырых точек — теперь приходит
      // плотная IDW-интерполированная сетка (см. SolarMapService), большой
      // радиус на плотных данных даёт "замыленный" результат без выигрыша.
      heatLayer(heatPoints, { radius: 18, blur: 15, maxZoom: 8 }).addTo(map);
    })();

    return () => {
      cancelled = true;
      const map = mapInstanceRef.current as { remove: () => void } | null;
      map?.remove();
    };
  }, [points]);

  if (points.length === 0) {
    return (
      <div className="flex items-center justify-center rounded-2xl bg-leaf-50 text-leaf-900/50" style={{ height }}>
        Дані сітки ще не розраховані — зверніться до адміністратора
      </div>
    );
  }

  return (
    <div className="relative">
      <div ref={containerRef} style={{ height }} className="overflow-hidden rounded-2xl" />
      {range && (
        <div className="absolute bottom-4 left-4 z-[1000] rounded-xl bg-white/90 px-3 py-2 text-xs shadow backdrop-blur">
          <p className="mb-1 font-medium text-leaf-900">кВт·год / кВт·пік на рік</p>
          <div className="h-2 w-40 rounded-full" style={{ background: HEAT_GRADIENT_CSS }} />
          <div className="mt-1 flex justify-between text-leaf-900/60">
            <span>{Math.round(range.min)}</span>
            <span>{Math.round(range.max)}</span>
          </div>
        </div>
      )}
    </div>
  );
}
