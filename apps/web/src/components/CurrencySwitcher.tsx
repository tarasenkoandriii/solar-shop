'use client';

import { usePathname } from 'next/navigation';
import { useCurrencyContext, type Currency } from '../lib/currency-context';

// Переключатель USD/UAH (ТЗ п.24.3). Конвертация чисто отображенческая:
// canonical priceUsd умножается на последний ExchangeRate.rateUah.
// Выбор хранится в cookie для гостя.
//
// За запитом користувача (27.08.2026) валюта за замовчуванням — гривня.
// Сам стан переїхав у lib/currency-context.tsx: і вибір, і курс тепер
// приходять із сервера, бо інакше перший рендер ішов би з дефолтом і
// давав спалах цін в іншій валюті. Причини докладно — у коментарі там.
export type { Currency };

// Реекспорт для сумісності: на нього ще посилаються PriceTag і сторінки.
export { formatPrice } from '../lib/currency-context';

export function useCurrency(): [Currency, (c: Currency) => void] {
  const { currency, setCurrency } = useCurrencyContext();
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
  const { currency, setCurrency, rateUah } = useCurrencyContext();
  const pathname = usePathname();

  if (!CATALOG_PATH_PATTERN.test(pathname)) return null;

  // Курс невідомий — перемикати нема на що: гривневі ціни все одно
  // показати неможливо, і кнопка UAH просто нічого б не робила.
  // Ховаємо весь перемикач, а не показуємо мертву кнопку.
  if (rateUah === null) return null;

  return (
    <div className="flex overflow-hidden rounded-full border border-white/30 text-xs font-medium">
      {(['UAH', 'USD'] as Currency[]).map((c) => (
        <button
          key={c}
          onClick={() => setCurrency(c)}
          className={`px-2.5 py-1 transition ${
            currency === c ? 'bg-sun-500 text-leaf-900' : 'text-white/80 hover:text-white'
          }`}
        >
          {c === 'UAH' ? '₴' : '$'}
        </button>
      ))}
    </div>
  );
}
