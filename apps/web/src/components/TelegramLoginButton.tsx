'use client';

import { useEffect, useRef } from 'react';
import type { Dictionary } from '../lib/get-dictionary';
import { getOrCreateSessionId, clearSessionId } from '../lib/client-api';

// Официальный Telegram Login Widget (ТЗ п.20.2) — грузит скрипт telegram.org,
// который сам рендерит кнопку и после успешного логина вызывает наш callback
// с подписанным payload; тот шлётся на POST /auth/telegram (проверка HMAC на
// бэкенде). Для Login Widget у бота должен быть привязан домен через
// @BotFather (`/setdomain`).
declare global {
  interface Window {
    onTelegramAuth?: (user: Record<string, unknown>) => void;
  }
}

export function TelegramLoginButton({ dict }: { dict: Dictionary }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const botUsername = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME;

  useEffect(() => {
    if (!botUsername || !containerRef.current) return;

    window.onTelegramAuth = async (user) => {
      // Same-origin /api/* (proxy через next.config.mjs rewrites) — не
      // NEXT_PUBLIC_API_URL напрямую, иначе cross-domain cookie не
      // сохранится с sameSite:'lax', см. AUDIT.md.
      await fetch('/api/auth/telegram', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(user),
      });

      // ТЗ п.19.2/31.7 — гостевые корзина и черновики калькулятора мёрджатся
      // в аккаунт сразу после входа. Найдено при аудите: эндпоинты на
      // бэкенде существовали с Фазы 2, но фронтенд их не вызывал — правится
      // здесь, единая точка успешного логина на сайте.
      const sessionId = getOrCreateSessionId();
      await Promise.allSettled([
        fetch('/api/cart/merge', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId }),
        }),
        fetch('/api/calculator/merge', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId }),
        }),
      ]);
      clearSessionId();

      window.location.reload();
    };

    const script = document.createElement('script');
    script.src = 'https://telegram.org/js/telegram-widget.js?22';
    script.async = true;
    script.setAttribute('data-telegram-login', botUsername);
    script.setAttribute('data-size', 'medium');
    script.setAttribute('data-radius', '20');
    script.setAttribute('data-onauth', 'onTelegramAuth(user)');
    script.setAttribute('data-request-access', 'write');
    containerRef.current.appendChild(script);
  }, [botUsername]);

  if (!botUsername) return null;

  return <div ref={containerRef} title={dict.login.button} />;
}
