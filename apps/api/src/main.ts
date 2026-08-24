import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.use(cookieParser());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  const corsOrigins = (process.env.CORS_ORIGINS ?? '').split(',').filter(Boolean);
  app.enableCors({
    origin: corsOrigins.length > 0 ? corsOrigins : true,
    credentials: true,
  });

  const port = process.env.PORT ?? 3001;
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`solar-shop api listening on :${port}`);

  // Діагностика dev-входу (ТЗ: "настрой для докер деплоя автоматично") —
  // одразу видно в `docker-compose logs api`, чи реально прочитались
  // ENABLE_DEV_LOGIN/NODE_ENV з environment: docker-compose.yml, а не
  // просто здогадуватись, чому кнопка на фронтенді повертає 404. Логується
  // тільки статус (true/false), не значення секретів.
  const devLoginEnabled = process.env.ENABLE_DEV_LOGIN === 'true';
  const nodeEnv = process.env.NODE_ENV ?? '(не задано)';
  const devLoginActive = devLoginEnabled && nodeEnv !== 'production';
  // eslint-disable-next-line no-console
  console.log(
    `[dev-login] ENABLE_DEV_LOGIN=${process.env.ENABLE_DEV_LOGIN ?? '(не задано)'} NODE_ENV=${nodeEnv} → ${devLoginActive ? 'УВІМКНЕНО' : 'вимкнено'}${!devLoginActive ? ' (це очікувано в проді; для локальної розробки перевір docker-compose.yml environment: для сервісу api)' : ''}`,
  );
}
bootstrap();
