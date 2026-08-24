import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        sun: {
          50: '#fff8e1',
          400: '#f5b83d',
          500: '#e89b1f',
          600: '#c67c0f',
        },
        leaf: {
          700: '#1f4d2c',
          800: '#153a20',
          900: '#0d2815',
        },
        // За прямим запитом користувача ("сделай по тз") — точні
        // значення з розділу 5 наданого ТЗ (TrafficVision_Style_
        // Migration_TZ_v2.md), не приблизні здогадки з попереднього
        // проходу. Акцент — БРЕНДОВИЙ sun (не синій з прикладу ТЗ) —
        // п.5.4 ТЗ явно дозволяє: "Если текущий бренд использует
        // другой основной цвет, сохранить брендовый hue".
        modern: {
          bg0: '#080A0D',
          bg1: '#0D1014',
          bg2: '#12161B',
          bg3: '#171C22',
          bg4: '#1D232A',
          borderSubtle: 'rgba(255,255,255,.06)',
          borderDefault: 'rgba(255,255,255,.09)',
          borderStrong: 'rgba(255,255,255,.14)',
          textPrimary: '#F5F7FA',
          textSecondary: '#A7AFBA',
          textMuted: '#727B86',
          textDisabled: '#4B535D',
          accent: '#e89b1f',
          accentHover: '#f5b83d',
          accentSoft: 'rgba(232,155,31,.14)',
          success: '#22C55E',
          warning: '#F59E0B',
          danger: '#EF4444',
          info: '#38BDF8',
        },
      },
      fontFamily: {
        // Технологічний, геометричний display-шрифт для "modern"
        // заголовків — навмисно відрізняється від дефолтного тіла
        // (не той самий сімейство, що взяли б для будь-якої іншої
        // сторінки). Тіло лишається системним sans — нейтральна
        // читабельність для довгого тексту.
        display: ['"Space Grotesk"', 'sans-serif'],
      },
      keyframes: {
        // За прямим запитом користувача ("make same animated
        // styles") — orchestrated, не розкидані ефекти (за порадою
        // frontend-design skill): один амбієнтний glow-рух на фоні
        // hero, один staggered reveal при завантаженні, один pulse
        // для live-індикатора.
        'ambient-drift': {
          '0%, 100%': { transform: 'translate(0, 0) scale(1)' },
          '50%': { transform: 'translate(3%, -2%) scale(1.05)' },
        },
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'live-pulse': {
          '0%, 100%': { opacity: '1', transform: 'scale(1)' },
          '50%': { opacity: '0.5', transform: 'scale(0.85)' },
        },
      },
      animation: {
        'ambient-drift': 'ambient-drift 18s ease-in-out infinite',
        'fade-up': 'fade-up 0.6s ease-out both',
        'live-pulse': 'live-pulse 2s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};

export default config;
