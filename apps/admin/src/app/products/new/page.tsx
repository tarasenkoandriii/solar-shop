'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '../../../lib/api';
import type { Manufacturer } from '../../../lib/api';
import { ProductForm } from '../../../components/ProductForm';
import { useAdminLocale } from '../../../lib/locale-context';

export default function NewProductPage() {
  const [manufacturers, setManufacturers] = useState<Manufacturer[] | null>(null);
  const { dict } = useAdminLocale();

  useEffect(() => {
    apiFetch<Manufacturer[]>('/manufacturers').then(setManufacturers);
  }, []);

  if (!manufacturers) return <p className="text-leaf-900/50 dark:text-white/50">{dict.common.loading}</p>;

  return (
    <div>
      <h1 className="mb-4 text-xl font-semibold text-leaf-900 dark:text-white">{dict.pages.productsNew.title}</h1>
      <ProductForm manufacturers={manufacturers} />
    </div>
  );
}
