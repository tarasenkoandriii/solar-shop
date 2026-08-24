'use client';

import { createContext, useContext, useEffect, useState } from 'react';

// За прямим запитом користувача — "тот же переключатель темы что на
// клиентском сайте (отдельно)". Той самий Context-патерн, що вже
// apps/web/src/lib/theme-context.tsx — АЛЕ окремий ключ localStorage
// (не спільний з клієнтським сайтом, "окремо" — явна вимога).
// Спрощено до light/dark (не classic/modern з повним редизайном, як
// на клієнті) — адмінка вже побудована на чистих Tailwind-класах без
// кастомних CSS-змінних теми (на відміну від apps/web, де 73
// [data-theme=modern] override-правила), тому природний підхід тут —
// стандартна Tailwind `dark:` стратегія (`darkMode: 'class'` у
// tailwind.config.ts), не копіювання складної CSS-архітектури
// клієнта без потреби.
export type AdminTheme = 'light' | 'dark';

interface ThemeContextValue {
  theme: AdminTheme;
  setTheme: (theme: AdminTheme) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function useAdminTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useAdminTheme must be used within AdminThemeProvider');
  return ctx;
}

const STORAGE_KEY = 'solar-shop-admin-theme';

export function AdminThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<AdminTheme>('light');

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'dark' || stored === 'light') {
      setThemeState(stored);
      document.documentElement.classList.toggle('dark', stored === 'dark');
    }
  }, []);

  function setTheme(next: AdminTheme) {
    setThemeState(next);
    localStorage.setItem(STORAGE_KEY, next);
    document.documentElement.classList.toggle('dark', next === 'dark');
  }

  return <ThemeContext.Provider value={{ theme, setTheme }}>{children}</ThemeContext.Provider>;
}
