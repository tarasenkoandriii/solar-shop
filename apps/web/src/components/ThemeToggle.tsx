'use client';

import { useSiteTheme } from '../lib/theme-context';

// За прямим запитом користувача — "переключатель темы сделать без
// подписи, теперь это просто светлая (солнце) и темная (луна) темы".
// Іконка показує ПОТОЧНИЙ стан (не те, на що перемкне) — стандартний
// UX-патерн для таких перемикачів. title (tooltip) лишений для
// доступності — прибрано лише видимий текстовий підпис.
export function ThemeToggle() {
  const { theme, setTheme } = useSiteTheme();

  return (
    <button
      onClick={() => setTheme(theme === 'classic' ? 'modern' : 'classic')}
      className="flex h-8 w-8 items-center justify-center rounded-full border border-white/15 text-base transition-colors hover:border-white/30"
      title={theme === 'classic' ? 'Перемкнути на темну тему' : 'Перемкнути на світлу тему'}
      aria-label={theme === 'classic' ? 'Перемкнути на темну тему' : 'Перемкнути на світлу тему'}
    >
      {theme === 'classic' ? '☀️' : '🌙'}
    </button>
  );
}
