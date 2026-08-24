import { Controller, Get, Headers, Param, Post, Query, UnauthorizedException, UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UserRole } from '@solar-shop/db';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RateLimitGuard } from '../rate-limit/guards/rate-limit.guard';
import { RateLimit } from '../rate-limit/decorators/rate-limit.decorator';
import { CronService, JobKey } from './cron.service';

@Controller('admin/cron')
export class CronController {
  constructor(private readonly service: CronService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Get('registry')
  getRegistry() {
    return this.service.getRegistry();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Get('history')
  getHistory(@Query('jobKey') jobKey?: string) {
    return this.service.getHistory(jobKey);
  }

  // Ручной запуск из админки (ТЗ п.27.3) — сессия ADMIN, не секретный
  // заголовок. Rate limit — тоже по ТЗ п.27.3: "не должен допускать
  // спам-клики по внешним API (НБУ/НП/Grok — у всех есть свои лимиты и/или
  // стоимость вызова)". За прямим запитом користувача — вікно зменшено
  // з 60с до 15с (той самий ліміт 5 запитів, коротше вікно — менше
  // очікування між тестовими прогонами в адмінці).
  @UseGuards(JwtAuthGuard, RolesGuard, RateLimitGuard)
  @Roles(UserRole.ADMIN)
  @RateLimit({ limit: 5, windowSeconds: 15 })
  @Post(':jobKey/run')
  async runManual(
    @Param('jobKey') jobKey: JobKey,
    @Query('debug') debug: string,
    @CurrentUser() user: { sub: string },
  ) {
    return this.service.run(jobKey, `manual:${user.sub}`, debug === 'true');
  }
}

// Отдельный контроллер для вызова от Supabase pg_cron — секретный заголовок,
// не пересекается с ролевой моделью сессий (ТЗ п.16/27.3).
@Controller('internal/cron')
export class InternalCronController {
  constructor(
    private readonly service: CronService,
    private readonly config: ConfigService,
  ) {}

  @Post(':jobKey/run')
  // Знайдено 18.08.2026 (реальний виклик через scripts/run-cron-job.js
  // з --debug): цей ендпоінт ігнорував query-параметр debug зовсім,
  // жорстко передаючи `false` — на відміну від адмінського
  // `CronController.runManual()` вище, який читає `@Query('debug')`
  // коректно. Через це `--debug`/`?debug=true` з боку скрипта нічого не
  // давав, `debugLog` завжди повертався `null`.
  async runFromSchedule(
    @Param('jobKey') jobKey: JobKey,
    @Headers('x-cron-secret') secret: string,
    @Query('debug') debug: string,
  ) {
    const expected = this.config.get<string>('CRON_SECRET');
    if (!expected || secret !== expected) throw new UnauthorizedException('Invalid cron secret');
    return this.service.run(jobKey, 'schedule', debug === 'true');
  }
}
