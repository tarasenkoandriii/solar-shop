'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';

// Переключатель USD/UAH (ТЗ п.24.3). Конвертация чисто отображенческая:
// canonical priceUsd умножается на последний ExchangeRate.rateUah.
// Выбор хранится в cookie для гостя.
export type Currency = 'USD' | 'UAH';

export function useCurrency(): [Currency, (c: Currency) => void] {
  const [currency, setCurrencyState] = useState<Currency>('USD');

  useEffect(() => {
    const match = document.cookie.match(/(?:^|; )currency=(USD|UAH)/);
    if (match) setCurrencyState(match[1] as Currency);
  }, []);

  const setCurrency = (c: Currency) => {
    setCurrencyState(c);
    document.cookie = `currency=${c}; path=/; max-age=${60 * 60 * 24 * 365}`;
  };

  return [currency, setCurrency];
}

// За запитом користувача — перемикач валюти актуальний лише для каталогу
// (перегляд/вибір товару), не для решти сайту. Ціни реально показуються
// й в інших місцях (кошик, кабінет/замовлення, калькулятор — перевірено
// прямим пошуком usages по всьому apps/web/src перед реалізацією), але
// кошик — природне продовження того самого потоку купівлі, тому лишений
// у переліку; кабінет/замовлення показують ЗАФІКСОВАНУ історичну ціну
// конкретного замовлення (не призначену для перемикання постфактум), а
// калькулятор — окремий інструмент оцінки, не власне каталог. Обраний
// cookie з currency все одно застосовується скрізь незалежно від
// видимості цього перемикача — просто на цих сторінках його не можна
// змінити НА МІСЦІ.
const CATALOG_PATH_PATTERN = /^\/[a-z]{2}(\/(solar-panels|batteries|controllers|products(\/.*)?|cart)?)?\/?$/;

export function CurrencySwitcher() {
  const [currency, setCurrency] = useCurrency();
  const pathname = usePathname();

  if (!CATALOG_PATH_PATTERN.test(pathname)) return null;

  return (
    <div className="flex overflow-hidden rounded-full border border-white/30 text-xs font-medium">
      {(['USD', 'UAH'] as Currency[]).map((c) => (
        <button
          key={c}
          onClick={() => setCurrency(c)}
          className={`px-2.5 py-1 transition ${
            currency === c ? 'bg-sun-500 text-leaf-900' : 'text-white/80 hover:text-white'
          }`}
        >
          {c}
        </button>
      ))}
    </div>
  );
}

export function formatPrice(priceUsd: number | string, currency: Currency, rateUah: number): string {
  const usd = typeof priceUsd === 'string' ? parseFloat(priceUsd) : priceUsd;
  if (currency === 'UAH') {
    return `${Math.round(usd * rateUah).toLocaleString('uk-UA')} ₴`;
  }
  return `$${usd.toLocaleString('en-US')}`;
}
