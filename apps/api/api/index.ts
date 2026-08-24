import 'reflect-metadata';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import serverlessExpress from '@vendia/serverless-express';
import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import { ValidationPipe } from '@nestjs/common';
import express from 'express';
import cookieParser from 'cookie-parser';
import { AppModule } from '../src/app.module';

// Vercel serverless entrypoint (Hobby): файлы под apps/api/api/* становятся
// функциями автоматически (zero-config Node runtime). NestJS-приложение
// собирается один раз и кешируется между тёплыми инвокациями — тот же
// паттерн, что использовался в BTW/Caller ID для NestJS на Vercel Hobby.
let cachedServer: ReturnType<typeof serverlessExpress>;

async function bootstrapServer() {
  const expressApp = express();
  const adapter = new ExpressAdapter(expressApp);
  const app = await NestFactory.create(AppModule, adapter);

  app.use(cookieParser());
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }));

  const corsOrigins = (process.env.CORS_ORIGINS ?? '').split(',').filter(Boolean);
  app.enableCors({ origin: corsOrigins.length > 0 ? corsOrigins : true, credentials: true });

  await app.init();
  return serverlessExpress({ app: expressApp });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!cachedServer) {
    cachedServer = await bootstrapServer();
  }
  return cachedServer(req, res);
}
