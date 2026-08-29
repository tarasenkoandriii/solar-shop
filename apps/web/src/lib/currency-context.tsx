'use client';

import { createContext, useContext, useState, type ReactNode } from 'react';
import { DEFAULT_CURRENCY, type Currency } from './currency';

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
//
// УВАГА: у цьому файлі лишається ЛИШЕ те, що виконується на клієнті.
// Чисті функції (parseCurrencyCookie, formatPrice) і константи живуть у
// сусідньому ./currency.ts — там же пояснено, чому: серверний компонент
// не може імпортувати функцію з 'use client'-модуля, і саме на цьому я
// вже спіймався (TypeError: d is not a function у проді).
export type { Currency };
export { DEFAULT_CURRENCY, parseCurrencyCookie, formatPrice } from './currency';

interface CurrencyContextValue {
  currency: Currency;
  setCurrency: (c: Currency) => void;
  // null = курс невідомий (запит до API не вдався). Саме null, а не
  // підставлене число: краще показати ціну в доларах, ніж у гривні за
  // курсом, узятим зі стелі. Див. formatPrice у ./currency.ts.
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
    return { currency: DEFAULT_CURRENCY, setCurrency: () => undefined, rateUah: null };
  }
  return ctx;
}
