import { notFound } from 'next/navigation';
import { isLocale, type Locale } from '../lib/i18n';
import { getDictionary } from '../lib/get-dictionary';
import { apiGet } from '../lib/api';
import type { ExchangeRate, Manufacturer, Product, ProductListResponse } from '../lib/api';
import { ProductCard } from './ProductCard';
import { CatalogControls } from './CatalogControls';
import { Pagination } from './Pagination';

export type CategoryKey = 'SOLAR_PANEL' | 'BATTERY' | 'CONTROLLER';

// За запитом користувача (категорії тепер таблиця, не жорсткий enum) —
// EXTRA_FILTERS лишається прив'язаним лише до 3 відомих категорій із
// реальними спек-фільтрами (тип панелі/хімія акумулятора/тип
// контролера) — нова, щойно затверджена категорія природно не має
// такого фільтра ще (жодної спеки-логіки для неї в принципі не існує),
// тому тип ослаблений до Partial<Record<string,...>> — безпечний
// доступ по будь-якому ключу, не тільки 3 відомим.
const EXTRA_FILTERS: Partial<
  Record<string, { key: string; label: (dict: ReturnType<typeof getDictionary>) => string; options: { value: string; label: string }[] }>
> = {
  SOLAR_PANEL: {
    key: 'type',
    label: () => 'Тип панелі',
    options: [
      { value: 'MONO', label: 'Монокристалічна' },
      { value: 'POLY', label: 'Полікристалічна' },
      { value: 'FLEXIBLE', label: 'Гнучка' },
    ],
  },
  BATTERY: {
    key: 'chemistry',
    label: () => 'Хімія',
    options: [
      { value: 'LIFEPO4', label: 'LiFePO4' },
      { value: 'GEL', label: 'Гелевий' },
      { value: 'AGM', label: 'AGM' },
    ],
  },
  CONTROLLER: {
    key: 'controllerType',
    label: () => 'Тип контролера',
    options: [
      { value: 'PWM', label: 'PWM' },
      { value: 'MPPT', label: 'MPPT' },
    ],
  },
};

export async function CatalogPage({
  locale: rawLocale,
  category,
  title,
  searchParams,
}: {
  locale: string;
  category: string;
  title: (dict: ReturnType<typeof getDictionary>) => string;
  searchParams: Record<string, string | string[] | undefined>;
}) {
  if (!isLocale(rawLocale)) notFound();
  const locale = rawLocale as Locale;
  const dict = getDictionary(locale);

  const qs = new URLSearchParams();
  qs.set('category', category);
  if (searchParams.sort) qs.set('sort', String(searchParams.sort));
  if (searchParams.inStockOnly) qs.set('inStockOnly', String(searchParams.inStockOnly));
  if (searchParams.page) qs.set('page', String(searchParams.page));
  if (searchParams.promoOnly) qs.set('promoOnly', String(searchParams.promoOnly));
  const extra = EXTRA_FILTERS[category];
  if (extra && searchParams[extra.key]) qs.set(extra.key, String(searchParams[extra.key]));

  const manufacturerIds = searchParams.manufacturerId;
  (Array.isArray(manufacturerIds) ? manufacturerIds : manufacturerIds ? [manufacturerIds] : []).forEach(
    (id) => qs.append('manufacturerId', id),
  );

  const [data, manufacturers, rate] = await Promise.all([
    apiGet<ProductListResponse>(`/products?${qs.toString()}`, 30),
    apiGet<Manufacturer[]>('/manufacturers', 3600).catch(() => [] as Manufacturer[]),
    // Аудит 27.08.2026: тут стояв .catch(() => ({ rateUah: '41.5' })) —
    // мовчазна підміна курсу вигаданою константою. Тепер null, і
    // formatPrice у такому разі показує долари замість гривні за
    // неправильним курсом. Курс на весь layout уже завантажено
    // ([locale]/layout.tsx), цей запит лишається заради кешу сторінки.
    apiGet<ExchangeRate>('/currency/rate', 3600).catch(() => null),
  ]);

  const parsedRate = rate ? parseFloat(rate.rateUah) : NaN;
  const rateUah = Number.isFinite(parsedRate) && parsedRate > 0 ? parsedRate : null;

  function buildHref(page: number) {
    const params = new URLSearchParams(qs);
    params.delete('category');
    params.set('page', String(page));
    return `?${params.toString()}`;
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="mb-6 text-2xl font-semibold text-leaf-900">{title(dict)}</h1>
      <div className="flex flex-col gap-8 md:flex-row">
        <CatalogControls
          dict={dict}
          manufacturers={manufacturers}
          extraFilters={extra ? [{ key: extra.key, label: extra.label(dict), options: extra.options }] : undefined}
        />
        <div className="flex-1">
          {data.items.length === 0 ? (
            <p className="text-leaf-900/60">{dict.catalog.noResults}</p>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {data.items.map((product: Product) => (
                <ProductCard key={product.id} product={product} locale={locale} dict={dict} rateUah={rateUah} />
              ))}
            </div>
          )}
          <Pagination page={data.page} totalPages={data.totalPages} buildHref={buildHref} />
        </div>
      </div>
    </div>
  );
}
