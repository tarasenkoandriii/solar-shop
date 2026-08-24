import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

// ТЗ п.34.6.4 — простой лог показов embed-виджета, не полноценная
// аналитика (для неё уже есть GA/Meta Pixel, п.30.1).
@Injectable()
export class EmbedViewService {
  constructor(private readonly prisma: PrismaService) {}

  async logView(widgetKey: string, refererHost: string | null) {
    await this.prisma.client.embedView.create({ data: { widgetKey, refererHost } });
    return { ok: true };
  }

  async getStats(widgetKey: string, period: 'today' | 'week' | 'month' | 'all') {
    const since = periodToDate(period);
    const views = await this.prisma.client.embedView.findMany({
      where: { widgetKey, ...(since ? { viewedAt: { gte: since } } : {}) },
      orderBy: { viewedAt: 'desc' },
    });

    const byHost = new Map<string, number>();
    for (const v of views) {
      const host = v.refererHost ?? '(невідомо)';
      byHost.set(host, (byHost.get(host) ?? 0) + 1);
    }
    const topDomains = [...byHost.entries()]
      .map(([host, count]) => ({ host, count }))
      .sort((a, b) => b.count - a.count);

    // Простая агрегация по дням для графика
    const byDay = new Map<string, number>();
    for (const v of views) {
      const day = v.viewedAt.toISOString().slice(0, 10);
      byDay.set(day, (byDay.get(day) ?? 0) + 1);
    }
    const timeline = [...byDay.entries()].map(([date, count]) => ({ date, count })).sort((a, b) => a.date.localeCompare(b.date));

    return { totalViews: views.length, topDomains, timeline };
  }
}

function periodToDate(period: 'today' | 'week' | 'month' | 'all'): Date | null {
  const now = new Date();
  if (period === 'today') return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (period === 'week') return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  if (period === 'month') return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  return null;
}
