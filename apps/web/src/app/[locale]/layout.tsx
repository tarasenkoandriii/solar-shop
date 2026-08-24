import type { ReactNode } from 'react';
import { notFound } from 'next/navigation';
import { isLocale, type Locale } from '../../lib/i18n';
import { CartProvider } from '../../lib/cart-context';
import { ThemeProvider } from '../../lib/theme-context';
import { Header } from '../../components/Header';
import { Footer } from '../../components/Footer';

export function generateStaticParams() {
  return [{ locale: 'uk' }, { locale: 'ru' }, { locale: 'en' }];
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
