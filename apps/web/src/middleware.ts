import { NextRequest, NextResponse } from 'next/server';
import { defaultLocale, locales, type Locale } from './lib/i18n';

export const config = {
  matcher: ['/((?!_next|api|embed|favicon.ico|robots.txt|sitemap.xml|.*\\..*).*)'],
};

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const pathnameHasLocale = locales.some(
    (locale) => pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`,
  );
  if (pathnameHasLocale) return NextResponse.next();

  // За прямим запитом користувача — "по умолчанию при первом запуске
  // поставь украинский язык если пользователь явно не выбрал -
  // политика банка. для всего сайда дефаулт - украинский". Раніше тут
  // був автоматичний вибір за Accept-Language заголовком браузера і
  // geo-IP (x-vercel-ip-country) — ОБИДВА це вгадування БЕЗ явної дії
  // користувача, не "вибір" у сенсі бізнес-вимоги. Єдине джерело, що
  // рахується явним вибором — cookie NEXT_LOCALE, який встановлюється
  // ЛИШЕ коли людина сама натискає перемикач мови на сайті. Немає
  // cookie — завжди defaultLocale ('uk'), незалежно від мови браузера
  // чи країни за IP.
  const cookieLocale = request.cookies.get('NEXT_LOCALE')?.value;
  const locale: Locale =
    cookieLocale && (locales as readonly string[]).includes(cookieLocale) ? (cookieLocale as Locale) : defaultLocale;

  const url = request.nextUrl.clone();
  url.pathname = `/${locale}${pathname === '/' ? '' : pathname}`;
  return NextResponse.redirect(url);
}
