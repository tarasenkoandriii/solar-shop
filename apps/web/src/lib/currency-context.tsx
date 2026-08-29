'use client';

import { createContext, useContext, useState, type ReactNode } from 'react';

// За запитом користувача (27.08.2026) — ціни за замовчуванням у гривні.
//
// Чому це не звелося до заміни одного рядка 'USD' → 'UAH'.
//
// Було так: useCurrency() стартував з дефолту, а cookie дочитувався в
// useEffect, тобто ВЖЕ після гідратації. З дефолтом 'USD' це нікому не
// заважало — більшість і бачила долари. Варто зробити дефолтом гривню, і
// та сама механіка ламає саме те, заради чого зміну робили: сервер
// віддавав би сторінку з доларами, а гривня з'являлася б за мить у
// браузері. Тобто на кожному завантаженні спалах доларових цін, а в
// індекс Google (він читає саме серверний HTML) потрапляли б долари.
//
// Друга половина тієї ж проблеми — курс. Половина сторінок (кошик,
// кабінет, калькулятор) брала його клієнтським useExchangeRate(), який
// стартував із захардкодженої константи 41.5 і мовчки ковтав помилку
// запиту. Поки гривня була справою меншості, це був дрібний недолік. Як
// валюта за замовчуванням — це вже кожна ціна на сайті, порахована за
// вигаданим курсом, і жодного сліду, коли щось пішло не так.
//
// Тому обидва значення тепер приходять із СЕРВЕРА (див. [locale]/layout.tsx):
// вибір валюти читається з cookie при рендері, курс — тим самим запитом,
// що вже кешується на годину для каталогу. Клієнт нічого не вгадує.

export type Currency = 'USD' | 'UAH';

// Валюта за замовчуванням для тих, хто ще не робив вибору. Українська
// компанія, українські покупці, ціни в договорі й рахунку — у гривні.
export const DEFAULT_CURRENCY: Currency = 'UAH';

interface CurrencyContextValue {
  currency: Currency;
  setCurrency: (c: Currency) => void;
  // null = курс невідомий (запит до API не вдався). Саме null, а не
  // підставлене число: краще показати ціну в доларах, ніж у гривні за
  // курсом, узятим зі стелі. Див. PriceTag.
  rateUah: number | null;
}

const CurrencyContext = createContext<CurrencyContextValue | null>(null);

export function CurrencyProvider({
  initialCurrency,
  rateUah,
  children,
}: {
  initialCurrency: Currency;
  rateUah: number | null;
  children: ReactNode;
}) {
  const [currency, setCurrencyState] = useState<Currency>(initialCurrency);

  const setCurrency = (c: Currency) => {
    setCurrencyState(c);
    document.cookie = `currency=${c}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
  };

  return <CurrencyContext.Provider value={{ currency, setCurrency, rateUah }}>{children}</CurrencyContext.Provider>;
}

export function useCurrencyContext(): CurrencyContextValue {
  const ctx = useContext(CurrencyContext);
  if (!ctx) {
    // Не кидаємо: ціна на сторінці поза провайдером має показатися, а не
    // покласти всю сторінку. Долари без курсу — коректний запасний вихід.
    return { currency: 'USD', setCurrency: () => undefined, rateUah: null };
  }
  return ctx;
}

// Розбір cookie на боці сервера. Окрема функція, щоб layout не тягнув
// клієнтський модуль і щоб формат зберігання був описаний в одному місці.
export function parseCurrencyCookie(value: string | undefined): Currency {
  return value === 'USD' || value === 'UAH' ? value : DEFAULT_CURRENCY;
}

export function formatPrice(priceUsd: number | string, currency: Currency, rateUah: number | null): string {
  const usd = typeof priceUsd === 'string' ? parseFloat(priceUsd) : priceUsd;
  if (!Number.isFinite(usd)) return '—';

  // Гривню показуємо ЛИШЕ коли курс справді відомий. Інакше — долари:
  // це чесне число, просто в іншій валюті, на відміну від гривні за
  // вигаданим курсом, яку покупець прийме за справжню ціну.
  if (currency === 'UAH' && rateUah !== null) {
    return `${Math.round(usd * rateUah).toLocaleString('uk-UA')} ₴`;
  }
  return `$${usd.toLocaleString('en-US')}`;
}
