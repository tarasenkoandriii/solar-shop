// За запитом користувача (27.08.2026) — прибрати російську зі списку мов,
// але СЛОВНИКИ лишити. Тому тут два списки, а не один.
//
// allLocales — усі локалі, для яких у проєкті є словник і тексти. Саме на
// ньому будується тип Locale, тож dictionaries/ru.json, гілки
// `locale === 'ru'` у сторінках offer/privacy/articles і словник адмінки
// лишаються валідними й компілюються як раніше. Нічого не видалено —
// повернути мову = дописати один рядок нижче.
export const allLocales = ['uk', 'ru', 'en'] as const;
export type Locale = (typeof allLocales)[number];

// locales — те, що РЕАЛЬНО пропонується користувачу. З цього списку
// автоматично живуть: перемикач мови, generateStaticParams, sitemap.xml,
// news-sitemap і перевірка префікса в middleware. Досить прибрати мову
// звідси — і вона зникає з усіх п'яти місць одночасно.
export const locales = ['uk', 'en'] as const satisfies readonly Locale[];

export const defaultLocale: Locale = 'uk';

// Локалі, що були публічними раніше. Потрібні саме middleware: старі
// посилання й закладки на /ru/... мають вести на /uk/..., а не в 404 —
// інакше втрачаємо і відвідувачів, і вагу сторінок у пошуку.
export const retiredLocales = allLocales.filter((l) => !(locales as readonly string[]).includes(l));

// Чи це локаль, яку ми зараз обслуговуємо. Використовується сторінками
// для notFound() — після цієї зміни /ru/... сюди вже не доходить, його
// перехоплює middleware.
export function isLocale(value: string): value is Locale {
  return (locales as readonly string[]).includes(value);
}

// Чи знаємо ми таку локаль узагалі (включно з прибраними). Окремо від
// isLocale: перевірка "чи є словник" і перевірка "чи пропонуємо" — це
// різні питання, і плутати їх не варто.
export function isKnownLocale(value: string): value is Locale {
  return (allLocales as readonly string[]).includes(value);
}
