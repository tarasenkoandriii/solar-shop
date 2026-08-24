import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { GrokService } from '../grok/grok.service';
import { CreateProjectGoalDto, UpdateProjectGoalDto } from './dto/project-goal.dto';

// ТЗ п.31.1.1/31.1.2 — справочник целей проекта калькулятора, не хардкод.
// AI-кандидаты создаются с isActive: false — не появляются в квизе
// автоматически, ждут ручного review в админке.
@Injectable()
export class ProjectGoalsService {
  private readonly logger = new Logger(ProjectGoalsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly grok: GrokService,
  ) {}

  findAll() {
    return this.prisma.client.projectGoal.findMany({ orderBy: { createdAt: 'desc' } });
  }

  // Публичный список для квиза калькулятора — только активные
  findActive() {
    return this.prisma.client.projectGoal.findMany({ where: { isActive: true }, orderBy: { createdAt: 'asc' } });
  }

  async create(dto: CreateProjectGoalDto) {
    const existing = await this.prisma.client.projectGoal.findUnique({ where: { key: dto.key } });
    if (existing) throw new BadRequestException(`Ціль з key="${dto.key}" вже існує`);

    return this.prisma.client.projectGoal.create({
      data: {
        key: dto.key,
        label: dto.label,
        description: dto.description,
        defaultTopology: (dto.defaultTopology as never) ?? undefined,
        generatedBy: 'manual',
        isActive: true,
      },
    });
  }

  async update(id: string, dto: UpdateProjectGoalDto) {
    await this.getOr404(id);
    return this.prisma.client.projectGoal.update({
      where: { id },
      data: dto as never,
    });
  }

  async remove(id: string) {
    await this.getOr404(id);
    await this.prisma.client.projectGoal.delete({ where: { id } });
    return { ok: true };
  }

  // ТЗ п.31.1.2 шаги 1-3 — Grok получает полный текущий список активных
  // целей (обязательно, чтобы не предлагать дубли), возвращает кандидатов
  // с isActive: false.
  async suggestViaAi(brief?: string) {
    const existing = await this.prisma.client.projectGoal.findMany({
      select: { key: true, label: true, description: true, defaultTopology: true },
    });

    const candidates = await this.grok.suggestProjectGoals(existing, brief);
    if (!candidates || candidates.length === 0) {
      throw new BadRequestException('Grok не повернув кандидатів (можливо, GROK_API_KEY не налаштований)');
    }

    // За прямим запитом користувача ("same shit" — реальний скріншот
    // показав 500 на цьому ж класі "AI suggest" ендпоінтів, не лише
    // pvgis) — знайдено ЙМОВІРНУ причину: `defaultTopology` бралось з
    // відповіді Grok БЕЗ валідації проти реального enum
    // (`as never ?? undefined` — сліпо довіряло рядку). Якщо LLM
    // поверне значення, що НЕ збігається ТОЧНО з одним із 4 дозволених
    // ('OFF_GRID'|'BACKUP_UPS'|'GRID_TIE'|'COMMERCIAL') — Prisma
    // відхиляє запис НЕОБРОБЛЕНИМ винятком на рівні БД (не
    // HttpException), що й дає голий 500 — особливо ймовірно саме при
    // ПОВТОРНИХ викликах (2-4 кандидати одразу, шанс хоча б одного
    // "збійного" значення зростає з кожним новим викликом).
    const VALID_TOPOLOGIES = ['OFF_GRID', 'BACKUP_UPS', 'GRID_TIE', 'COMMERCIAL'];

    const created: Array<Awaited<ReturnType<typeof this.prisma.client.projectGoal.create>>> = [];
    for (const candidate of candidates) {
      const alreadyExists = await this.prisma.client.projectGoal.findUnique({ where: { key: candidate.key } });
      if (alreadyExists) continue; // на всякий випадок, якщо Grok всё же предложил дубль по key

      const topology = VALID_TOPOLOGIES.includes(candidate.defaultTopology ?? '') ? (candidate.defaultTopology as never) : undefined;
      if (candidate.defaultTopology && !VALID_TOPOLOGIES.includes(candidate.defaultTopology)) {
        this.logger.warn(`Grok повернув невалидну топологію "${candidate.defaultTopology}" для кандидата "${candidate.key}" — застосовано null замість падіння запису.`);
      }

      try {
        created.push(
          await this.prisma.client.projectGoal.create({
            data: {
              key: candidate.key,
              label: candidate.label,
              description: `${candidate.description}\n\n[ІІ-обґрунтування унікальності]: ${candidate.reasoning}`,
              defaultTopology: topology,
              generatedBy: 'ai',
              isActive: false,
            },
          }),
        );
      } catch (err) {
        // М'який фолбек на рівні ОДНОГО кандидата — якщо конкретно ЦЕЙ
        // запис все одно не вдалося створити (напр. дублікат key,
        // виявлений race condition, чи інша непередбачена причина) —
        // пропускаємо ЙОГО, не валимо весь виклик через один поганий
        // кандидат з 2-4.
        this.logger.error(`Не вдалося створити ціль "${candidate.key}": ${err instanceof Error ? err.message : String(err)}`);
      }
    }
    return created;
  }

  // ТЗ п.31.1.2 шаг 4 — «Активировать»
  async activate(id: string) {
    await this.getOr404(id);
    return this.prisma.client.projectGoal.update({ where: { id }, data: { isActive: true } });
  }

  // «Отклонить» — остаётся isActive: false, не удаляется физически (Grok
  // видит его в след. раз через п.31.1.2 шаг 2, не предложит повторно)
  async reject(id: string) {
    await this.getOr404(id);
    return this.prisma.client.projectGoal.update({ where: { id }, data: { isActive: false } });
  }

  private async getOr404(id: string) {
    const goal = await this.prisma.client.projectGoal.findUnique({ where: { id } });
    if (!goal) throw new NotFoundException('Project goal not found');
    return goal;
  }
}
