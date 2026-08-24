'use client';

import { useEffect } from 'react';

// ТЗ п.34.6.4 — простой лог показов embed-виджета (не полноценная
// аналитика). Referer передаётся с сервера (headers().get('referer') в
// самой странице /embed/solar-map) — на клиенте document.referrer тоже
// доступен как фолбэк, но серверный вариант надёжнее для iframe-контекста.
export function EmbedViewTracker({ refererHost }: { refererHost: string | null }) {
  useEffect(() => {
    let host = refererHost;
    if (!host && typeof document !== 'undefined' && document.referrer) {
      try {
        host = new URL(document.referrer).host;
      } catch {
        host = null;
      }
    } else if (host) {
      try {
        host = new URL(host).host;
      } catch {
        // refererHost уже мог быть просто хостом, не полным URL — оставляем как есть
      }
    }

    fetch('/api/solar-map/embed-view', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ widgetKey: 'solar-map', refererHost: host }),
    }).catch(() => {});
  }, [refererHost]);

  return null;
}
