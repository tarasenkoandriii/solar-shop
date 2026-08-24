'use client';

import { useState } from 'react';

// Dev-вход без Telegram (только для локальной разработки под Docker) —
// зеркало кнопки из apps/admin, но роль CUSTOMER (не ADMIN), т.к. на сайте
// это нужно, чтобы проверять корзину/чекаут/личный кабинет от лица
// покупателя, а не для доступа к админ-функциям. Показывается только при
// NEXT_PUBLIC_ENABLE_DEV_LOGIN=true — реальная защита всегда на бекенде
// (ENABLE_DEV_LOGIN=true И NODE_ENV != "production" одновременно,
// см. AuthService.assertDevLoginEnabled), кнопка сама по себе ничего не
// обходит.
export function DevLoginButton({ variant = 'dark' }: { variant?: 'dark' | 'light' }) {
  const [busy, setBusy] = useState(false);
  const enabled = process.env.NEXT_PUBLIC_ENABLE_DEV_LOGIN === 'true';

  async function handleDevLogin() {
    setBusy(true);
    try {
      const res = await fetch('/api/auth/dev-login', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: 'CUSTOMER' }),
      });
      if (!res.ok) {
        const body = await res.text().catch(() => '');
        throw new Error(`${res.status} ${body}`.trim());
      }
      window.location.reload();
    } catch (err) {
      setBusy(false);
      // Знайдено 18.08.2026: раніше catch показував той самий текст
      // незалежно від реальної причини (404 через ENABLE_DEV_LOGIN, 500
      // через щось на бекенді, мережева помилка проксі web→api) — тепер
      // видно справжній статус/тіло відповіді, не треба гадати наосліп.
      console.error('[dev-login] failed:', err);
      const detail = err instanceof Error ? err.message : String(err);
      alert(`Dev-вхід недоступний.\n\nДеталі: ${detail}\n\nПеревір консоль браузера (F12) і docker-compose logs api/web.`);
    }
  }

  if (!enabled) return null;

  const styles =
    variant === 'dark'
      ? 'border-white/30 text-white/70 hover:border-white/60 hover:text-white'
      : 'border-leaf-800/30 text-leaf-800/70 hover:border-leaf-800/60 hover:text-leaf-900';

  return (
    <button
      onClick={handleDevLogin}
      disabled={busy}
      title="Dev-вхід без Telegram (тільки для локальної розробки)"
      className={`rounded-full border border-dashed px-2.5 py-1 text-xs disabled:opacity-50 ${styles}`}
    >
      {busy ? '...' : '🛠 Dev-вхід'}
    </button>
  );
}
