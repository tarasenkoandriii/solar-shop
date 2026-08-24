import { config as loadEnv } from 'dotenv';
import { resolve } from 'path';

// Єдиний .env для монорепо (див. /.env.example у корені) — той самий
// підхід, що в apps/web/next.config.mjs (детальний коментар там).
loadEnv({ path: resolve(process.cwd(), '../../.env') });

// Тот же same-origin proxy, что и в apps/web (см. комментарий там) — в
// админке критичен вдвойне: почти каждый запрос требует сессионную cookie
// (роль MANAGER/ADMIN проверяется на бэкенде).
const API_INTERNAL_URL = process.env.API_INTERNAL_URL ?? 'http://localhost:3001';

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: { remotePatterns: [{ protocol: 'https', hostname: 'placehold.co' }] },
  async rewrites() {
    return [{ source: '/api/:path*', destination: `${API_INTERNAL_URL}/:path*` }];
  },
};

export default nextConfig;
