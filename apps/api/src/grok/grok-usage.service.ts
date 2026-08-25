import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';

// За прямим запитом користувача — "тарифицировать приблизительно в
// токенах и деньгах расходы, показать и привязывать к telegram id".
// Свідомо scope обмежено ітеративним квизом (розділ README, той самий,
// що GrokUsageLog у схемі) — не всі AI-виклики проєкту.
export interface UserUsageSummary {
  userId: string | null;
  telegramId: string | null;
  username: string | null;
  firstName: string | null;
  sessionId: string | null; // якщо userId відсутній (гостьова сесія до логіну)
  requestCount: number;
  totalTokens: number;
  totalCostUsd: number;
}

export interface ExpenseLogEntry {
  id: string;
  type: 'ai_usage' | 'admin_expense';
  description: string;
  amountUsd: number;
  createdAt: Date;
}

// Стеля вибірки для зведення витрат — див. коментар у getUsageSummary.
const SUMMARY_ROW_LIMIT = 20_000;

@Injectable()
export class GrokUsageService {
  private readonly logger = new Logger(GrokUsageService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  // За прямим запитом користувача — "плашка баланс аккаунта grok ai",
  // потім "сделай как у самого Grok ai" ПІСЛЯ ТРЬОХ невдалих спроб
  // самостійно вирахувати баланс через недокументоване xAI Management
  // API (розділи 80, 92, 93 — щоразу давало ІНШЕ, дедалі менш точне
  // число: $27.23, потім $157.23, справжній баланс на console.x.ai —
  // $9.19). Чесний висновок: продовжувати гадати деталі
  // незадокументованого API — марна трата часу користувача, кожна
  // спроба лише віддаляла від істини, не наближала.
  //
  // Рішення — НЕ намагатися відтворити число самостійно. Пряме
  // посилання на РЕАЛЬНУ панель console.x.ai (джерело істини, яке ми
  // намагались відтворити) — GROK_TEAM_ID вже налаштований і
  // перевірений (розділ 91), тож URL команди відомий детерміновано,
  // без жодних припущень про структуру відповіді API.
  getGrokConsoleLink(): { consoleUrl: string | null; diagnostic: string } {
    const teamId = this.config.get<string>('GROK_TEAM_ID');
    if (!teamId) {
      return {
        consoleUrl: null,
        diagnostic: 'GROK_TEAM_ID не налаштований (отримати на console.x.ai → обрати команду → скопіювати UUID з адресного рядка).',
      };
    }
    return { consoleUrl: `https://console.x.ai/team/${teamId}`, diagnostic: 'OK' };
  }

  // За прямим запитом користувача — "административные расходы"
  async listAdminExpenses() {
    return this.prisma.client.adminExpense.findMany({ orderBy: { createdAt: 'desc' } });
  }

  async createAdminExpense(description: string, amountUsd: number, category?: string) {
    return this.prisma.client.adminExpense.create({ data: { description, amountUsd, category } });
  }

  async deleteAdminExpense(id: string) {
    await this.prisma.client.adminExpense.delete({ where: { id } });
  }

  // За прямим запитом користувача — "снизу лог расходов". Об'єднує
  // GrokUsageLog (AI) та AdminExpense (ручні витрати) в ОДИН
  // хронологічний список — сортування на боці застосунку (не SQL
  // UNION — Prisma напряму цього не підтримує для двох різних
  // моделей, обсяг таблиць для типового використання не проблема
  // продуктивності).
  async getExpenseLog(limit = 100): Promise<ExpenseLogEntry[]> {
    const [aiLogs, adminExpenses] = await Promise.all([
      this.prisma.client.grokUsageLog.findMany({ orderBy: { createdAt: 'desc' }, take: limit }),
      this.prisma.client.adminExpense.findMany({ orderBy: { createdAt: 'desc' }, take: limit }),
    ]);

    const combined: ExpenseLogEntry[] = [
      ...aiLogs.map((l) => ({
        id: l.id,
        type: 'ai_usage' as const,
        description: `ШІ: ${l.purpose} (${l.model}, ${l.totalTokens} токенів)`,
        amountUsd: Number(l.estimatedCostUsd),
        createdAt: l.createdAt,
      })),
      ...adminExpenses.map((e) => ({
        id: e.id,
        type: 'admin_expense' as const,
        description: e.category ? `${e.description} (${e.category})` : e.description,
        amountUsd: Number(e.amountUsd),
        createdAt: e.createdAt,
      })),
    ];

    return combined.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()).slice(0, limit);
  }

  // Групуємо на боці застосунку (не SQL groupBy по userId+sessionId
  // разом — Prisma groupBy не вміє JOIN на User для імені/telegramId в
  // одному запиті так само зручно) — для типового обсягу цієї таблиці
  // (ітеративний квиз, не масовий парсер) це прийнятно, не проблема
  // продуктивності.
  async getUsageSummary(sinceDate?: Date): Promise<{ perUser: UserUsageSummary[]; totalCostUsd: number; totalRequests: number }> {
    // АУДИТ 25.08.2026. Коментар вище спирався на те, що таблицю наповнює
    // лише ітеративний квіз, "не масовий парсер". Це перестало бути
    // правдою: тепер витрати логує і chatJson, тобто матчинг сірої зони в
    // кроні парсера — а він пише рядки постійно і без userId. Без ліміту
    // адмінська сторінка з часом тягла б у пам'ять усю таблицю.
    //
    // Беремо найсвіжіші SUMMARY_ROW_LIMIT: зріз за замовчуванням і так
    // обмежений періодом, а якщо рядків більше — краще показати актуальні,
    // ніж не показати нічого.
    const logs = await this.prisma.client.grokUsageLog.findMany({
      where: sinceDate ? { createdAt: { gte: sinceDate } } : undefined,
      include: { user: { select: { telegramId: true, username: true, firstName: true } } },
      orderBy: { createdAt: 'desc' },
      take: SUMMARY_ROW_LIMIT,
    });
    if (logs.length === SUMMARY_ROW_LIMIT) {
      this.logger.warn(`Зведення витрат обрізано на ${SUMMARY_ROW_LIMIT} записах — показані найсвіжіші, підсумок занижений.`);
    }

    const grouped = new Map<string, UserUsageSummary>();
    for (const log of logs) {
      // Ключ групування — userId, якщо є, інакше sessionId (гість) —
      // щоб не змішувати різних анонімних гостей в одну групу.
      const key = log.userId ?? `session:${log.sessionId ?? 'unknown'}`;
      const existing = grouped.get(key);
      const costUsd = Number(log.estimatedCostUsd);

      if (existing) {
        existing.requestCount++;
        existing.totalTokens += log.totalTokens;
        existing.totalCostUsd += costUsd;
      } else {
        grouped.set(key, {
          userId: log.userId,
          telegramId: log.user?.telegramId ?? null,
          username: log.user?.username ?? null,
          firstName: log.user?.firstName ?? null,
          sessionId: log.userId ? null : log.sessionId,
          requestCount: 1,
          totalTokens: log.totalTokens,
          totalCostUsd: costUsd,
        });
      }
    }

    const perUser = Array.from(grouped.values()).sort((a, b) => b.totalCostUsd - a.totalCostUsd);
    const totalCostUsd = perUser.reduce((sum, u) => sum + u.totalCostUsd, 0);
    const totalRequests = perUser.reduce((sum, u) => sum + u.requestCount, 0);

    return { perUser, totalCostUsd: Math.round(totalCostUsd * 1_000_000) / 1_000_000, totalRequests };
  }
}
