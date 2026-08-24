'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { getInitData, initTelegramWebApp, isInsideTelegram } from '../lib/telegram';
import type { BootstrapUser } from '../lib/api';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

interface TelegramContextValue {
  token: string | null;
  user: BootstrapUser | null;
  status: 'loading' | 'ready' | 'no-init-data' | 'error';
  insideTelegram: boolean;
}

const TelegramContext = createContext<TelegramContextValue>({
  token: null,
  user: null,
  status: 'loading',
  insideTelegram: false,
});

export const useTelegramSession = () => useContext(TelegramContext);

// ТЗ п.7: /bootstrap эндпоинт инициализации сессии TMA, initData резолвится
// в общую модель User (единый профиль с сайтом/админкой, п.20.4).
export function TelegramProvider({ children }: { children: React.ReactNode }) {
  const [value, setValue] = useState<TelegramContextValue>({
    token: null,
    user: null,
    status: 'loading',
    insideTelegram: false,
  });

  useEffect(() => {
    initTelegramWebApp();
    const insideTelegram = isInsideTelegram();
    const initData = getInitData();

    if (!initData) {
      setValue({ token: null, user: null, status: 'no-init-data', insideTelegram });
      return;
    }

    fetch(`${API_URL}/auth/bootstrap`, {
      method: 'POST',
      headers: { 'X-Telegram-Init-Data': initData },
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.token) {
          setValue({ token: data.token, user: data.user, status: 'ready', insideTelegram });
        } else {
          setValue({ token: null, user: null, status: 'error', insideTelegram });
        }
      })
      .catch(() => setValue({ token: null, user: null, status: 'error', insideTelegram }));
  }, []);

  return <TelegramContext.Provider value={value}>{children}</TelegramContext.Provider>;
}
