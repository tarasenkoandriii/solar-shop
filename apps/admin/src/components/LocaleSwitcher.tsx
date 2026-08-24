'use client';

import { useAdminLocale } from '../lib/locale-context';
import { ADMIN_LOCALES } from '../lib/i18n';

const LOCALE_LABEL: Record<string, string> = { uk: 'UA', ru: 'RU', en: 'EN' };

// За прямим запитом користувача — "Сделай пожалуйста мультиязычность
// в админке".
export function LocaleSwitcher() {
  const { locale, setLocale } = useAdminLocale();

  return (
    <div className="flex gap-1">
      {ADMIN_LOCALES.map((l) => (
        <button
          key={l}
          onClick={() => setLocale(l)}
          className={`rounded-full px-2 py-1 text-xs font-medium ${
            locale === l ? 'bg-sun-500 text-leaf-900' : 'text-leaf-900/50 hover:bg-leaf-800/5 dark:text-white/50 dark:hover:bg-white/10'
          }`}
        >
          {LOCALE_LABEL[l]}
        </button>
      ))}
    </div>
  );
}
