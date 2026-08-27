import 'reflect-metadata';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import { ValidationPipe } from '@nestjs/common';
import express, { type Express } from 'express';
import cookieParser from 'cookie-parser';
import { AppModule } from '../src/app.module';
import { hardenExpress } from '../src/common/harden-express';

// Vercel serverless entrypoint (Hobby): файлы під apps/api/api/* стають
// функціями автоматично (zero-config Node runtime). NestJS-застосунок
// збирається один раз і кешується між "теплими" інвокаціями.
//
// За прямим запитом користувача — реальний production-краш, знайдений
// через Vercel Runtime Logs: "Error: Unable to determine event source
// based on event" з @vendia/serverless-express на КОЖНОМУ виклику,
// будь-якого ендпоінту. Корінна причина — архітектурна несумісність:
// serverless-express спроєктований для AWS Lambda, він очікує на вході
// AWS-специфічний `event`-об'єкт (формату API Gateway/ALB) і за його
// формою визначає, як його розібрати. Vercel Node.js Functions передають
// ЗВИЧАЙНІ req/res (по суті стандартний Node.js http.IncomingMessage/
// ServerResponse) — зовсім іншу форму даних, яку serverless-express не
// розпізнає як AWS-подію. Коментар нижче ("той самий патерн, що вже
// BTW/Caller ID") — ті проєкти деплоїлись на AWS Lambda, де ця бібліотека
// доречна, патерн скопійовано без урахування різниці платформ.
//
// Виправлення — прибрати serverless-express ПОВНІСТЮ: Vercel Node.js
// Functions приймають БУДЬ-ЯКУ функцію з сигнатурою (req, res) => void,
// а Express-застосунок САМ ПО СОБІ є саме такою функцією (`app(req, res)`
// працює напряму як request handler) — жодної прошарку не потрібно.
// ---------------------------------------------------------------------
// АУДИТ 27.08.2026 — три зміни в сусідньому apps/api/vercel.json.
// Пояснення живуть тут, бо vercel.json — строгий JSON зі схемою: ключі-
// коментарі виду "//1" вона відхиляє ("should NOT have additional
// property"), і білд падає ще до складання.
//
// 1. buildCommand тепер закінчується на `node scripts/db-bootstrap.js`.
//    Раніше його там не було, а явний buildCommand у vercel.json має
//    пріоритет над скриптом "vercel-build" із package.json — тобто саме
//    той скрипт, який застосовує схему до БД, на Vercel не виконувався
//    ЖОДНОГО разу. Будь-яка зміна schema.prisma не доїжджала до бойової
//    бази. Перевірити руками:
//      SELECT column_name FROM information_schema.columns
//      WHERE table_name = 'ProductImage';
//    Полів sourceUrl / mirroredAt / mirrorAttempts там може не бути —
//    вони додані під дзеркалення картинок, і без них джоб падає.
//
// 2. functions.includeFiles = "assets/**" — щоб кириличний шрифт для PDF
//    потрапив у бандл функції. InvoiceService читає його як
//    path.join(__dirname, '../../assets/fonts/NotoSans-Regular.ttf');
//    шлях зібраний динамічно, тому трасування залежностей Vercel його не
//    бачить і файл не кладе — генерація рахунку, кошторису й бізнес-плану
//    падала у проді. Глибина '../../' підібрана під розкладку Docker;
//    на Vercel її треба звірити на першому ж деплої (згенеруй рахунок).
//
// 3. functions.maxDuration = 300. Власні тайм-бюджети джобів (200-260 с)
//    доти спиралися на неявний дефолт платформи: він достатній (у логах
//    є прогін на 3 хв 59 с), але не зафіксований у репозиторії й
//    залежить від тарифу. Якщо білд відхилить це значення — тариф не
//    дозволяє 300 с, і тоді зменшувати треба не лише тут, а Й бюджети в
//    parser.service.ts / cron.service.ts, інакше функцію вбиватимуть
//    посеред роботи.
// ---------------------------------------------------------------------
let cachedApp: Express;

async function bootstrapServer(): Promise<Express> {
  const expressApp = express();
  // Аудит 27.08.2026: спільні налаштування Express для ОБОХ точок входу —
  // розбір query і довіра до проксі. Тримати їх в одному місці критично
  // саме тут: це прод, і все, що дописано лише в main.ts, сюди не долітає.
  hardenExpress(expressApp);
  const adapter = new ExpressAdapter(expressApp);
  const app = await NestFactory.create(AppModule, adapter);

  app.use(cookieParser());
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }));

  const corsOrigins = (process.env.CORS_ORIGINS ?? '').split(',').filter(Boolean);
  app.enableCors({ origin: corsOrigins.length > 0 ? corsOrigins : true, credentials: true });

  await app.init();
  return expressApp;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!cachedApp) {
    cachedApp = await bootstrapServer();
  }
  return cachedApp(req as unknown as express.Request, res as unknown as express.Response);
}
