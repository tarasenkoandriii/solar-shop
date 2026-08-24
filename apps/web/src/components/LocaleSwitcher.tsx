'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { locales, type Locale } from '../lib/i18n';

// За запитом користувача — сховати перемикач мови у вигляді завжди
// видимого списку "uk ru en" тексту, замінити на випадний список із
// прапорцями. Свідомо: для "ru" НЕ використовується прапор Російської
// Федерації — це українська компанія (контекст проєкту: Київ, воєнний
// час), "ru" тут — мова інтерфейсу для російськомовних українських
// клієнтів, не орієнтація на ринок РФ. Прапор РФ на українському сайті
// в поточному контексті був би недоречний незалежно від технічної
// зручності — нейтральна іконка глобуса замість прапора саме для цього
// пункту, прапори лишені для uk/en, де жодної подібної проблеми немає.
const LOCALE_META: Record<Locale, { flag: string; label: string }> = {
  uk: { flag: '🇺🇦', label: 'Українська' },
  ru: { flag: '🌐', label: 'Русский' },
  en: { flag: '🇬🇧', label: 'English' },
};

export function LocaleSwitcher({ current }: { current: Locale }) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const switchTo = (locale: Locale) => {
    document.cookie = `NEXT_LOCALE=${locale}; path=/; max-age=${60 * 60 * 24 * 365}`;
    const rest = pathname.split('/').slice(2).join('/');
    router.push(`/${locale}/${rest}`);
    setOpen(false);
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Обрати мову"
        aria-expanded={open}
        className="flex items-center gap-1 rounded-full px-2 py-1 text-sm text-white/80 hover:text-white"
      >
        <span aria-hidden>{LOCALE_META[current].flag}</span>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-3 w-3 opacity-60">
          <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {open && (
        <div className="absolute right-0 top-full z-40 mt-2 w-40 overflow-hidden rounded-xl border border-leaf-800/10 bg-white py-1 shadow-lg">
          {locales.map((locale) => (
            <button
              key={locale}
              onClick={() => switchTo(locale)}
              className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm ${
                locale === current ? 'bg-leaf-50 font-medium text-leaf-900' : 'text-leaf-900/70 hover:bg-leaf-50'
              }`}
            >
              <span aria-hidden>{LOCALE_META[locale].flag}</span>
              {LOCALE_META[locale].label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
