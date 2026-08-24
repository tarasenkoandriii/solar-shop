'use client';

import { Fragment, useState } from 'react';
import Link from 'next/link';
import { clientApi, getOrCreateSessionId } from '../lib/client-api';
import type { ResolvedSpecItem } from '../lib/api';
import { PriceTag } from './PriceTag';
import { useExchangeRate } from '../lib/use-exchange-rate';

const CATEGORY_LABEL: Record<ResolvedSpecItem['category'], string> = {
  SOLAR_PANEL: 'Сонячні панелі',
  BATTERY: 'Акумулятори',
  CONTROLLER: 'Контролери заряду',
  // За прямим запитом користувача ("исправь добавлением категории")
  // — інвертор тепер частина каталогу, той самий принцип, що вже
  // CABLE/CONNECTOR нижче.
  INVERTER: 'Інвертори',
  // За прямим запитом користувача ("явно упущен раздел кабели и
  // соединители") — знайдено реальний баг: без цих двох рядків
  // CATEGORY_LABEL['CABLE'] повертав би undefined (React рендерить це
  // як порожній рядок замість назви групи) — категорія існувала б у
  // даних, але виглядала б "безіменною" в UI.
  CABLE: 'Кабель',
  CONNECTOR: 'Конектори',
};

export function SpecTable({
  estimateId,
  items,
  onItemsChange,
  locale,
}: {
  estimateId: string;
  items: ResolvedSpecItem[];
  onItemsChange: (items: ResolvedSpecItem[]) => void;
  locale: string;
}) {
  const rateUah = useExchangeRate();
  const [toast, setToast] = useState<string | null>(null);
  const [busyProductId, setBusyProductId] = useState<string | null>(null);

  const grouped = items.reduce<Record<string, ResolvedSpecItem[]>>((acc, item) => {
    (acc[item.category] ??= []).push(item);
    return acc;
  }, {});

  function showToast(text: string) {
    setToast(text);
    setTimeout(() => setToast(null), 2000);
  }

  // Степпер — мгновенный пересчёт на клиенте (ТЗ п.31.2.1), плюс сразу
  // персистится на бэкенд (без дебаунса — позиций мало, 1 запрос на клик
  // не создаёт нагрузки), чтобы «В кошик» уходило с актуальным количеством.
  async function updateQuantity(productId: string, quantity: number) {
    if (quantity < 1) return;
    const updated = items.map((i) => (i.productId === productId ? { ...i, quantity } : i));
    onItemsChange(updated);
    await clientApi(`/calculator/${estimateId}/spec?sessionId=${getOrCreateSessionId()}`, {
      method: 'PUT',
      body: JSON.stringify({ items: updated.map((i) => ({ productId: i.productId, quantity: i.quantity })) }),
    });
  }

  async function addToCart(productIds?: string[]) {
    const key = productIds?.[0] ?? 'group';
    setBusyProductId(key);
    try {
      await clientApi(`/calculator/${estimateId}/add-to-cart?sessionId=${getOrCreateSessionId()}`, {
        method: 'POST',
        body: JSON.stringify({ productIds }),
      });
      showToast('Додано в кошик');
    } finally {
      setBusyProductId(null);
    }
  }

  const total = items.reduce((sum, i) => sum + i.priceUsd * i.quantity, 0);

  return (
    <div className="relative overflow-x-auto rounded-2xl border border-leaf-800/10 bg-white">
      {toast && (
        <div className="absolute right-4 top-4 z-10 rounded-full bg-leaf-900 px-4 py-2 text-sm text-white shadow-lg">
          {toast}
        </div>
      )}
      <table className="w-full text-sm">
        <tbody>
          {Object.entries(grouped).map(([category, groupItems]) => (
            <Fragment key={category}>
              <tr className="border-b border-leaf-800/10 bg-leaf-50/60">
                <td colSpan={4} className="py-2 pl-4 font-medium text-leaf-900">
                  {CATEGORY_LABEL[category as ResolvedSpecItem['category']]}
                </td>
                <td className="pr-4 text-right">
                  {/* За прямим запитом користувача — "при одной позиции
                      в группе не показывать кнопку вся группа" (кнопка
                      дублювала б єдину "В кошик" нижче без користі) */}
                  {groupItems.length > 1 && (
                    <button
                      onClick={() => addToCart(groupItems.map((i) => i.productId))}
                      disabled={busyProductId === 'group'}
                      className="rounded-full border border-leaf-800 px-3 py-1 text-xs font-medium text-leaf-800 hover:bg-leaf-800/5 disabled:opacity-50"
                    >
                      🛒 Уся група
                    </button>
                  )}
                </td>
              </tr>
              {groupItems.map((item) => (
                <tr key={item.productId} className="border-b border-leaf-800/5">
                  <td className="py-3 pl-4">
                    <Link href={`/${locale}/products/${item.slug}`} className="text-leaf-900 hover:underline">
                      {item.name}
                    </Link>
                    <p className="text-xs text-leaf-900/40">{item.articleNumber}</p>
                  </td>
                  <td>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                        disabled={item.quantity <= 1}
                        className="h-7 w-7 rounded-full border border-leaf-800/20 text-leaf-800 disabled:opacity-30"
                      >
                        ◀
                      </button>
                      <input
                        type="number"
                        min={1}
                        value={item.quantity}
                        onChange={(e) => updateQuantity(item.productId, Math.max(1, Number(e.target.value)))}
                        className="w-12 rounded-lg border border-leaf-800/20 px-1 py-1 text-center"
                      />
                      {/* За прямим запитом користувача — товари категорії
                          CABLE продаються "за погонний метр" (розділ
                          README), 12 без одиниці виміру виглядало б як
                          12 штук — плутанина з рештою категорій. */}
                      {item.soldByMeter && <span className="text-xs text-leaf-900/40">м</span>}
                      <button
                        onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                        className="h-7 w-7 rounded-full border border-leaf-800/20 text-leaf-800"
                      >
                        ▶
                      </button>
                    </div>
                  </td>
                  <td className="text-leaf-900/70">
                    <PriceTag priceUsd={item.priceUsd * item.quantity} rateUah={rateUah} />
                  </td>
                  <td className="pr-2 text-right">
                    <button
                      onClick={() => addToCart([item.productId])}
                      disabled={busyProductId === item.productId}
                      className="rounded-full bg-sun-500 px-3 py-1 text-xs font-medium text-leaf-900 hover:bg-sun-400 disabled:opacity-50"
                    >
                      🛒 В кошик
                    </button>
                  </td>
                  <td />
                </tr>
              ))}
            </Fragment>
          ))}
        </tbody>
      </table>
      <div className="flex items-center justify-between border-t border-leaf-800/10 p-4">
        <span className="font-semibold text-leaf-900">Разом</span>
        <span className="text-lg font-bold text-leaf-800">
          <PriceTag priceUsd={total} rateUah={rateUah} />
        </span>
      </div>
    </div>
  );
}
