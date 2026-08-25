import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

// DB-backed rate limiting (ТЗ п.28.3) — in-memory не работает на Vercel
// Hobby (serverless, нет общего состояния между инвокациями), см. опыт
// RoadScout. Окно фиксированное (не sliding), достаточно для защиты от
// спама на объёме Фазы 2.
@Injectable()
export class RateLimitService {
  constructor(private readonly prisma: PrismaService) {}

  // Повертає вікно, у яке реально списано — щоб refund() потрапив саме в
  // нього, а не в те, що діє на момент повернення.
  async checkAndIncrement(key: string, limit: number, windowSeconds: number): Promise<Date> {
    const windowStart = new Date(Math.floor(Date.now() / (windowSeconds * 1000)) * windowSeconds * 1000);

    const entry = await this.prisma.client.rateLimitEntry.upsert({
      where: { key_windowStart: { key, windowStart } },
      create: { key, windowStart, count: 1 },
      update: { count: { increment: 1 } },
    });

    if (entry.count > limit) {
      throw new HttpException('Rate limit exceeded, try again later', HttpStatus.TOO_MANY_REQUESTS);
    }
    return windowStart;
  }

  // Повертає спожиту квоту назад.
  //
  // АУДИТ 25.08.2026. Квота списується ПЕРЕД дорогою операцією — це
  // правильно, інакше її можна було б обійти паралельними запитами. Але
  // якщо операція не відбулась з НАШОЇ вини (ліг зовнішній сервіс),
  // списання перетворюється на покарання користувача за нашу поломку:
  // десять спроб уточнити розрахунок під час збою Grok — і чернетка
  // замкнена на десять хвилин, хоча жодного корисного виклику не сталось.
  //
  // Вікно передається ЯВНО, тим самим, яке повернув checkAndIncrement.
  // Перераховувати його тут не можна: між списанням і поверненням стоїть
  // виклик LLM, який цілком може перетнути межу вікна — і тоді повернення
  // зменшило б лічильник НАСТУПНОГО вікна, віддавши користувачу зайву
  // спробу замість тієї, що згоріла.
  //
  // Нижче нуля не опускаємось і запис не створюємо, якщо його вже немає.
  async refund(key: string, windowStart: Date): Promise<void> {
    await this.prisma.client.rateLimitEntry
      .updateMany({ where: { key, windowStart, count: { gt: 0 } }, data: { count: { decrement: 1 } } })
      .catch(() => undefined);
  }

  // Периодическая очистка старых записей — вызывается из крон-джоба
  // (см. CronModule) вместо отдельного pg_cron-раннера ради простоты.
  async cleanupOlderThan(hours = 24): Promise<number> {
    const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);
    const result = await this.prisma.client.rateLimitEntry.deleteMany({ where: { windowStart: { lt: cutoff } } });
    return result.count;
  }
}
