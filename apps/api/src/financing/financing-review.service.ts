import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RateLimitService } from '../rate-limit/rate-limit.service';

// За прямим запитом користувача — комплексний відгук про програму
// кредитування: 4 шкали (1-5) + опційний % покриття + опційний текст.
// Числові оцінки публікуються ОДРАЗУ (агрегати рахуються по них негайно,
// не чекаючи модерації) — модерується ЛИШЕ вільний текст, окремим
// статусом. Прив'язка до User (Telegram) — суто анти-спам (один відгук
// на програму від користувача), НІКОЛИ не віддається публічно жодним
// полем — анонімність за задумом, не приховане поле в тому самому DTO.
export interface ReviewAggregate {
  reviewCount: number;
  avgBusinessPlanQuality: number | null;
  avgBankResponsiveness: number | null;
  avgProcessingSpeed: number | null;
  avgApplicationSuccess: number | null;
  avgCoveragePercent: number | null;
}

@Injectable()
export class FinancingReviewService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly rateLimit: RateLimitService,
  ) {}

  // Один запит одразу на всі PUBLISHED-програми — уникає N+1 при
  // відображенні агрегатів на картках списку (findPublished вище).
  async getAggregatesForPrograms(programIds: string[]): Promise<Record<string, ReviewAggregate>> {
    if (programIds.length === 0) return {};

    const grouped = await this.prisma.client.financingProgramReview.groupBy({
      by: ['financingProgramId'],
      where: { financingProgramId: { in: programIds } },
      _count: { _all: true },
      _avg: {
        businessPlanQualityScore: true,
        bankResponsivenessScore: true,
        processingSpeedScore: true,
        applicationSuccessScore: true,
        coveragePercent: true,
      },
    });

    const result: Record<string, ReviewAggregate> = {};
    for (const g of grouped) {
      result[g.financingProgramId] = {
        reviewCount: g._count._all,
        avgBusinessPlanQuality: g._avg.businessPlanQualityScore,
        avgBankResponsiveness: g._avg.bankResponsivenessScore,
        avgProcessingSpeed: g._avg.processingSpeedScore,
        avgApplicationSuccess: g._avg.applicationSuccessScore,
        avgCoveragePercent: g._avg.coveragePercent,
      };
    }
    return result;
  }

  // Публічний список відгуків для сторінки одного банку — текст
  // повертається ЛИШЕ якщо reviewTextStatus === 'APPROVED', оцінки
  // завжди (публікуються одразу). Жодного userId/User-поля в
  // відповіді — анонімність структурна, не приховане на фронтенді.
  async findPublicReviewsForProgram(financingProgramId: string) {
    const reviews = await this.prisma.client.financingProgramReview.findMany({
      where: { financingProgramId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        city: true,
        branch: true,
        businessPlanQualityScore: true,
        bankResponsivenessScore: true,
        processingSpeedScore: true,
        applicationSuccessScore: true,
        coveragePercent: true,
        reviewText: true,
        reviewTextStatus: true,
        createdAt: true,
      },
    });
    return reviews.map((r) => ({
      ...r,
      reviewText: r.reviewTextStatus === 'APPROVED' ? r.reviewText : null,
    }));
  }

  async createReview(
    userId: string,
    financingProgramId: string,
    dto: {
      city: string;
      branch: string;
      businessPlanQualityScore: number;
      bankResponsivenessScore: number;
      processingSpeedScore: number;
      applicationSuccessScore: number;
      coveragePercent?: number;
      reviewText?: string;
    },
  ) {
    // За прямим запитом користувача — "по одному отзыву на каждую
    // программу от одного telegram id раз в час". Ключ по (userId,
    // financingProgramId) — НЕ по IP (як типовий RateLimitGuard, розділ
    // README про rate-limit.guard.ts) — IP ненадійний для цієї мети
    // (спільна мережа/NAT задвоїла б ліміт різним людям, той самий
    // користувач на мобільному/wifi обійшов би його). Пряме звернення
    // до RateLimitService (не через @UseGuards+@RateLimit декоратор
    // на контролері) — той декоратор будує ключ лише з route+IP,
    // немає доступу до :id параметра шляху й автентифікованого
    // користувача одночасно, тут потрібна саме ця комбінація.
    // ⚠️ Вікно фіксоване (не sliding, той самий компроміс, що
    // задокументований у RateLimitService) — "раз на годину" означає
    // "не більше 1 разу в межах фіксованої годинної позначки", не
    // строго "через 60 хвилин після попереднього".
    await this.rateLimit.checkAndIncrement(`financing-review:${userId}:${financingProgramId}`, 1, 3600);

    const program = await this.prisma.client.financingProgram.findUnique({ where: { id: financingProgramId } });
    if (!program) throw new NotFoundException('Financing program not found');

    const existing = await this.prisma.client.financingProgramReview.findUnique({
      where: { financingProgramId_userId: { financingProgramId, userId } },
    });
    if (existing) throw new ConflictException('Ви вже залишали відгук про цю програму');

    return this.prisma.client.financingProgramReview.create({
      data: {
        financingProgramId,
        userId,
        city: dto.city,
        branch: dto.branch,
        businessPlanQualityScore: dto.businessPlanQualityScore,
        bankResponsivenessScore: dto.bankResponsivenessScore,
        processingSpeedScore: dto.processingSpeedScore,
        applicationSuccessScore: dto.applicationSuccessScore,
        coveragePercent: dto.coveragePercent,
        reviewText: dto.reviewText,
        reviewTextStatus: dto.reviewText ? 'PENDING' : 'APPROVED', // немає тексту — нема чого модерувати
      },
    });
  }

  // ---- Адмін-модерація тексту ----

  findPendingTexts() {
    return this.prisma.client.financingProgramReview.findMany({
      where: { reviewTextStatus: 'PENDING' },
      orderBy: { createdAt: 'asc' },
      include: { financingProgram: { select: { name: true } } },
    });
  }

  private async getReviewOr404(id: string) {
    const review = await this.prisma.client.financingProgramReview.findUnique({ where: { id } });
    if (!review) throw new NotFoundException('Review not found');
    return review;
  }

  async approveText(id: string) {
    await this.getReviewOr404(id);
    return this.prisma.client.financingProgramReview.update({ where: { id }, data: { reviewTextStatus: 'APPROVED' } });
  }

  async rejectText(id: string) {
    await this.getReviewOr404(id);
    return this.prisma.client.financingProgramReview.update({ where: { id }, data: { reviewTextStatus: 'REJECTED' } });
  }
}
