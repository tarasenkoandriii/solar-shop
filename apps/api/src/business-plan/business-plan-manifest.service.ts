import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { GrokService } from '../grok/grok.service';

// ТЗ п.31.11.4/31.11.5 — манифесты бизнес-плана, версионирование по
// комбинации тегов (goalTags+powerRangeTag), подбор по точному совпадению
// или похожести. Ни одна версия не удаляется/перезаписывается.
@Injectable()
export class BusinessPlanManifestService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly grok: GrokService,
  ) {}

  findAll() {
    // Знайдено при аудиті реальної Docker-збірки: Prisma НЕ підтримує
    // orderBy по scalar list полю (String[]) стандартним клієнтом —
    // `{ goalTags: 'asc' }` тут був невалідним типом
    // (BusinessPlanManifestOrderByWithRelationInput не містить goalTags
    // як сортовний ключ), пісочниця без згенерованого Prisma Client цю
    // помилку не ловила. Групування по тегах все одно робиться на клієнті
    // (адмінка, Map по [...goalTags].sort().join(',')) — сортування тут не
    // впливає на UI, безпечно прибрати.
    return this.prisma.client.businessPlanManifest.findMany({ orderBy: [{ version: 'desc' }] });
  }

  private async nextVersion(goalTags: string[], powerRangeTag: string | null): Promise<number> {
    const existing = await this.prisma.client.businessPlanManifest.findMany({
      where: { powerRangeTag: powerRangeTag as never },
    });
    // Сравниваем множества goalTags вручную — Prisma не умеет @@unique на
    // массив (см. коммент в самом ТЗ п.31.11.4)
    const matching = existing.filter((m) => setsEqual(m.goalTags, goalTags));
    if (matching.length === 0) return 1;
    return Math.max(...matching.map((m) => m.version)) + 1;
  }

  async createManual(goalTags: string[], powerRangeTag: string | null, content: string, adminUserId?: string, changeNote?: string) {
    const version = await this.nextVersion(goalTags, powerRangeTag);
    return this.prisma.client.businessPlanManifest.create({
      data: { goalTags, powerRangeTag: powerRangeTag as never, content, version, generatedBy: 'manual', adminUserId, changeNote, isActive: false },
    });
  }

  async generateViaAi(goalTags: string[], powerRangeTag: string | null, brief?: string) {
    const content = await this.grok.generateBusinessPlanManifest({ goalTags, powerRangeTag, brief });
    if (!content) throw new BadRequestException('Grok не повернув чернетку (можливо, GROK_API_KEY не налаштований)');
    const version = await this.nextVersion(goalTags, powerRangeTag);
    return this.prisma.client.businessPlanManifest.create({
      data: { goalTags, powerRangeTag: powerRangeTag as never, content, version, generatedBy: 'ai', isActive: false },
    });
  }

  // Активация деактивирует предыдущую активную версию С ТОЙ ЖЕ комбинацией
  // тегов (не глобально) — переключение внутри своей группы (ТЗ п.31.11.4).
  async activate(id: string) {
    const manifest = await this.getOr404(id);
    const siblings = await this.prisma.client.businessPlanManifest.findMany({
      where: { powerRangeTag: manifest.powerRangeTag as never, isActive: true },
    });
    for (const s of siblings.filter((s) => setsEqual(s.goalTags, manifest.goalTags))) {
      await this.prisma.client.businessPlanManifest.update({ where: { id: s.id }, data: { isActive: false } });
    }
    return this.prisma.client.businessPlanManifest.update({ where: { id }, data: { isActive: true } });
  }

  // ТЗ п.31.11.5 — точное совпадение тегов, иначе — похожесть, иначе —
  // универсальный фолбэк (goalTags: [], powerRangeTag: null).
  async findBestMatch(goalTags: string[], powerRangeTag: string | null) {
    const activeManifests = await this.prisma.client.businessPlanManifest.findMany({ where: { isActive: true } });
    if (activeManifests.length === 0) return null;

    const exact = activeManifests.find((m) => setsEqual(m.goalTags, goalTags) && m.powerRangeTag === powerRangeTag);
    if (exact) return { manifest: exact, exactMatch: true };

    const scored = activeManifests.map((m) => {
      const intersection = m.goalTags.filter((t) => goalTags.includes(t)).length;
      let powerScore = 0;
      if (m.powerRangeTag === powerRangeTag) powerScore = 1;
      else if (m.powerRangeTag && powerRangeTag && areNeighborRanges(m.powerRangeTag, powerRangeTag)) powerScore = 0.5;
      return { manifest: m, score: intersection + powerScore };
    });
    scored.sort((a, b) => b.score - a.score);
    const best = scored[0];

    // Универсальный фолбэк, если вообще ничего не пересекается
    if (best.score === 0) {
      const universal = activeManifests.find((m) => m.goalTags.length === 0 && m.powerRangeTag === null);
      if (universal) return { manifest: universal, exactMatch: false };
    }

    return best ? { manifest: best.manifest, exactMatch: false } : null;
  }

  private async getOr404(id: string) {
    const manifest = await this.prisma.client.businessPlanManifest.findUnique({ where: { id } });
    if (!manifest) throw new NotFoundException('Manifest not found');
    return manifest;
  }
}

function setsEqual(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const sa = [...a].sort();
  const sb = [...b].sort();
  return sa.every((v, i) => v === sb[i]);
}

const RANGE_ORDER = ['SMALL', 'MEDIUM', 'LARGE', 'COMMERCIAL'];
function areNeighborRanges(a: string, b: string): boolean {
  const ia = RANGE_ORDER.indexOf(a);
  const ib = RANGE_ORDER.indexOf(b);
  return ia >= 0 && ib >= 0 && Math.abs(ia - ib) === 1;
}
