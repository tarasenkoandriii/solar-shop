#!/usr/bin/env node
// Ручний запуск будь-якого крон-джоба без адмін-сесії — через той самий
// `POST /internal/cron/:jobKey/run` з секретним заголовком, що вже
// використовується для Supabase pg_cron (ТЗ п.16/27.3, CronController).
// Приклад: node scripts/run-cron-job.js product_parser
//          npm run cron:products
// Повний список jobKey — apps/api/src/cron/cron.service.ts JOB_REGISTRY,
// готові npm-скрипти для кожного — package.json (cron:*), README.md.
//
// Потрібні змінні середовища (беруться з кореневого .env, якщо є):
// - CRON_SECRET — той самий секрет, що й у apps/api/.env (CRON_SECRET)
// - CRON_API_URL — адреса API, за замовчуванням http://localhost:3001
//   (локальний docker-compose); для реального деплою передати явно,
//   напр. CRON_API_URL=https://api.solarshop.ua node scripts/run-cron-job.js article_parser

const path = require('path');
const fs = require('fs');

// Найдено: скрипт покладався на пакет `dotenv`, а він встановлений лише
// як devDependency у apps/web/apps/admin/apps/tma (для next.config.mjs),
// НЕ в корені — залежно від того, чи хостовий `npm install` реально
// підняв його через workspace hoisting до кореневого node_modules,
// `require('dotenv')` міг мовчки не спрацювати (try/catch ковтав
// помилку), і CRON_SECRET ніколи не підвантажувався з .env навіть коли
// файл реально містив значення. Замість зовнішньої залежності — крихітний
// власний парсер .env тут же, без жодних npm-пакетів — усуває цю
// невизначеність повністю.
function loadDotEnv(filePath) {
  if (!fs.existsSync(filePath)) return;
  const content = fs.readFileSync(filePath, 'utf8');
  for (const rawLine of content.split('\n')) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    // Знімаємо парні лапки навколо значення (одинарні або подвійні),
    // як і справжній dotenv
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    // Не перезаписуємо вже виставлені змінні (той самий дефолт, що й у
    // справжнього dotenv) — реальне середовище (Docker/CI) завжди
    // пріоритетніше за файл
    if (process.env[key] === undefined) process.env[key] = value;
  }
}

loadDotEnv(path.resolve(__dirname, '../.env'));

const jobKey = process.argv[2];
if (!jobKey) {
  console.error('Використання: node scripts/run-cron-job.js <jobKey> [--debug]');
  console.error('Приклад: node scripts/run-cron-job.js article_parser');
  process.exit(1);
}

const debug = process.argv.includes('--debug');
const apiUrl = process.env.CRON_API_URL || 'http://localhost:3001';
const secret = process.env.CRON_SECRET;

if (!secret) {
  console.error('[run-cron-job] CRON_SECRET не заданий (перевір кореневий .env) — без нього /internal/cron поверне 401.');
  process.exit(1);
}

async function main() {
  const url = `${apiUrl}/internal/cron/${jobKey}/run${debug ? '?debug=true' : ''}`;
  console.log(`[run-cron-job] POST ${url}`);

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'x-cron-secret': secret },
  });

  const body = await res.text();
  if (!res.ok) {
    console.error(`[run-cron-job] Помилка ${res.status}: ${body}`);
    process.exit(1);
  }

  console.log('[run-cron-job] Результат:');
  try {
    console.log(JSON.stringify(JSON.parse(body), null, 2));
  } catch {
    console.log(body);
  }
}

main().catch((err) => {
  console.error('[run-cron-job] Не вдалося виконати запит:', err.message);
  console.error('Перевір, що apps/api реально запущений і доступний за CRON_API_URL.');
  process.exit(1);
});
