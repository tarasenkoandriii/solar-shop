import { config as loadEnv } from 'dotenv';
import { resolve } from 'path';

// Єдиний .env для монорепо (див. /.env.example у корені) — Next.js за
// замовчуванням читає .env лише зі своєї власної директорії (apps/web/.env),
// тому кореневий файл підвантажується явно тут. `override: false`
// (дефолт dotenv) — НЕ перезаписує змінні, які вже реально встановлені в
// process.env (напр. Docker-контейнер, де значення прийшли через
// docker-compose `environment:`) — безпечно для обох сценаріїв, це лише
// фолбек для локальної розробки без Docker. Якщо файла немає — dotenv
// мовчки нічого не робить, не падає.
loadEnv({ path: resolve(process.cwd(), '../../.env') });

// Same-origin proxy на бэкенд (ТЗ-аудит: cross-domain cookie). web/api —
// отдельные Vercel-проекты на разных доменах, поэтому браузер не отправлял
// бы sameSite:'lax' сессионную cookie при прямых cross-site fetch на
// NEXT_PUBLIC_API_URL. Решение: все запросы с фронтенда идут на
// относительный /api/*, Next.js сервер сам проксирует их на реальный бэкенд
// (API_INTERNAL_URL, серверная переменная, без NEXT_PUBLIC — наружу не
// торчит). Set-Cookie от api прозрачно проходит через rewrite и браузер
// видит его как first-party cookie домена web — sameSite:'lax' снова
// работает штатно, никакого 'none'/secure не нужно.
const API_INTERNAL_URL = process.env.API_INTERNAL_URL ?? 'http://localhost:3001';

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'placehold.co' },
      { protocol: 'https', hostname: '**.supabase.co' },
      { protocol: 'https', hostname: '**.public.blob.vercel-storage.com' },
    ],
  },
  async rewrites() {
    return [{ source: '/api/:path*', destination: `${API_INTERNAL_URL}/:path*` }];
  },
  async headers() {
    return [
      {
        source: '/((?!embed).*)',
        headers: [{ key: 'X-Frame-Options', value: 'SAMEORIGIN' }],
      },
      {
        // ТЗ п.34.6.3 — /embed/* единственное место на сайте, где явно
        // разрешено встраивание в iframe чужих доменов. Остальной сайт
        // защищён X-Frame-Options: SAMEORIGIN (правило выше, регэксп его
        // исключает) — сужаем разрешение точечно, не ослабляем защиту сайта
        // целиком. Роут без локали (/embed/solar-map, не /uk/embed/...) —
        // см. src/middleware.ts, исключён из локаль-редиректа.
        source: '/embed/:path*',
        headers: [{ key: 'Content-Security-Policy', value: 'frame-ancestors *' }],
      },
    ];
  },
};

export default nextConfig;
