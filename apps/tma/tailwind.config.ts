import type { Config } from 'tailwindcss';
const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: { extend: { colors: { leaf: { 50: '#f3f8f4', 700: '#1f4d2c', 800: '#153a20', 900: '#0d2815' }, sun: { 500: '#e89b1f' } } } },
  plugins: [],
};
export default config;
