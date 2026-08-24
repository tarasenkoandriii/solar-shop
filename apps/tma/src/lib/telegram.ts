'use client';

// Обёртка над Telegram WebApp JS SDK + DEV-панель для локальной отладки вне
// Telegram (ТЗ п.7) — вне Telegram window.Telegram не существует, поэтому
// initData подставляется вручную через DEV-панель (localStorage), как в
// прошлых проектах (SilverFinance/ATM-travel TMA).
declare global {
  interface Window {
    Telegram?: {
      WebApp?: {
        initData: string;
        ready: () => void;
        expand: () => void;
        initDataUnsafe?: { user?: { language_code?: string } };
      };
    };
  }
}

const DEV_INIT_DATA_KEY = 'tma_dev_init_data';

export function getTelegramWebApp() {
  if (typeof window === 'undefined') return null;
  return window.Telegram?.WebApp ?? null;
}

export function isInsideTelegram(): boolean {
  return !!getTelegramWebApp()?.initData;
}

export function getInitData(): string | null {
  const webApp = getTelegramWebApp();
  if (webApp?.initData) return webApp.initData;
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(DEV_INIT_DATA_KEY);
}

export function setDevInitData(value: string) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(DEV_INIT_DATA_KEY, value);
}

export function initTelegramWebApp() {
  const webApp = getTelegramWebApp();
  webApp?.ready();
  webApp?.expand();
}
