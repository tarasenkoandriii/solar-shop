import { notFound } from 'next/navigation';
import { CatalogPage } from '../../../../components/CatalogPage';
import { apiGet } from '../../../../lib/api';
import { isLocale, type Locale } from '../../../../lib/i18n';

interface CategoryPublic {
  key: string;
  nameUk: string;
  nameRu: string;
  nameEn: string;
}

// За прямим запитом користувача — "показать в клиентском сайте все
// промодерированные категории из этой новой таблицы". Три ВІДОМІ
// категорії (SOLAR_PANEL/BATTERY/CONTROLLER) мають власні виділені
// сторінки (apps/web/src/app/[locale]/solar-panels тощо — робочі,
// SEO-friendly, з перекладеними dict-лейблами, не чіпались) — цей
// generic-роут ловить БУДЬ-ЯКУ ІНШУ затверджену категорію, щойно
// вона проходить модерацію в адмінці, без потреби створювати нову
// сторінку в коді для кожної.
export default async function GenericCatalogPage({
  params,
  searchParams,
}: {
  params: { locale: string; categoryKey: string };
  searchParams: Record<string, string | string[] | undefined>;
}) {
  if (!isLocale(params.locale)) notFound();
  const locale = params.locale as Locale;

  // За прямим запитом користувача ("не показывает не все категории")
  // — TTL зменшено з 300с. Тут це ОСОБЛИВО важливо: якщо категорію
  // щойно затверджено, а кеш застарілий — ця сторінка дає 404 для
  // РЕАЛЬНО існуючої категорії (`if (!category) notFound()` нижче),
  // не просто "не видно в списку" десь ще.
  const categories = await apiGet<CategoryPublic[]>('/categories', 60).catch(() => [] as CategoryPublic[]);
  const category = categories.find((c) => c.key === params.categoryKey);
  if (!category) notFound(); // невідома або ще не затверджена категорія

  const nameByLocale: Record<Locale, string> = { uk: category.nameUk, ru: category.nameRu, en: category.nameEn };

  return (
    <CatalogPage
      locale={params.locale}
      category={category.key}
      title={() => nameByLocale[locale]}
      searchParams={searchParams}
    />
  );
}
