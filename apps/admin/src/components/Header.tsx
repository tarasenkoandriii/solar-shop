'use client';

import { useAdminLocale } from '../lib/locale-context';
import { ThemeToggle } from './ThemeToggle';
import { LocaleSwitcher } from './LocaleSwitcher';

// За прямим запитом користувача — "назву проекта - лого - вибір мови
// і теми перенести в заголовок такий як на клієнтському сайті".
// Той самий структурний патерн, що apps/web/src/components/Header.tsx
// (sticky top-0, лого зліва, перемикачі справа) — АЛЕ значно
// простіше: адмінка не має публічної навігації/кошика/акаунту, лише
// бренд + мова/тема. Окремий Context від клієнтського сайту (theme-
// context.tsx/locale-context.tsx тут, розділ 121 README) — перемикачі
// НЕ впливають на клієнтський сайт і навпаки.
export function Header() {
  const { dict } = useAdminLocale();

  return (
    <header className="sticky top-0 z-30 border-b border-leaf-800/10 bg-white px-4 py-3 dark:border-white/10 dark:bg-leaf-900">
      <div className="flex items-center justify-between">
        <p className="text-lg font-bold text-leaf-900 dark:text-white">{dict.sidebar.brand}</p>
        <div className="flex items-center gap-2">
          <LocaleSwitcher />
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
