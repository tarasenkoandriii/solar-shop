'use client';

import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import type { Dictionary } from '../lib/get-dictionary';
import type { Manufacturer } from '../lib/api';

// URL отражает все фильтры/сортировку через query params (ТЗ п.3.2) — важно
// для шаринга ссылок и SEO, поэтому состояние живёт в URL, а не в useState.
export function CatalogControls({
  dict,
  manufacturers,
  extraFilters,
}: {
  dict: Dictionary;
  manufacturers: Manufacturer[];
  extraFilters?: { key: string; label: string; options: { value: string; label: string }[] }[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function updateParam(key: string, value: string | null) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    params.delete('page');
    router.push(`${pathname}?${params.toString()}`);
  }

  function toggleManufacturer(id: string) {
    const params = new URLSearchParams(searchParams.toString());
    const current = params.getAll('manufacturerId');
    params.delete('manufacturerId');
    if (current.includes(id)) {
      current.filter((v) => v !== id).forEach((v) => params.append('manufacturerId', v));
    } else {
      [...current, id].forEach((v) => params.append('manufacturerId', v));
    }
    params.delete('page');
    router.push(`${pathname}?${params.toString()}`);
  }

  const selectedManufacturers = searchParams.getAll('manufacturerId');

  return (
    <aside className="flex flex-col gap-6 md:w-64">
      <div>
        <label className="mb-1 block text-sm font-medium text-leaf-900">{dict.catalog.sortLabel}</label>
        <select
          defaultValue={searchParams.get('sort') ?? ''}
          onChange={(e) => updateParam('sort', e.target.value || null)}
          className="w-full rounded-lg border border-leaf-800/20 px-3 py-2 text-sm"
        >
          <option value="newest">{dict.catalog.sortNewest}</option>
          <option value="price_asc">{dict.catalog.sortPriceAsc}</option>
          <option value="price_desc">{dict.catalog.sortPriceDesc}</option>
        </select>
      </div>

      <div>
        <p className="mb-1 text-sm font-medium text-leaf-900">{dict.catalog.manufacturerLabel}</p>
        <div className="flex flex-col gap-1">
          {manufacturers.map((m) => (
            <label key={m.id} className="flex items-center gap-2 text-sm text-leaf-900/80">
              <input
                type="checkbox"
                checked={selectedManufacturers.includes(m.id)}
                onChange={() => toggleManufacturer(m.id)}
              />
              {m.name}
            </label>
          ))}
        </div>
      </div>

      {extraFilters?.map((filter) => (
        <div key={filter.key}>
          <label className="mb-1 block text-sm font-medium text-leaf-900">{filter.label}</label>
          <select
            defaultValue={searchParams.get(filter.key) ?? ''}
            onChange={(e) => updateParam(filter.key, e.target.value || null)}
            className="w-full rounded-lg border border-leaf-800/20 px-3 py-2 text-sm"
          >
            <option value="">—</option>
            {filter.options.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      ))}

      <label className="flex items-center gap-2 text-sm text-leaf-900/80">
        <input
          type="checkbox"
          checked={searchParams.get('inStockOnly') === 'true'}
          onChange={(e) => updateParam('inStockOnly', e.target.checked ? 'true' : null)}
        />
        {dict.catalog.inStockOnly}
      </label>

      <label className="flex items-center gap-2 text-sm text-leaf-900/80">
        <input
          type="checkbox"
          checked={searchParams.get('promoOnly') === 'true'}
          onChange={(e) => updateParam('promoOnly', e.target.checked ? 'true' : null)}
        />
        {dict.catalog.promoOnly}
      </label>
    </aside>
  );
}
