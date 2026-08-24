'use client';

import { useState } from 'react';
import { setDevInitData } from '../lib/telegram';
import { useTelegramSession } from './TelegramProvider';

// DEV-панель для локальной отладки TMA вне Telegram (ТЗ п.7) — как в
// прошлых проектах (SilverFinance/ATM-travel). В реальном Telegram WebView
// не рендерится вообще (insideTelegram === true).
export function DevPanel() {
  const { insideTelegram, status } = useTelegramSession();
  const [raw, setRaw] = useState('');

  if (insideTelegram) return null;
  if (process.env.NODE_ENV === 'production' && process.env.NEXT_PUBLIC_ENABLE_DEV_PANEL !== 'true') {
    return null;
  }

  function applyMockUser() {
    // Мінімальний валідний за форматом (але НЕ за підписом) mock initData —
    // придатний лише проти локального api з відключеною/тестовою перевіркою
    // підпису. Для реальної перевірки підпису потрібен справжній bot token +
    // дані, підписані через тестовий бот (@BotFather test environment).
    const mockUser = { id: 1, first_name: 'Dev', username: 'dev_user', language_code: 'uk' };
    const params = new URLSearchParams({
      user: JSON.stringify(mockUser),
      auth_date: String(Math.floor(Date.now() / 1000)),
      hash: 'dev-mock-hash-not-valid',
    });
    setDevInitData(params.toString());
    window.location.reload();
  }

  function applyRaw() {
    setDevInitData(raw);
    window.location.reload();
  }

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 border-t border-leaf-900/10 bg-white p-3 text-xs shadow-lg">
      <p className="mb-2 font-semibold text-leaf-900">DEV-панель (поза Telegram) — статус: {status}</p>
      <div className="flex flex-wrap gap-2">
        <button onClick={applyMockUser} className="rounded-full bg-sun-500 px-3 py-1 font-medium text-leaf-900">
          Підставити mock initData
        </button>
        <input
          value={raw}
          onChange={(e) => setRaw(e.target.value)}
          placeholder="Вставити реальний initData (з @BotFather test env)"
          className="min-w-[240px] flex-1 rounded border border-leaf-900/20 px-2 py-1"
        />
        <button onClick={applyRaw} className="rounded-full border border-leaf-900/30 px-3 py-1">
          Застосувати
        </button>
      </div>
      <p className="mt-1 text-leaf-900/40">
        Mock-варіант НЕ пройде HMAC-перевірку на бекенді (потрібен справжній TELEGRAM_BOT_TOKEN + підписані дані) —
        це лише заглушка для верстки UI без запуску Telegram.
      </p>
    </div>
  );
}
