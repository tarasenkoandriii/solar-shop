import * as crypto from 'crypto';

// Проверка Telegram WebApp initData (ТЗ п.7/п.20.4) — отдельный алгоритм от
// Login Widget (telegram.util.ts). Известный фикс "bad_hash" из прошлых
// проектов (SilverFinance/ATM-travel): поле `signature` должно быть
// исключено из data_check_string наравне с `hash`, иначе валидация
// официальных клиентов Telegram (которые добавляют signature) будет падать.
export interface ParsedInitData {
  user?: {
    id: number;
    username?: string;
    first_name?: string;
    last_name?: string;
    photo_url?: string;
    language_code?: string;
  };
  auth_date: string;
  hash: string;
  [key: string]: unknown;
}

export function verifyTelegramInitData(
  initData: string,
  botToken: string,
  maxAgeSeconds = 86400,
): ParsedInitData | null {
  const params = new URLSearchParams(initData);
  const hash = params.get('hash');
  if (!hash) return null;

  params.delete('hash');
  params.delete('signature'); // bad_hash fix

  const checkString = Array.from(params.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join('\n');

  const secretKey = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest();
  const computedHash = crypto.createHmac('sha256', secretKey).update(checkString).digest('hex');

  if (computedHash !== hash) return null;

  const authDate = Number(params.get('auth_date'));
  if (Date.now() / 1000 - authDate > maxAgeSeconds) return null;

  const userRaw = params.get('user');
  return {
    user: userRaw ? JSON.parse(userRaw) : undefined,
    auth_date: params.get('auth_date') ?? '',
    hash,
  };
}
