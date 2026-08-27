#!/usr/bin/env node
// Спільний скрипт для Docker (apps/api/entrypoint.sh) і Vercel
// (apps/api/package.json "vercel-build") — щоб логіка "як застосувати
// схему БД" не дублювалась і не розходилась між двома шляхами деплою
// (саме так одна з попередніх версій entrypoint.sh встигла розійтись із
// тим, що реально потрібно для Vercel). Node, не shell — Vercel build
// environment теж Node-based, портативніше й легше дебажити, ніж
// платформо-залежний sh-скрипт.
//
// Логіка:
// 1. Якщо packages/db/prisma/migrations/ має хоч один файл — `prisma
//    migrate deploy` (правильний шлях для команд з історією міграцій).
// 2. Інакше — `prisma db push --accept-data-loss` (напряму синхронізує
//    таблиці зі schema.prisma, без файлів історії — прийнятно для
//    самостійного проєкту без команди, що потребує спільної історії
//    міграцій; ПЕРЕГЛЯНУТИ це рішення, якщо проєкт виросте в команду або
//    вийде в реальний прод із живими користувацькими даними — на той
//    момент варто один раз згенерувати нормальні міграції
//    (`npm run db:migrate` з хоста) і закомітити їх).
// 3. `prisma db seed` — ідемпотентний (packages/db/prisma/seed.ts тепер
//    сам перевіряє на початку КОЖНОЇ секції окремо, чи вже засіяно, і
//    пропускає лише те, що вже є — не все скопом), тому безпечно
//    викликати щоразу — і на кожному Docker-рестарті, і на кожному
//    Vercel-білді (включно з preview-білдами).
//
// ВАЖЛИВО для Vercel: цей скрипт запускається на етапі BUILD
// (`vercel-build`), НЕ на кожен виклик serverless-функції — інакше
// конкурентні cold start могли б одночасно намагатись мігрувати схему.

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..');
const dbDir = path.join(repoRoot, 'packages', 'db');
const schema = path.join(dbDir, 'prisma', 'schema.prisma');
const migrationsDir = path.join(dbDir, 'prisma', 'migrations');

function run(cmd, cwd) {
  console.log(`[db-bootstrap] $ ${cmd}`);
  execSync(cmd, { stdio: 'inherit', cwd: cwd ?? repoRoot });
}

function hasMigrations() {
  return fs.existsSync(migrationsDir) && fs.readdirSync(migrationsDir).length > 0;
}

// Знайдено НАЖИВО на реальному деплої 20.08.2026: `prisma db push`
// відмовляється змінити тип колонки з Postgres-enum на текст, якщо в
// таблиці вже є дані ("No cast exists, the column would be dropped and
// recreated") — навіть попри те, що самі значення ('SOLAR_PANEL' тощо)
// текстово ідентичні в обох представленнях, Prisma не намагається
// автоматичний каст для цього конкретного класу зміни типу. Вимагав би
// `--force-reset` (повне видалення бази) — неприйнятно для реальних
// даних. Виправлено конкретно для Product.category/
// ArticleNumberSequence.category (README, розділ про мультикраїнність +
// категорії-таблицю) через `prisma db execute` — той самий CLI-
// інструмент, що вже в проєкті, не потребує ні psql, ні нової npm-
// залежності. ІДЕМПОТЕНТНО: ALTER COLUMN ... TYPE TEXT на колонці, що
// вже TEXT — безпечний no-op в Postgres, тому безпечно лишити цей крок
// назавжди (для свіжого розгортання деінде, де ця сама проблема
// повторилась би).
//
// ⚠️ УРОК на майбутнє: якщо ще колись знадобиться змінити тип колонки з
// enum на щось інше на таблиці, де вже можуть бути реальні дані —
// додайте сюди ще один такий самий блок ALTER COLUMN ... USING
// ...::TEXT ДО виклику prisma db push, не покладайтесь на автоматичний
// каст. Не намагайтесь автоматично парсити текст помилки prisma db push
// і генерувати ALTER динамічно — це реальний ризик для даних, якщо
// парсинг помилиться, явний захардкоджений список конкретних відомих
// переходів набагато безпечніший.
function fixKnownEnumToStringColumns() {
  const sql = `
ALTER TABLE "Product" ALTER COLUMN "category" TYPE TEXT USING "category"::TEXT;
ALTER TABLE "ArticleNumberSequence" ALTER COLUMN "category" TYPE TEXT USING "category"::TEXT;
`.trim();
  try {
    console.log('[db-bootstrap] Перевіряю відомий перехід enum→текст для Product.category/ArticleNumberSequence.category (ідемпотентно)...');
    execSync(`npx prisma db execute --schema="${schema}" --stdin`, { input: sql, stdio: ['pipe', 'inherit', 'inherit'], cwd: repoRoot });
  } catch (err) {
    // Некритично для СВІЖОЇ бази (таблиць/колонок ще нема — prisma db
    // execute поверне помилку "relation does not exist", саме тому цей
    // крок обгорнутий в try/catch, не падає весь bootstrap через це) —
    // просто продовжуємо до звичайного prisma db push нижче.
    console.log('[db-bootstrap] (пропущено — ймовірно, свіжа база без цих таблиць ще, це нормально)');
  }
}

try {
  if (hasMigrations()) {
    console.log('[db-bootstrap] Знайдено файли міграцій — застосовую prisma migrate deploy');
    run(`npx prisma migrate deploy --schema="${schema}"`);
  } else {
    fixKnownEnumToStringColumns();
    console.log('[db-bootstrap] Міграцій ще немає — синхронізую таблиці напряму через prisma db push');
    run(`npx prisma db push --schema="${schema}" --accept-data-loss --skip-generate`);
  }
} catch (err) {
  // Схема — це те, без чого застосунок реально не може працювати
  // коректно, тому падаємо голосно (на відміну від seed нижче).
  console.error('[db-bootstrap] Застосування схеми БД провалилось:', err.message);
  process.exit(1);
}

try {
  console.log('[db-bootstrap] Перевіряю/наповнюю демо-дані (prisma db seed)...');
  run(`npx prisma db seed --schema="${schema}"`, dbDir);
} catch (err) {
  // Seed — не критичний для роботи застосунку (каталог просто буде
  // порожній) — не блокуємо весь деплой/старт через це.
  //
  // АУДИТ 27.08.2026: саме це "не критично" й ховало реальний баг. У
  // seed.ts був неправильний складений ключ для ExchangeRate, сид падав у
  // рантаймі на тому рядку — і все, що засівається ПІСЛЯ нього (тарифи,
  // програми фінансування, цілі проєктів, координати НП для PVGIS), не
  // потрапляло в базу НІКОЛИ, на жодному чистому оточенні. У логах був
  // один рядок зі словом "не критично", і його ніхто не читав.
  //
  // Рішення лишаємо тим самим — валити деплой через сид не варто, — але
  // помилку тепер видно: error замість warn і повний вивід замість
  // .message, у якому реальної причини не було.
  console.error('[db-bootstrap] ✖ db seed ЗАВЕРШИВСЯ З ПОМИЛКОЮ. Деплой не зупиняємо, але довідники (курс валют, тарифи лояльності, програми фінансування) могли НЕ засіятися — перевір базу вручну.');
  if (err.stdout) console.error(String(err.stdout));
  if (err.stderr) console.error(String(err.stderr));
  console.error(err.message);
}

console.log('[db-bootstrap] Готово.');
