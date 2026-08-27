import type { ReactNode } from 'react';
import { notFound } from 'next/navigation';
import { isLocale, locales, type Locale } from '../../lib/i18n';
import { CartProvider } from '../../lib/cart-context';
import { ThemeProvider } from '../../lib/theme-context';
import { Header } from '../../components/Header';
import { Footer } from '../../components/Footer';

// Список мов тут раніше був продубльований літералами — і при прибиранні
// російської (27.08.2026) це стало б четвертим місцем, яке треба не
// забути. Тепер джерело одне: lib/i18n.ts.
export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export default function LocaleLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: { locale: string };
}) {
  if (!isLocale(params.locale)) notFound();
  const locale = params.locale as Locale;

  return (
    <ThemeProvider>
      <CartProvider>
        <Header locale={locale} />
        <main className="flex-1">{children}</main>
        <Footer locale={locale} />
      </CartProvider>
    </ThemeProvider>
  );
}
