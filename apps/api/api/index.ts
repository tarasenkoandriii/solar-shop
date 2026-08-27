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
