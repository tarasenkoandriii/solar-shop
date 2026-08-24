import { SetMetadata } from '@nestjs/common';

export const RATE_LIMIT_KEY = 'rateLimit';

export interface RateLimitOptions {
  limit: number;
  windowSeconds: number;
}

// Использование: @RateLimit({ limit: 5, windowSeconds: 60 }) на хендлере.
// Ключ строится из route + IP (см. RateLimitGuard) — этого достаточно для
// защиты публичных эндпоинтов Фазы 2 (ТЗ п.28.3), не требует Redis.
export const RateLimit = (options: RateLimitOptions) => SetMetadata(RATE_LIMIT_KEY, options);
