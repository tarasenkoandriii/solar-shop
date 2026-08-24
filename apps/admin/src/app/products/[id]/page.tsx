'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '../../../lib/api';
import type { Manufacturer, Product } from '../../../lib/api';
import { ProductForm } from '../../../components/ProductForm';
import { useAdminLocale } from '../../../lib/locale-context';

export default function EditProductPage({ params }: { params: { id: string } }) {
  const [manufacturers, setManufacturers] = useState<Manufacturer[] | null>(null);
  const [product, setProduct] = useState<Product | null>(null);
  const { dict } = useAdminLocale();

  useEffect(() => {
    Promise.all([
      apiFetch<Manufacturer[]>('/manufacturers'),
      apiFetch<Product[]>('/products/admin/all'),
    ]).then(([mans, products]) => {
      setManufacturers(mans);
      setProduct(products.find((p) => p.id === params.id) ?? null);
    });
  }, [params.id]);

  if (!manufacturers || !product) return <p className="text-leaf-900/50 dark:text-white/50">{dict.common.loading}</p>;

  return (
    <div>
      <h1 className="mb-4 text-xl font-semibold text-leaf-900 dark:text-white">{dict.pages.productsEdit.title}</h1>
      <ProductForm manufacturers={manufacturers} product={product} />
    </div>
  );
}
