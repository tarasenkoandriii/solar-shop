import { NextRequest, NextResponse } from 'next/server';
import { defaultLocale, locales, retiredLocales, type Locale } from './lib/i18n';

export const config = {
  matcher: ['/((?!_next|api|embed|favicon.ico|robots.txt|sitemap.xml|.*\\..*).*)'],
};

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const pathnameHasLocale = locales.some(
    (locale) => pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`,
  );
  if (pathnameHasLocale) return NextResponse.next();

  // За запитом користувача (27.08.2026) — російську прибрано зі списку
  // мов. Але посилання на /ru/... уже існують: у пошуковій видачі, в
  // закладках, у розсиланнях. Без цієї гілки вони б не просто ламались, а
  // ламались НЕПРАВИЛЬНО: код нижче дописує префікс до шляху, тож
  // /ru/products/x перетворився б на /uk/ru/products/x і дав 404.
  //
  // 308, а не 307: постійне перенаправлення передає сторінці-приймачу
  // накопичену вагу в пошуку, тимчасове — ні.
  const retired = retiredLocales.find((locale) => pathname === `/${locale}` || pathname.startsWith(`/${locale}/`));
  if (retired) {
    const url = request.nextUrl.clone();
    const rest = pathname.slice(retired.length + 1); // '/ru/products/x' → '/products/x'; '/ru' → ''
    url.pathname = `/${defaultLocale}${rest}`;
    const response = NextResponse.redirect(url, 308);
    // Інакше збережений вибір "ru" повертав би людину сюди щоразу.
    response.cookies.delete('NEXT_LOCALE');
    return response;
  }

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
