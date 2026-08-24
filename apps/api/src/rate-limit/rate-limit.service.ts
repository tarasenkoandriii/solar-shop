import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

// DB-backed rate limiting (ТЗ п.28.3) — in-memory не работает на Vercel
// Hobby (serverless, нет общего состояния между инвокациями), см. опыт
// RoadScout. Окно фиксированное (не sliding), достаточно для защиты от
// спама на объёме Фазы 2.
@Injectable()
export class RateLimitService {
  constructor(private readonly prisma: PrismaService) {}

  async checkAndIncrement(key: string, limit: number, windowSeconds: number): Promise<void> {
    const windowStart = new Date(Math.floor(Date.now() / (windowSeconds * 1000)) * windowSeconds * 1000);

    const entry = await this.prisma.client.rateLimitEntry.upsert({
      where: { key_windowStart: { key, windowStart } },
      create: { key, windowStart, count: 1 },
      update: { count: { increment: 1 } },
    });

    if (entry.count > limit) {
      throw new HttpException('Rate limit exceeded, try again later', HttpStatus.TOO_MANY_REQUESTS);
    }
  }

  // Периодическая очистка старых записей — вызывается из крон-джоба
  // (см. CronModule) вместо отдельного pg_cron-раннера ради простоты.
  async cleanupOlderThan(hours = 24): Promise<number> {
    const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);
    const result = await this.prisma.client.rateLimitEntry.deleteMany({ where: { windowStart: { lt: cutoff } } });
    return result.count;
  }
}
