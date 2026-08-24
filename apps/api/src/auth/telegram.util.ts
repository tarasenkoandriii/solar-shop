import * as crypto from 'crypto';

// Проверка подписи Telegram Login Widget (ТЗ п.20.2) — НЕ тот же алгоритм,
// что у TMA initData (ТЗ п.7/п.20.4), который проверяется отдельно при
// имплементации apps/tma /bootstrap. Здесь — документированный алгоритм
// именно для веб-виджета: https://core.telegram.org/widgets/login
export interface TelegramAuthPayload {
  id: number;
  first_name?: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  auth_date: number;
  hash: string;
  [key: string]: unknown;
}

export function verifyTelegramLoginPayload(
  payload: TelegramAuthPayload,
  botToken: string,
  maxAgeSeconds = 86400,
): boolean {
  const { hash, ...rest } = payload;
  if (!hash) return false;

  const checkString = Object.keys(rest)
    .sort()
    .map((key) => `${key}=${rest[key]}`)
    .join('\n');

  const secretKey = crypto.createHash('sha256').update(botToken).digest();
  const hmac = crypto.createHmac('sha256', secretKey).update(checkString).digest('hex');

  if (hmac !== hash) return false;

  const authAgeSeconds = Math.floor(Date.now() / 1000) - Number(payload.auth_date);
  if (authAgeSeconds > maxAgeSeconds) return false;

  return true;
}
