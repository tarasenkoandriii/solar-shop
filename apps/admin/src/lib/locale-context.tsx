'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import type { AdminDictionary } from './i18n';
import { ADMIN_LOCALES, type AdminLocale } from './i18n';
import { uk } from './dictionaries/uk';
import { ru } from './dictionaries/ru';
import { en } from './dictionaries/en';

// За прямим запитом користувача — "Сделай пожалуйста мультиязычность
// в админке". Той самий Context-патерн, що вже theme-context.tsx на
// apps/web — не новий підхід для проєкту. Client-side, localStorage,
// без URL-locale (адмінка не публічний SEO-контент).
const DICTIONARIES: Record<AdminLocale, AdminDictionary> = { uk, ru, en };

interface LocaleContextValue {
  locale: AdminLocale;
  setLocale: (locale: AdminLocale) => void;
  dict: AdminDictionary;
}

const LocaleContext = createContext<LocaleContextValue | null>(null);

export function useAdminLocale(): LocaleContextValue {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error('useAdminLocale must be used within AdminLocaleProvider');
  return ctx;
}

const STORAGE_KEY = 'solar-shop-admin-locale';

export function AdminLocaleProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<AdminLocale>('uk');

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    // Звіряємося саме з ADMIN_LOCALES, а не з переліком літералів: після
    // прибирання російської (27.08.2026) у частини співробітників у
    // localStorage лишилося збережене 'ru', і жорсткий список повертав би
    // їх у прибрану мову при кожному вході. Тепер таке значення просто
    // ігнорується — лишається дефолтна 'uk'.
    if (stored && (ADMIN_LOCALES as string[]).includes(stored)) {
      setLocaleState(stored as AdminLocale);
    }
  }, []);

  function setLocale(next: AdminLocale) {
    setLocaleState(next);
    localStorage.setItem(STORAGE_KEY, next);
  }

  return <LocaleContext.Provider value={{ locale, setLocale, dict: DICTIONARIES[locale] }}>{children}</LocaleContext.Provider>;
}
