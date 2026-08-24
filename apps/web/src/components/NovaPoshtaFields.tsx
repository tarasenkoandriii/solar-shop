'use client';

import { useEffect, useState } from 'react';
import type { NpCity, NpWarehouse } from '../lib/api';
import type { Dictionary } from '../lib/get-dictionary';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

export interface NovaPoshtaSelection {
  cityRef: string | null;
  cityName: string | null;
  warehouseRef: string | null;
  warehouseName: string | null;
}

export function NovaPoshtaFields({
  dict,
  onChange,
}: {
  dict: Dictionary;
  onChange: (selection: NovaPoshtaSelection) => void;
}) {
  const [cityQuery, setCityQuery] = useState('');
  const [cities, setCities] = useState<NpCity[]>([]);
  const [selectedCity, setSelectedCity] = useState<NpCity | null>(null);
  const [warehouses, setWarehouses] = useState<NpWarehouse[]>([]);
  const [selectedWarehouse, setSelectedWarehouse] = useState<NpWarehouse | null>(null);

  useEffect(() => {
    if (cityQuery.length < 2 || selectedCity) return;
    const timeout = setTimeout(() => {
      fetch(`${API_URL}/nova-poshta/cities?q=${encodeURIComponent(cityQuery)}`)
        .then((res) => res.json())
        .then(setCities)
        .catch(() => setCities([]));
    }, 300);
    return () => clearTimeout(timeout);
  }, [cityQuery, selectedCity]);

  useEffect(() => {
    if (!selectedCity) return;
    fetch(`${API_URL}/nova-poshta/warehouses?cityRef=${selectedCity.ref}`)
      .then((res) => res.json())
      .then(setWarehouses)
      .catch(() => setWarehouses([]));
  }, [selectedCity]);

  useEffect(() => {
    onChange({
      cityRef: selectedCity?.ref ?? null,
      cityName: selectedCity?.name ?? null,
      warehouseRef: selectedWarehouse?.ref ?? null,
      warehouseName: selectedWarehouse?.name ?? null,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCity, selectedWarehouse]);

  return (
    <div className="flex flex-col gap-3">
      <div className="relative">
        <input
          value={selectedCity ? selectedCity.name : cityQuery}
          onChange={(e) => {
            setSelectedCity(null);
            setSelectedWarehouse(null);
            setCityQuery(e.target.value);
          }}
          placeholder={dict.checkout.city}
          className="w-full rounded-lg border border-leaf-800/20 px-3 py-2"
        />
        {!selectedCity && cities.length > 0 && (
          <ul className="absolute z-10 mt-1 max-h-52 w-full overflow-y-auto rounded-lg border border-leaf-800/10 bg-white shadow-lg">
            {cities.map((c) => (
              <li key={c.ref}>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedCity(c);
                    setCities([]);
                  }}
                  className="block w-full px-3 py-2 text-left text-sm hover:bg-leaf-50"
                >
                  {c.name} {c.area ? `(${c.area})` : ''}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {selectedCity && (
        <select
          value={selectedWarehouse?.ref ?? ''}
          onChange={(e) => setSelectedWarehouse(warehouses.find((w) => w.ref === e.target.value) ?? null)}
          className="w-full rounded-lg border border-leaf-800/20 px-3 py-2"
        >
          <option value="">{dict.checkout.warehouse}</option>
          {warehouses.map((w) => (
            <option key={w.ref} value={w.ref}>
              {w.name}
            </option>
          ))}
        </select>
      )}
    </div>
  );
}
