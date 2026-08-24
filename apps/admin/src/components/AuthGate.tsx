'use client';

import { useEffect, useRef, useState } from 'react';
import { apiFetch } from '../lib/api';
import type { AdminUser } from '../lib/api';
import { useAdminLocale } from '../lib/locale-context';
import { ThemeToggle } from './ThemeToggle';
import { LocaleSwitcher } from './LocaleSwitcher';

declare global {
  interface Window {
    onTelegramAuth?: (user: Record<string, unknown>) => void;
  }
}

// Вход в админку — Telegram Login Widget через ОТДЕЛЬНОГО бота (не тот, что
// на сайте/в TMA) — у официального Login Widget домен привязывается через
// @BotFather /setdomain только к одному домену на бота, а apps/web и
// apps/admin — разные Vercel-домены. Проверка роли (MANAGER/ADMIN) после
// логина не меняется — список разрешённых Telegram ID управляется вручную
// в БД, самостоятельной выдачи прав нет (ТЗ п.20.3).
//
// Dev-вход (кнопка ниже) — только для локальной разработки под Docker, без
// реального Telegram-бота. Кнопка показывается лишь при
// NEXT_PUBLIC_ENABLE_DEV_LOGIN=true (публичный флаг, зеркалит серверный
// ENABLE_DEV_LOGIN — если сервер его не примет, просто вернёт 404).
export function AuthGate({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AdminUser | null | undefined>(undefined);
  const [devLoginBusy, setDevLoginBusy] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const autoTriggeredRef = useRef(false);
  const botUsername = process.env.NEXT_PUBLIC_TELEGRAM_ADMIN_BOT_USERNAME;
  const devLoginEnabled = process.env.NEXT_PUBLIC_ENABLE_DEV_LOGIN === 'true';
  const { dict } = useAdminLocale();

  useEffect(() => {
    apiFetch<AdminUser>('/auth/me')
      .then(setUser)
      .catch(() => setUser(null));
  }, []);

  // За запитом користувача — швидкий перехід із клієнтського сайту
  // (кнопка "Dev-вхід (адмінка)" у Header.tsx праворуч від звичайного
  // Dev-вхід) одразу сюди з ?autoDevLogin=1 — не просто відкриває
  // сторінку, а сам натискає dev-вхід, без другого ручного кліку.
  // autoTriggeredRef — захист від повторного спрацювання при
  // ре-рендерах (напр. коли user змінюється з undefined на null).
  useEffect(() => {
    if (autoTriggeredRef.current) return;
    if (!devLoginEnabled || user !== null) return;
    const params = new URLSearchParams(window.location.search);
    if (params.get('autoDevLogin') !== '1') return;

    autoTriggeredRef.current = true;
    handleDevLogin();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [devLoginEnabled, user]);

  useEffect(() => {
    if (user !== null || !botUsername || !containerRef.current) return;

    window.onTelegramAuth = async (tgUser) => {
      await apiFetch('/auth/telegram/admin', { method: 'POST', body: JSON.stringify(tgUser) });
      window.location.reload();
    };

    const script = document.createElement('script');
    script.src = 'https://telegram.org/js/telegram-widget.js?22';
    script.async = true;
    script.setAttribute('data-telegram-login', botUsername);
    script.setAttribute('data-size', 'large');
    script.setAttribute('data-onauth', 'onTelegramAuth(user)');
    containerRef.current.appendChild(script);
  }, [user, botUsername]);

  async function handleDevLogin() {
    setDevLoginBusy(true);
    try {
      await apiFetch('/auth/dev-login', { method: 'POST', body: JSON.stringify({ role: 'ADMIN' }) });
      window.location.reload();
    } catch (err) {
      setDevLoginBusy(false);
      // Знайдено 18.08.2026: раніше catch показував той самий текст
      // незалежно від реальної причини — тепер видно справжню помилку від
      // apiFetch (статус + тіло відповіді), не треба гадати наосліп.
      console.error('[dev-login] failed:', err);
      const detail = err instanceof Error ? err.message : String(err);
      alert(`${dict.auth.devLoginErrorPrefix}\n\n${dict.auth.devLoginErrorDetails} ${detail}\n\n${dict.auth.devLoginErrorConsoleHint}`);
    }
  }

  if (user === undefined) {
    return <div className="flex min-h-screen items-center justify-center text-leaf-900/50 dark:bg-leaf-900 dark:text-white/50">{dict.auth.loading}</div>;
  }

  if (user === null || !['MANAGER', 'ADMIN'].includes(user.role)) {
    return (
      <div className="relative flex min-h-screen flex-col items-center justify-center gap-4 bg-leaf-900 text-white">
        <div className="absolute right-4 top-4 flex items-center gap-2">
          <LocaleSwitcher />
          <ThemeToggle />
        </div>
        <h1 className="text-xl font-semibold">{dict.auth.title}</h1>
        {user && !['MANAGER', 'ADMIN'].includes(user.role) && (
          <p className="text-sm text-white/60">{dict.auth.noAccess}</p>
        )}
        <div ref={containerRef} />

        {devLoginEnabled && (
          <>
            <p className="text-xs uppercase tracking-wide text-white/30">{dict.auth.or}</p>
            <button
              onClick={handleDevLogin}
              disabled={devLoginBusy}
              className="rounded-full border border-dashed border-white/30 px-5 py-2 text-sm text-white/70 hover:border-white/60 hover:text-white disabled:opacity-50"
            >
              {devLoginBusy ? dict.auth.devLoginBusy : dict.auth.devLoginButton}
            </button>
            <p className="max-w-xs text-center text-xs text-white/30">{dict.auth.devLoginNote}</p>
          </>
        )}
      </div>
    );
  }

  return <>{children}</>;
}
