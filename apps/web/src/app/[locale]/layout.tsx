import type { ReactNode } from 'react';
import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';
import { isLocale, locales, type Locale } from '../../lib/i18n';
import { CartProvider } from '../../lib/cart-context';
import { ThemeProvider } from '../../lib/theme-context';
// ВАЖЛИВО: провайдер (компонент) — із 'use client'-модуля, а
// parseCurrencyCookie (звичайна функція, викликається ТУТ, на сервері) —
// із чистого ./currency. Якщо взяти її з currency-context, Next віддасть
// клієнтське посилання-заглушку замість функції, і сторінка впаде в проді
// з "TypeError: d is not a function". Саме це й сталося — детально в
// коментарі у lib/currency.ts.
import { CurrencyProvider } from '../../lib/currency-context';
import { parseCurrencyCookie } from '../../lib/currency';
import { apiGet, type ExchangeRate } from '../../lib/api';
import { Header } from '../../components/Header';
import { Footer } from '../../components/Footer';

// Список мов тут раніше був продубльований літералами — і при прибиранні
// російської (27.08.2026) це стало б четвертим місцем, яке треба не
// забути. Тепер джерело одне: lib/i18n.ts.
export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

// Курс тягнемо тут, у layout, а не в кожній сторінці окремо: після
// переходу на гривню за замовчуванням (27.08.2026) він потрібен КОЖНІЙ
// сторінці, де є ціна — кошику, кабінету, калькулятору, а не лише
// каталогу. Той самий кеш на годину, що вже використовує каталог, тож
// зайвих запитів це не додає.
//
// null при помилці — свідомо, замість колишнього фолбеку 41.5: краще
// показати долари, ніж гривню за вигаданим курсом (див. formatPrice).
async function loadRateUah(): Promise<number | null> {
  try {
    const rate = await apiGet<ExchangeRate>('/currency/rate', 3600);
    const parsed = parseFloat(rate.rateUah);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  } catch {
    return null;
  }
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: { locale: string };
}) {
  if (!isLocale(params.locale)) notFound();
  const locale = params.locale as Locale;

  // Вибір валюти читається на СЕРВЕРІ — інакше перший рендер пішов би з
  // дефолтом, а збережений вибір застосувався б уже після гідратації:
  // спалах цін в іншій валюті на кожному завантаженні.
  const currency = parseCurrencyCookie(cookies().get('currency')?.value);
  const rateUah = await loadRateUah();

  return (
    <ThemeProvider>
      <CurrencyProvider initialCurrency={currency} rateUah={rateUah}>
      <CartProvider>
        <Header locale={locale} />
        <main className="flex-1">{children}</main>
        <Footer locale={locale} />
      </CartProvider>
      </CurrencyProvider>
    </ThemeProvider>
  );
}
