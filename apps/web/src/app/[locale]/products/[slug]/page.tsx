import Image from 'next/image';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { isLocale, type Locale } from '../../../../lib/i18n';
import { getDictionary } from '../../../../lib/get-dictionary';
import { apiGet } from '../../../../lib/api';
import type { ExchangeRate, ProductDetail } from '../../../../lib/api';
import { PriceTag } from '../../../../components/PriceTag';
import { ProductPurchaseActions } from '../../../../components/ProductPurchaseActions';
import { ProductReviewsSection } from '../../../../components/ProductReviewsSection';
import { safeJsonLdStringify } from '../../../../lib/safe-json-ld';

async function getProduct(slug: string) {
  try {
    return await apiGet<ProductDetail>(`/products/${slug}`, 60);
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: { locale: string; slug: string };
}): Promise<Metadata> {
  const product = await getProduct(params.slug);
  if (!product) return {};

  return {
    title: product.name,
    description: product.shortDescription,
    openGraph: {
      title: product.name,
      description: product.shortDescription,
      images: product.images[0] ? [product.images[0].url] : undefined,
    },
  };
}

export default async function ProductPage({ params }: { params: { locale: string; slug: string } }) {
  if (!isLocale(params.locale)) notFound();
  const locale = params.locale as Locale;
  const dict = getDictionary(locale);

  const [product, rate] = await Promise.all([
    getProduct(params.slug),
    apiGet<ExchangeRate>('/currency/rate', 3600).catch(() => ({ currency: 'USD', rateUah: '41.5', rateDate: '' })),
  ]);

  if (!product) notFound();
  const rateUah = parseFloat(rate.rateUah);

  const specsEntries = Object.entries(product.specs ?? {});

  // Города наличия (ТЗ п.25.3) — объединение Vendor.warehouseCities по всем
  // siblings в наличии (уже посчитано в cachedWarehouseCities на бэкенде).
  const warehouseCities = product.cachedWarehouseCities;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    sku: product.articleNumber,
    image: product.images.map((i) => i.url),
    description: product.shortDescription,
    brand: product.manufacturer ? { '@type': 'Brand', name: product.manufacturer.name } : undefined,
    offers: product.cachedPriceUsd
      ? {
          '@type': 'Offer',
          priceCurrency: 'USD',
          price: product.cachedPriceUsd,
          availability: product.cachedInStock ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
        }
      : undefined,
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      {/* eslint-disable-next-line react/no-danger */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLdStringify(jsonLd) }} />

      <div className="grid gap-10 md:grid-cols-2">
        <div>
          <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-leaf-50">
            {product.images[0] && (
              <Image src={product.images[0].url} alt={product.name} fill className="object-cover" />
            )}
          </div>
          {product.images.length > 1 && (
            <div className="mt-3 grid grid-cols-4 gap-2">
              {product.images.slice(1).map((img) => (
                <div key={img.id} className="relative aspect-square overflow-hidden rounded-lg bg-leaf-50">
                  <Image src={img.url} alt={img.altText ?? product.name} fill className="object-cover" />
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          {product.manufacturer && <p className="text-sm text-leaf-900/50">{product.manufacturer.name}</p>}
          <h1 className="mt-1 text-2xl font-semibold text-leaf-900">{product.name}</h1>
          <p className="mt-1 text-sm text-leaf-900/40">
            {dict.product.article}: {product.articleNumber}
          </p>

          <p className="mt-4 text-3xl font-bold text-leaf-800">
            {product.cachedPriceUsd !== null ? (
              <PriceTag priceUsd={product.cachedPriceUsd} rateUah={rateUah} />
            ) : (
              <span className="text-lg text-leaf-800/40">—</span>
            )}
            {product.cachedIsPromo && (
              <span className="ml-3 rounded-full bg-red-500 px-2 py-0.5 align-middle text-sm font-semibold text-white">
                {dict.product.promo} −{product.cachedDiscountPercent}%
              </span>
            )}
          </p>
          <p className={`mt-1 text-sm ${product.cachedInStock ? 'text-green-600' : 'text-orange-500'}`}>
            {product.cachedInStock ? dict.product.inStock : dict.product.outOfStock}
          </p>

          {warehouseCities.length > 0 && (
            <p className="mt-2 text-sm text-leaf-900/60">
              {dict.product.availableInCities}: {warehouseCities.join(', ')}
            </p>
          )}

          {/* За прямим запитом користувача — "поле рекомендации (в
              основном надёжность со скорингом на основе отзывов)".
              Показуємо лише коли є хоча б 1 відгук — порожній
              рейтинг вводив би в оману, не давав жодної реальної
              інформації. */}
          {product.reviewAggregate.reviewCount > 0 && product.reviewAggregate.avgReliabilityScore !== null && (
            <div className="mt-3 flex items-center gap-2 rounded-xl bg-leaf-50 px-3 py-2">
              <span className="text-sun-500">☀</span>
              <span className="text-sm font-medium text-leaf-900">
                {product.reviewAggregate.avgReliabilityScore.toFixed(1)}/10 надійність
              </span>
              <span className="text-xs text-leaf-900/50">
                ({product.reviewAggregate.reviewCount} {product.reviewAggregate.reviewCount === 1 ? 'відгук' : 'відгуків'})
              </span>
            </div>
          )}

          <p className="mt-6 text-leaf-900/80">{product.shortDescription}</p>

          {specsEntries.length > 0 && (
            <div className="mt-6">
              <h2 className="mb-2 font-semibold text-leaf-900">{dict.product.specsTitle}</h2>
              <table className="w-full text-sm">
                <tbody>
                  {specsEntries.map(([key, value]) => (
                    <tr key={key} className="border-b border-leaf-800/10">
                      <td className="py-1.5 pr-4 text-leaf-900/50">{key}</td>
                      <td className="py-1.5 font-medium text-leaf-900">{String(value)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="mt-8">
            <ProductPurchaseActions
              productId={product.id}
              productSlug={product.slug}
              inStock={product.cachedInStock}
              dict={dict}
              locale={locale}
            />
          </div>
        </div>
      </div>

      {product.description && (
        <div className="mt-12 max-w-3xl">
          <h2 className="mb-3 text-xl font-semibold text-leaf-900">{dict.product.descriptionTitle}</h2>
          <div className="whitespace-pre-line text-leaf-900/80">{product.description}</div>
        </div>
      )}

      {/* За прямим запитом користувача — "отзывы подробно от уже
          купивших этот товар", "привязать отзывы к покупке - один
          отзыв на каждую позицию", "допускается редактировать...
          удалять отзывы (самим покупателем только)". */}
      <div className="mt-12 max-w-3xl">
        <ProductReviewsSection locale={locale} productId={product.id} />
      </div>
    </div>
  );
}
