import { ProductPhoto } from './ProductPhoto';
import type { Product } from '../lib/api';

export function ProductCard({ product, onOpen }: { product: Product; onOpen: (p: Product) => void }) {
  const cover = product.images[0]?.url;

  return (
    <button
      onClick={() => onOpen(product)}
      className="flex flex-col overflow-hidden rounded-2xl border border-leaf-900/10 bg-white text-left"
    >
      <div className="relative aspect-[4/3] bg-leaf-50">
        {cover && <ProductPhoto src={cover} alt={product.name} sizes="50vw" />}
        {product.cachedIsPromo && (
          <span className="absolute left-1.5 top-1.5 rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-semibold text-white">
            −{product.cachedDiscountPercent}%
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-0.5 p-3">
        <span className="text-[11px] text-leaf-900/50">{product.manufacturer?.name ?? ''}</span>
        <span className="line-clamp-2 text-sm font-medium">{product.name}</span>
        <span className="mt-auto pt-1 text-base font-semibold text-leaf-800">
          {product.cachedPriceUsd !== null ? `$${product.cachedPriceUsd}` : '—'}
        </span>
      </div>
    </button>
  );
}
