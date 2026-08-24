'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '../lib/api';
import type { Manufacturer, Product } from '../lib/api';
import { useAdminLocale } from '../lib/locale-context';

export function ProductForm({
  manufacturers,
  product,
}: {
  manufacturers: Manufacturer[];
  product?: Product;
}) {
  const router = useRouter();
  const { dict } = useAdminLocale();
  const d = dict.productForm;
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [specsText, setSpecsText] = useState(JSON.stringify(product?.specs ?? {}, null, 2));
  const [imagesText, setImagesText] = useState((product?.images ?? []).map((img) => img.url).join('\n'));

  // За прямим запитом користувача — "Исправь" (закриває прогалину,
  // знайдену в попередньому проході перекладу — категорії тут
  // раніше були обмежені 3 значеннями без INVERTER/CABLE/CONNECTOR,
  // хоча всі 6 вже реально існують у каталозі, розділ README про
  // додавання категорії "Інвертор").
  const CATEGORIES = [
    { value: 'SOLAR_PANEL', label: d.categories.solarPanel },
    { value: 'BATTERY', label: d.categories.battery },
    { value: 'CONTROLLER', label: d.categories.controller },
    { value: 'INVERTER', label: d.categories.inverter },
    { value: 'CABLE', label: d.categories.cable },
    { value: 'CONNECTOR', label: d.categories.connector },
  ];
  const STATUSES = [
    { value: 'DRAFT', label: d.statuses.draft },
    { value: 'PUBLISHED', label: d.statuses.published },
    { value: 'ARCHIVED', label: d.statuses.archived },
  ];

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const form = new FormData(e.currentTarget);
    let specs: Record<string, unknown>;
    try {
      specs = JSON.parse(specsText || '{}');
    } catch {
      setError(d.specsInvalidJson);
      setSaving(false);
      return;
    }

    const payload = {
      category: form.get('category'),
      name: form.get('name'),
      manufacturerId: form.get('manufacturerId') || undefined,
      manufacturerSku: form.get('manufacturerSku') || undefined,
      images: imagesText.split('\n').map((s) => s.trim()).filter(Boolean),
      shortDescription: form.get('shortDescription'),
      description: form.get('description'),
      specs,
      status: form.get('status'),
      isNew: form.get('isNew') === 'on',
    };

    try {
      if (product) {
        const { category: _category, ...updatePayload } = payload;
        void _category;
        await apiFetch(`/products/admin/${product.id}`, {
          method: 'PUT',
          body: JSON.stringify(updatePayload),
        });
      } else {
        await apiFetch('/products/admin', { method: 'POST', body: JSON.stringify(payload) });
      }
      router.push('/products');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : d.saveError);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex max-w-2xl flex-col gap-4">
      {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">{error}</p>}

      {product && (
        <p className="text-sm text-leaf-900/50 dark:text-white/50">
          {d.articleNumberPrefix}
          {product.articleNumber}
          {d.articleNumberSuffix}
        </p>
      )}

      {/* Фаза 2: ціна/наявність тепер рахуються з листингів (siblings), а не
          задаються тут напряму — після створення товару додай хоча б один
          листинг у вкладці «Листинги» (вручну, якщо не через парсер), інакше
          товар не матиме ціни на вітрині. */}
      {!product && (
        <p className="rounded-lg bg-orange-50 p-3 text-xs text-orange-700 dark:bg-orange-950 dark:text-orange-300">
          {d.listingWarningCreate}
        </p>
      )}

      <label className="flex flex-col gap-1 text-sm text-leaf-900 dark:text-white">
        {d.categoryLabel}
        <select
          name="category"
          defaultValue={product?.category ?? 'SOLAR_PANEL'}
          disabled={!!product}
          className="rounded-lg border border-leaf-800/20 px-3 py-2 disabled:bg-leaf-50 dark:border-white/20 dark:bg-leaf-900 dark:disabled:bg-white/5"
        >
          {CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1 text-sm text-leaf-900 dark:text-white">
        {d.nameLabel}
        <input
          name="name"
          defaultValue={product?.name}
          required
          className="rounded-lg border border-leaf-800/20 px-3 py-2 dark:border-white/20 dark:bg-leaf-900"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm text-leaf-900 dark:text-white">
        {d.manufacturerLabel}
        <select
          name="manufacturerId"
          defaultValue={product?.manufacturerId ?? ''}
          className="rounded-lg border border-leaf-800/20 px-3 py-2 dark:border-white/20 dark:bg-leaf-900"
        >
          <option value="">{d.manufacturerEmpty}</option>
          {manufacturers.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1 text-sm text-leaf-900 dark:text-white">
        {d.manufacturerSkuLabel}
        <input
          name="manufacturerSku"
          defaultValue={product?.manufacturerSku ?? ''}
          className="rounded-lg border border-leaf-800/20 px-3 py-2 dark:border-white/20 dark:bg-leaf-900"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm text-leaf-900 dark:text-white">
        {d.statusLabel}
        <select
          name="status"
          defaultValue={product?.status ?? 'PUBLISHED'}
          className="rounded-lg border border-leaf-800/20 px-3 py-2 dark:border-white/20 dark:bg-leaf-900"
        >
          {STATUSES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1 text-sm text-leaf-900 dark:text-white">
        {d.imagesLabel}
        <textarea
          value={imagesText}
          onChange={(e) => setImagesText(e.target.value)}
          rows={3}
          className="rounded-lg border border-leaf-800/20 px-3 py-2 font-mono text-xs dark:border-white/20 dark:bg-leaf-900"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm text-leaf-900 dark:text-white">
        {d.shortDescriptionLabel}
        <input
          name="shortDescription"
          defaultValue={product?.shortDescription}
          required
          className="rounded-lg border border-leaf-800/20 px-3 py-2 dark:border-white/20 dark:bg-leaf-900"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm text-leaf-900 dark:text-white">
        {d.descriptionLabel}
        <textarea
          name="description"
          defaultValue={product?.description}
          rows={5}
          required
          className="rounded-lg border border-leaf-800/20 px-3 py-2 dark:border-white/20 dark:bg-leaf-900"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm text-leaf-900 dark:text-white">
        {d.specsLabel}
        <textarea
          value={specsText}
          onChange={(e) => setSpecsText(e.target.value)}
          rows={4}
          className="rounded-lg border border-leaf-800/20 px-3 py-2 font-mono text-xs dark:border-white/20 dark:bg-leaf-900"
        />
      </label>

      <label className="flex items-center gap-2 text-sm text-leaf-900 dark:text-white">
        <input type="checkbox" name="isNew" defaultChecked={product?.cachedIsNew ?? false} /> {d.isNewLabel}
      </label>

      <button
        type="submit"
        disabled={saving}
        className="w-fit rounded-full bg-sun-500 px-6 py-2 font-medium text-leaf-900 disabled:opacity-60"
      >
        {saving ? d.saving : d.save}
      </button>
    </form>
  );
}
