'use client';

const SESSION_ID_KEY = 'guest_cart_session_id';

// Гостевая корзина (ТЗ п.19.1) — sessionId генерируется на клиенте и живёт в
// localStorage, пока пользователь не залогинится через Telegram (тогда
// сервер мёрджит гостевую корзину в корзину пользователя, см. cart/merge).
export function getOrCreateSessionId(): string {
  if (typeof window === 'undefined') return '';
  let id = window.localStorage.getItem(SESSION_ID_KEY);
  if (!id) {
    id = crypto.randomUUID();
    window.localStorage.setItem(SESSION_ID_KEY, id);
  }
  return id;
}

export function clearSessionId() {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(SESSION_ID_KEY);
}

// Все клиентские запросы, которым может понадобиться cookie сессии
// (Telegram-логин), идут через same-origin /api/* — прокси в
// next.config.mjs на реальный apps/api (см. AUDIT.md, фикс cross-domain
// cookie). credentials по умолчанию 'same-origin', этого достаточно.
export async function clientApi<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`/api${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(options.headers ?? {}) },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`${options.method ?? 'GET'} ${path} failed: ${res.status} ${body}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}
