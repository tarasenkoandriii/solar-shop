import { CatalogPage } from '../../../components/CatalogPage';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default function BatteriesPage({
  params,
  searchParams,
}: {
  params: { locale: string };
  searchParams: Record<string, string | string[] | undefined>;
}) {
  return (
    <CatalogPage
      locale={params.locale}
      category="BATTERY"
      title={(dict) => dict.nav.batteries}
      searchParams={searchParams}
    />
  );
}
