import { CatalogPage } from '../../../components/CatalogPage';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default function ControllersPage({
  params,
  searchParams,
}: {
  params: { locale: string };
  searchParams: Record<string, string | string[] | undefined>;
}) {
  return (
    <CatalogPage
      locale={params.locale}
      category="CONTROLLER"
      title={(dict) => dict.nav.controllers}
      searchParams={searchParams}
    />
  );
}
