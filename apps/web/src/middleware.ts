import { NextRequest, NextResponse } from 'next/server';
import { defaultLocale, locales, type Locale } from './lib/i18n';

export const config = {
  matcher: ['/((?!_next|api|embed|favicon.ico|robots.txt|sitemap.xml|.*\\..*).*)'],
};

function pickLocaleFromAcceptLanguage(header: string | null): Locale | null {
  if (!header) return null;
  const preferred = header
    .split(',')
    .map((part) => part.split(';')[0].trim().slice(0, 2).toLowerCase());
  for (const lang of preferred) {
    if ((locales as readonly string[]).includes(lang)) return lang as Locale;
  }
  return null;
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const pathnameHasLocale = locales.some(
    (locale) => pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`,
  );
  if (pathnameHasLocale) return NextResponse.next();

  // ТЗ п.29.2: cookie > Accept-Language > x-vercel-ip-country (UA -> uk) > default.
  // Заголовки x-vercel-ip-* доступны только за Vercel Edge Network — в Docker
  // Compose (ТЗ п.29 warning) их не будет, поэтому везде безопасный фолбэк.
  const cookieLocale = request.cookies.get('NEXT_LOCALE')?.value;
  let locale: Locale = defaultLocale;

  if (cookieLocale && (locales as readonly string[]).includes(cookieLocale)) {
    locale = cookieLocale as Locale;
  } else {
    const fromHeader = pickLocaleFromAcceptLanguage(request.headers.get('accept-language'));
    if (fromHeader) {
      locale = fromHeader;
    } else {
      const country = request.headers.get('x-vercel-ip-country');
      locale = country === 'UA' ? 'uk' : 'en';
    }
  }

  const url = request.nextUrl.clone();
  url.pathname = `/${locale}${pathname === '/' ? '' : pathname}`;
  return NextResponse.redirect(url);
}
