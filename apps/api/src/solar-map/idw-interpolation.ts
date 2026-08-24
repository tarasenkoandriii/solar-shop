// IDW (Inverse Distance Weighting) — стандартный геопространственный метод
// интерполяции скалярного поля между разреженными точками, дающий
// непрерывный растр вместо дискретных точек (ТЗ п.34.2 шаг "Интерполяция").
// Чистая математика, без внешних GIS-зависимостей (GDAL/scipy и т.п.) —
// специально выбран за это: работает в обычном Node.js без нативных
// биндингов, безопасно для serverless (Vercel Hobby), см. AUDIT-FULL.md
// по поводу того, почему полный PMTiles-конвейер не реализован при этом.

export interface SamplePoint {
  lat: number;
  lng: number;
  value: number;
}

const EARTH_RADIUS_KM = 6371;

function haversineDistanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(a));
}

// power=2 — стандартное значение для IDW (квадрат обратного расстояния),
// более высокие значения дают более "локальную" интерполяцию (ближайшие
// точки доминируют сильнее), более низкие — более сглаженную.
export function idwInterpolate(samples: SamplePoint[], targetLat: number, targetLng: number, power = 2): number {
  let weightedSum = 0;
  let weightSum = 0;

  for (const sample of samples) {
    const distanceKm = haversineDistanceKm(targetLat, targetLng, sample.lat, sample.lng);
    if (distanceKm < 0.001) return sample.value; // точное совпадение — избегаем деления на почти-ноль

    const weight = 1 / distanceKm ** power;
    weightedSum += weight * sample.value;
    weightSum += weight;
  }

  return weightSum > 0 ? weightedSum / weightSum : 0;
}

export interface Bounds {
  latMin: number;
  latMax: number;
  lngMin: number;
  lngMax: number;
}

// Строит целевую сетку заданного разрешения и интерполирует значение в
// каждой ячейке по разреженным исходным точкам — это и есть шаг
// "растр вместо дискретных точек" из ТЗ, только не сохраняется как файл
// растра/тайлов, а отдаётся клиенту как плотный массив точек (см.
// SolarMapService — рендер через клиентскую тепловую карту).
export function buildInterpolatedGrid(
  samples: SamplePoint[],
  bounds: Bounds,
  resolution: number,
): SamplePoint[] {
  if (samples.length === 0) return [];

  const latSpan = bounds.latMax - bounds.latMin;
  const lngSpan = bounds.lngMax - bounds.lngMin;
  const largerSpan = Math.max(latSpan, lngSpan);
  const stepDeg = largerSpan / resolution;

  const grid: SamplePoint[] = [];
  for (let lat = bounds.latMin; lat <= bounds.latMax; lat += stepDeg) {
    for (let lng = bounds.lngMin; lng <= bounds.lngMax; lng += stepDeg) {
      const value = idwInterpolate(samples, lat, lng);
      grid.push({ lat: Math.round(lat * 1000) / 1000, lng: Math.round(lng * 1000) / 1000, value });
    }
  }
  return grid;
}

// ---- Компактный формат для хранения/передачи (найдено при аудите) ----
//
// [{lat, lng, value}, ...] на 3600+ точках означает, что ключи "lat"/"lng"/
// "value" буквально повторяются в JSON тысячи раз — реальные лишние байты
// на хранении (SolarMapInterpolatedGrid.cellsJson), в ответе публичного
// API (/solar-map/grid дергается на каждой загрузке страницы с картой) и
// в файле экспорта для миграции между окружениями. Кортеж [lat, lng, value]
// не имеет этой избыточности — тот же принцип, что уже применяется в
// leaflet.heat на фронтенде (он и так ожидает [lat, lng, intensity]).
// Компактный формат используется everywhere, где точек много (хранение,
// публичный API, экспорт); объектный — только там, где точка одна и
// читаемость важнее (напр. одиночный GET по конкретному городу).
export type CompactPoint = [lat: number, lng: number, value: number];

export function toCompact(points: SamplePoint[]): CompactPoint[] {
  return points.map((p) => [p.lat, p.lng, p.value]);
}

export function fromCompact(points: CompactPoint[]): SamplePoint[] {
  return points.map(([lat, lng, value]) => ({ lat, lng, value }));
}
