import Link from 'next/link';
import { ProductPhoto } from './ProductPhoto';
import type { Locale } from '../lib/i18n';
import type { Dictionary } from '../lib/get-dictionary';
import type { Product } from '../lib/api';
import { PriceTag } from './PriceTag';

export function ProductCard({
  product,
  locale,
  dict,
  rateUah,
}: {
  product: Product;
  locale: Locale;
  dict: Dictionary;
  rateUah: number;
}) {
  const cover = product.images[0]?.url;

  return (
    <Link
      href={`/${locale}/products/${product.slug}`}
      className="group flex flex-col overflow-hidden rounded-2xl border border-leaf-800/10 bg-white transition hover:shadow-lg"
    >
      <div className="relative aspect-[4/3] bg-leaf-50">
        {/* ProductPhoto сам вирішує, чи можна прогнати цей URL через
            next/image: фото, вже перенесене на Vercel Blob, оптимізується,
            ще не перенесене — показується напряму. Див. ProductPhoto.tsx. */}
        {cover && (
          <ProductPhoto
            src={cover}
            alt={product.images[0]?.altText ?? product.name}
            sizes="(max-width: 768px) 100vw, 25vw"
            className="transition group-hover:scale-105"
          />
        )}
        <div className="absolute left-2 top-2 flex flex-col gap-1">
          {product.cachedIsNew && (
            <span className="rounded-full bg-sun-500 px-2 py-0.5 text-xs font-semibold text-leaf-900">NEW</span>
          )}
          {product.cachedIsPromo && (
            <span className="rounded-full bg-red-500 px-2 py-0.5 text-xs font-semibold text-white">
              {dict.product.promo} −{product.cachedDiscountPercent}%
            </span>
          )}
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-1 p-4">
        <span className="text-xs text-leaf-800/50">{product.manufacturer?.name ?? ''}</span>
        <h3 className="line-clamp-2 font-medium text-leaf-900">{product.name}</h3>
        <span className="text-xs text-leaf-800/40">{product.articleNumber}</span>
        <div className="mt-auto flex items-center justify-between pt-2">
          <span className="text-lg font-semibold text-leaf-800">
            {product.cachedPriceUsd !== null ? (
              <PriceTag priceUsd={product.cachedPriceUsd} rateUah={rateUah} />
            ) : (
              <span className="text-sm text-leaf-800/40">—</span>
            )}
          </span>
          <span className={`text-xs ${product.cachedInStock ? 'text-green-600' : 'text-orange-500'}`}>
            {product.cachedInStock ? dict.product.inStock : dict.product.outOfStock}
          </span>
        </div>
      </div>
    </Link>
  );
}
