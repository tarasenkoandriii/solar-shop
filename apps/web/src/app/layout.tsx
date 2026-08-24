import type { ReactNode } from 'react';
import './globals.css';

// За прямим запитом користувача ("добавить переключатель стилей") —
// невеликий inline-скрипт у <head>, що читає збережену тему з
// localStorage СИНХРОННО, ДО рендеру React — усуває мерехтіння
// (flash старої теми при завантаженні) без складної SSR/cookie-
// інтеграції. Стандартна, легка техніка для client-side theme
// toggle (той самий принцип, що бібліотеки на кшталт next-themes).
const THEME_INIT_SCRIPT = `
try {
  var t = localStorage.getItem('solar-shop-theme');
  if (t === 'modern') document.documentElement.setAttribute('data-theme', 'modern');
} catch (e) {}
`;

// Единственный html/body во всём дереве — здесь, а не в app/[locale]/layout.tsx,
// чтобы не дублировать теги. lang задаётся статично, т.к. Next.js App Router
// не даёт нативно прокинуть params сегмента [locale] в корневой layout без
// сторонних библиотек (next-intl и т.п.) — сознательное упрощение Фазы 1,
// сам контент внутри всё равно рендерится на выбранной locale.
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="uk">
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="flex min-h-screen flex-col">{children}</body>
    </html>
  );
}
