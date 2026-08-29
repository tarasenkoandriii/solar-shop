// Чиста логіка валюти — БЕЗ 'use client'.
//
// Цей файл існує саме через баг, який я сюди й приніс (27.08.2026).
// Спочатку і хук-провайдер, і parseCurrencyCookie/formatPrice лежали в
// одному файлі currency-context.tsx із директивою 'use client'. Виглядало
// охайно й компілювалось без зауважень, але в проді сторінка падала з
//
//   TypeError: d is not a function
//
// Причина: Next перетворює КОЖЕН експорт модуля з 'use client' на
// клієнтське посилання-заглушку. Серверний компонент, який імпортує
// звідти функцію, отримує не функцію, а маркер для збірника — і виклик
// падає вже під час серіалізації RSC-дерева, тобто зі стеком у
// мініфікованому чанку, де від початкової причини не лишається сліду.
//
// Правило, яке з цього випливає: із 'use client'-модуля серверний код
// може імпортувати ТІЛЬКИ компоненти (їх Next рендерить на клієнті), але
// не звичайні функції та константи. Усе, що треба обом сторонам, живе в
// звичайному модулі — оцьому.
//
// Причини самої зміни (гривня за замовчуванням, курс без вигаданого
// фолбеку) описані в currency-context.tsx.

export type Currency = 'USD' | 'UAH';

// Валюта за замовчуванням для тих, хто ще не робив вибору. Українська
// компанія, українські покупці, ціни в договорі й рахунку — у гривні.
export const DEFAULT_CURRENCY: Currency = 'UAH';

// Розбір cookie. Викликається на СЕРВЕРІ (у [locale]/layout.tsx) — саме
// тому й не може лежати в клієнтському модулі.
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
