'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { isLocale, type Locale } from '../../../../lib/i18n';
import { clientApi } from '../../../../lib/client-api';
import { PriceTag } from '../../../../components/PriceTag';
import { useExchangeRate } from '../../../../lib/use-exchange-rate';
import type { ProjectEstimate } from '../../../../lib/api';

const STATUS_LABEL: Record<ProjectEstimate['status'], string> = {
  DRAFT: 'Чернетка',
  FINALIZED: 'Зафіксовано',
  SENT: 'Надіслано',
  CONVERTED_TO_ORDER: 'Перетворено на замовлення',
};

// ТЗ п.31.7 — /account/projects, доповнює /account/orders
export default function AccountProjectsPage() {
  const params = useParams<{ locale: string }>();
  const locale = (isLocale(params.locale) ? params.locale : 'uk') as Locale;
  const rateUah = useExchangeRate();

  const [projects, setProjects] = useState<ProjectEstimate[] | null | undefined>(undefined);

  useEffect(() => {
    clientApi<ProjectEstimate[]>('/account/projects')
      .then(setProjects)
      .catch(() => setProjects(null));
  }, []);

  if (projects === undefined) return <div className="mx-auto max-w-3xl px-4 py-10 text-leaf-900/50">Завантаження...</div>;

  if (projects === null) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center text-leaf-900/60">
        Увійдіть через Telegram, щоб побачити свої проєкти калькулятора
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-leaf-900">Мої проєкти</h1>
        <Link href={`/${locale}/calculator`} className="rounded-full bg-sun-500 px-5 py-2 text-sm font-medium text-leaf-900">
          + Новий розрахунок
        </Link>
      </div>

      {projects.length === 0 ? (
        <p className="text-leaf-900/50">Поки що немає жодного розрахунку.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {projects.map((p) => (
            <Link
              key={p.id}
              href={`/${locale}/calculator/${p.id}`}
              className="flex items-center justify-between rounded-xl border border-leaf-800/10 p-4 hover:shadow"
            >
              <div>
                <p className="font-medium text-leaf-900">{p.name}</p>
                <p className="text-sm text-leaf-900/50">{new Date(p.createdAt).toLocaleDateString('uk-UA')}</p>
              </div>
              <div className="text-right">
                <p className="font-semibold text-leaf-900">
                  <PriceTag priceUsd={p.totalUsd} rateUah={rateUah} />
                </p>
                <p className="text-sm text-leaf-900/50">{STATUS_LABEL[p.status]}</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
