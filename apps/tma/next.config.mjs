import { config as loadEnv } from 'dotenv';
import { resolve } from 'path';

// Єдиний .env для монорепо (див. /.env.example у корені) — той самий
// підхід, що в apps/web/next.config.mjs (детальний коментар там).
loadEnv({ path: resolve(process.cwd(), '../../.env') });

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    // Має збігатися з apps/web/next.config.mjs і з OPTIMIZABLE_HOSTS у
    // ProductPhoto.tsx обох застосунків. Знайдено 25.08.2026: тут був лише
    // placehold.co, тому будь-яке РЕАЛЬНЕ фото товару (і хотлінк на
    // постачальника, і перенесене на Blob) next/image різав з 400 — у
    // міні-застосунку були биті картинки в усьому каталозі.
    remotePatterns: [
      { protocol: 'https', hostname: 'placehold.co' },
      { protocol: 'https', hostname: '**.supabase.co' },
      { protocol: 'https', hostname: '**.public.blob.vercel-storage.com' },
    ],
  },
};
export default nextConfig;
