'use client';

import { useRouter, useSearchParams } from 'next/navigation';

// ТЗ п.32.3 — фільтр по типу клієнта + сортування. Перероблено 19.08.2026
// разом із рештою сторінки — rounded-full замість rounded-lg, узгоджено з
// pill-стилем, що вже встановлений на сайті (CurrencySwitcher тощо), не
// винайдено заново.
export function FinancingFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();

  function updateParam(key: string, value: string | null) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    router.push(`?${params.toString()}`);
  }

  return (
    <div className="mb-6 flex flex-wrap gap-2">
      <select
        value={searchParams.get('eligibility') ?? ''}
        onChange={(e) => updateParam('eligibility', e.target.value || null)}
        className="rounded-full border border-leaf-800/15 bg-white px-3.5 py-1.5 text-xs font-medium text-leaf-900 hover:border-leaf-800/30"
      >
        <option value="">Усі типи клієнтів</option>
        <option value="фізичні">Фізичні особи</option>
        <option value="ОСББ">ОСББ/ЖБК</option>
        <option value="бізнес">Бізнес</option>
      </select>
      <select
        value={searchParams.get('sort') ?? ''}
        onChange={(e) => updateParam('sort', e.target.value || null)}
        className="rounded-full border border-leaf-800/15 bg-white px-3.5 py-1.5 text-xs font-medium text-leaf-900 hover:border-leaf-800/30"
      >
        <option value="">За датою перевірки</option>
        <option value="amount_desc">За сумою (спадання)</option>
        <option value="name">За назвою</option>
      </select>
    </div>
  );
}
