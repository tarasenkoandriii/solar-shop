'use client';

// За прямим запитом користувача — "карту ветров из windy... в лендинге
// роад скаута использовали". Портовано з
// RoadScout-main/apps/interactive/components/WindyWidget.tsx (той
// самий "тупий" варіант без власного picker'а — вибір шару керується
// ЗОВНІ, тут через EnergyPotentialTabs, той самий принцип, що вже
// застосований у RoadScout: CityMapPanel.tsx керує вибором шару
// зовні, коли одному UI потрібно об'єднати кілька незалежних джерел
// шарів у ЄДИНИЙ перемикач). Публічний iframe-embed
// embed.windy.com/embed2.html — без API-ключа, без бекенд-інтеграції,
// без cookies (офіційна політика Windy Embed). Формат URL-параметрів
// підтверджено і через web_search офіційної документації, і напряму
// звіркою з уже робочим кодом RoadScout — не здогад.
export type WindyOverlay = 'wind' | 'rain' | 'clouds' | 'temp' | 'radar';

interface Props {
  lat: number;
  lng: number;
  zoom?: number;
  overlay: WindyOverlay;
  height?: number;
}

function buildWindyEmbedUrl(lat: number, lng: number, zoom: number, overlay: WindyOverlay): string {
  const params = new URLSearchParams({
    lat: String(lat),
    lon: String(lng),
    detailLat: String(lat),
    detailLon: String(lng),
    zoom: String(zoom),
    level: 'surface',
    overlay,
    menu: '',
    message: '',
    marker: '',
    calendar: '',
    pressure: '',
    type: 'map',
    location: 'coordinates',
    detail: '',
    metricWind: 'default',
    metricTemp: 'default',
    radarRange: '-1',
  });
  return `https://embed.windy.com/embed2.html?${params.toString()}`;
}

export function WindyWidget({ lat, lng, zoom = 6, overlay, height = 550 }: Props) {
  return (
    <iframe
      title="Windy — карта вітру"
      src={buildWindyEmbedUrl(lat, lng, zoom, overlay)}
      style={{ height }}
      className="w-full rounded-2xl border-0"
      loading="lazy"
    />
  );
}
