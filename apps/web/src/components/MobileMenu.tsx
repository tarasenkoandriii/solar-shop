'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { Locale } from '../lib/i18n';
import type { Dictionary } from '../lib/get-dictionary';
import { CurrencySwitcher } from './CurrencySwitcher';
import { LocaleSwitcher } from './LocaleSwitcher';
import { ThemeToggle } from './ThemeToggle';
import { TelegramLoginButton } from './TelegramLoginButton';
import { DevLoginButton } from './DevLoginButton';
import { AdminDevLoginLink } from './AdminDevLoginLink';

interface NavItem {
  href: string;
  label: string;
}

// Бургер-меню замість старого горизонтального скролу навігації (8+
// пунктів впритик, обрізались без підказки прокрутити). Категорії товарів
// (catalogItems) — окрема згрупована секція з заголовком "Каталог", щоб
// нові категорії в майбутньому просто додавались у масив, не займаючи
// новий рядок у шапці щоразу.
export function MobileMenu({
  locale,
  dict,
  menuLabel,
  catalogLabel,
  catalogItems,
  primaryItems,
}: {
  locale: Locale;
  dict: Dictionary;
  menuLabel: string;
  catalogLabel: string;
  catalogItems: NavItem[];
  primaryItems: NavItem[];
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="md:hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label={menuLabel}
        aria-expanded={open}
        className="flex h-9 w-9 items-center justify-center rounded-lg text-white/80 hover:text-white"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-6 w-6">
          {open ? (
            <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
          ) : (
            <path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" />
          )}
        </svg>
      </button>

      {open && (
        <div className="absolute inset-x-0 top-full max-h-[calc(100vh-56px)] overflow-y-auto border-t border-white/10 bg-leaf-900 px-4 py-4 shadow-xl">
          <p className="mb-1 px-3 text-xs font-semibold uppercase tracking-wide text-white/40">{catalogLabel}</p>
          <nav className="mb-4 flex flex-col gap-1">
            {catalogItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className="rounded-lg px-3 py-2 text-sm text-white/80 hover:bg-white/5 hover:text-white"
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <nav className="mb-4 flex flex-col gap-1">
            {primaryItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className="rounded-lg px-3 py-2.5 font-medium text-white hover:bg-white/5"
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="mb-4 h-px bg-white/10" />
          <div className="mb-4 flex items-center gap-4">
            <CurrencySwitcher />
            <LocaleSwitcher current={locale} />
            <ThemeToggle />
          </div>
          <div className="flex items-center gap-3">
            <TelegramLoginButton dict={dict} />
            <DevLoginButton />
            <AdminDevLoginLink />
          </div>
        </div>
      )}
    </div>
  );
}
