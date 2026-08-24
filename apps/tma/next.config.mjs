import { config as loadEnv } from 'dotenv';
import { resolve } from 'path';

// Єдиний .env для монорепо (див. /.env.example у корені) — той самий
// підхід, що в apps/web/next.config.mjs (детальний коментар там).
loadEnv({ path: resolve(process.cwd(), '../../.env') });

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: { remotePatterns: [{ protocol: 'https', hostname: 'placehold.co' }] },
};
export default nextConfig;
