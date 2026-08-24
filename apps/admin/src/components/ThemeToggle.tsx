'use client';

import { useAdminTheme } from '../lib/theme-context';
import { useAdminLocale } from '../lib/locale-context';

// За прямим запитом користувача — "тот же переключатель темы что на
// клиентском сайте (отдельно)". Той самий вигляд, що
// apps/web/src/components/ThemeToggle.tsx (іконка без підпису,
// показує ПОТОЧНИЙ стан) — окрема реалізація, окремий Context
// (theme-context.tsx тут), не імпорт з apps/web (окремі Next.js
// застосунки без спільного UI-пакета).
//
// За прямим запитом користувача — "аудит... особое внимание
// переводам" — знайдено: title/aria-label тут були захардкоджені
// українською, цей компонент випадково не потрапив до попереднього
// проходу перекладу взагалі (розділ README).
export function ThemeToggle() {
  const { theme, setTheme } = useAdminTheme();
  const { dict } = useAdminLocale();
  const label = theme === 'light' ? dict.theme.switchToDark : dict.theme.switchToLight;

  return (
    <button
      onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
      className="flex h-8 w-8 items-center justify-center rounded-full border border-leaf-800/15 text-base transition-colors hover:border-leaf-800/30 dark:border-white/15 dark:hover:border-white/30"
      title={label}
      aria-label={label}
    >
      {theme === 'light' ? '☀️' : '🌙'}
    </button>
  );
}
