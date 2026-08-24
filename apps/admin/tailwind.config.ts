import type { Config } from 'tailwindcss';
const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  // За прямим запитом користувача — "тот же переключатель темы что на
  // клиентском сайте (отдельно)" — керована перемикачем `dark` класом
  // на <html>, не системними налаштуваннями ОС (`media` за
  // замовчуванням).
  darkMode: 'class',
  theme: { extend: { colors: { leaf: { 800: '#153a20', 900: '#0d2815' }, sun: { 500: '#e89b1f' } } } },
  plugins: [],
};
export default config;
