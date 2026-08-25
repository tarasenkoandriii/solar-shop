'use client';

import { useState } from 'react';
import { useAdminLocale } from '../lib/locale-context';
import { apiFetch } from '../lib/api';
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
  const [loggingOut, setLoggingOut] = useState(false);

  // За прямим запитом користувача — "добавить простую кнопку logout
  // в шапку админки (просто чистит cookie session и обновляет
  // страницу)". Бекенд-ендпоінт POST /auth/logout вже реально існував
  // (res.clearCookie('session'), httpOnly-cookie — клієнтський JS не
  // може видалити її напряму, тому саме через бекенд, не document.cookie).
  async function handleLogout() {
    setLoggingOut(true);
    try {
      await apiFetch('/auth/logout', { method: 'POST' });
    } finally {
      window.location.reload();
    }
  }

  return (
    <header className="sticky top-0 z-30 border-b border-leaf-800/10 bg-white px-4 py-3 dark:border-white/10 dark:bg-leaf-900">
      <div className="flex items-center justify-between">
        <p className="text-lg font-bold text-leaf-900 dark:text-white">{dict.sidebar.brand}</p>
        <div className="flex items-center gap-2">
          <LocaleSwitcher />
          <ThemeToggle />
          <button
            onClick={handleLogout}
            disabled={loggingOut}
            className="rounded-full border border-leaf-800/15 px-3 py-1.5 text-xs font-medium text-leaf-900/70 hover:border-leaf-800/30 disabled:opacity-50 dark:border-white/15 dark:text-white/70 dark:hover:border-white/30"
          >
            {dict.logout}
          </button>
        </div>
      </div>
    </header>
  );
}
