// ⚠️ Той самий bug-fix, що для /articles (README) — без цього товари,
// опубліковані ПІСЛЯ docker build (web-контейнер збирається до старту
// api-контейнера, apiGet всередині CatalogPage провалюється на
// build-time), лишились би "заморожені" в каталозі назавжди.
export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { CatalogPage } from '../../../components/CatalogPage';

export default function SolarPanelsPage({
  params,
  searchParams,
}: {
  params: { locale: string };
  searchParams: Record<string, string | string[] | undefined>;
}) {
  return (
    <CatalogPage
      locale={params.locale}
      category="SOLAR_PANEL"
      title={(dict) => dict.nav.solarPanels}
      searchParams={searchParams}
    />
  );
}
