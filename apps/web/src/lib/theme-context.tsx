'use client';

import { createContext, useContext, useEffect, useState } from 'react';

// За прямим запитом користувача — "добавить переключатель стилей на
// клиентском сайте / classic - как сейчас (default) / modern - like
// trafficvision.live". Той самий Context-патерн, що вже CartProvider
// — не новий підхід для проєкту. localStorage, не cookie/SSR — flash
// старої теми на першому завантаженні прийнятний компроміс для
// client-side toggle такого масштабу (уникнення flash вимагало б
// SSR-інтеграції через middleware/cookie, що для перемикача
// візуального стилю, не критичного для функціональності, є
// надлишковим ускладненням).
export type SiteTheme = 'classic' | 'modern';

interface ThemeContextValue {
  theme: SiteTheme;
  setTheme: (theme: SiteTheme) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function useSiteTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useSiteTheme must be used within ThemeProvider');
  return ctx;
}

const STORAGE_KEY = 'solar-shop-theme';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<SiteTheme>('classic');

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'modern' || stored === 'classic') {
      setThemeState(stored);
      document.documentElement.setAttribute('data-theme', stored);
    }
  }, []);

  function setTheme(next: SiteTheme) {
    setThemeState(next);
    localStorage.setItem(STORAGE_KEY, next);
    document.documentElement.setAttribute('data-theme', next);
  }

  return <ThemeContext.Provider value={{ theme, setTheme }}>{children}</ThemeContext.Provider>;
}
