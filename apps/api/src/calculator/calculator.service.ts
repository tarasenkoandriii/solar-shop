import { BadRequestException, ForbiddenException, Injectable, Logger, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { ProductStatus, resolveTopologyFromGoals, buildSchemaTemplateSvg, batteryCapacityKwh, batteryCountFor, INVERTER_EFFICIENCY, type SchemaTopologyValue } from '@solar-shop/db';
import { PrismaService } from '../prisma/prisma.service';
import { GrokService, GrokCalculatorRequirements } from '../grok/grok.service';
import { PvgisService } from './pvgis.service';
import { RateLimitService } from '../rate-limit/rate-limit.service';
import { CartService } from '../cart/cart.service';
import { InvoiceService } from '../invoice/invoice.service';
import { EmailService } from '../email/email.service';
import { NotifyService } from '../notify/notify.service';
import { StartCalculatorDto, RefineCalculatorDto, UpdateSpecDto, SendPackageDto } from './dto/calculator.dto';
import { roundToCents } from '../common/money';

interface ResolvedSpecItem {
  productId: string;
  articleNumber: string;
  slug: string;
  name: string;
  category: 'SOLAR_PANEL' | 'BATTERY' | 'CONTROLLER' | 'INVERTER' | 'CABLE' | 'CONNECTOR';
  quantity: number;
  priceUsd: number;
  // За прямим запитом користувача — CABLE продається "за погонний
  // метр" (див. коментар у seed.ts) — quantity для CABLE ЦЕ Й Є
  // кількість метрів, не штук. Прапорець тут — щоб UI/PDF-шаблони, що
  // рендерять spec, могли явно показати "12 м" замість "12 шт" без
  // здогадки за назвою категорії.
  soldByMeter?: boolean;
}

interface ResolveResult {
  spec: ResolvedSpecItem[];
  totalUsd: number;
  withinBudget: boolean;
  budgetGapUsd: number | null;
  // За прямим запитом користувача — якщо cableRunMeters не вказано,
  // застосовується консервативний дефолт (не мовчки занижуємо кошторис
  // без жодного попередження користувачу).
  cableWarning?: string;
  // Аудит 27.08.2026 — той самий принцип, що й cableWarning: якщо
  // порахувати чесно неможливо, кажемо про це вголос, а не підставляємо
  // число зі стелі (саме так і з'явився фолбек 3.5 кВт·год).
  batteryWarning?: string;
  // За прямим запитом користувача — "написать обоснование выбора
  // компонентов системы, и учтены ли рекомендации при подборе и
  // какие". Детермінований запис ФАКТИЧНОЇ причини вибору кожного
  // компонента — не AI-пояснення пост-фактум.
  selectionReasoning: SelectionReasoningEntry[];
  goalsAlignmentText: string;
}

interface SelectionReasoningEntry {
  category: ResolvedSpecItem['category'];
  productName: string;
  priceUsd: number;
  // Чи розглядався reliability-скоринг для ЦІЄЇ категорії взагалі —
  // чесно false для SOLAR_PANEL/CABLE/CONNECTOR (розділ нижче,
  // технічне обмеження, не приховане).
  reliabilityConsidered: boolean;
  // Якщо reliabilityConsidered=true — чи РЕАЛЬНО вплинуло на вибір
  // (був товар з вищим рейтингом серед top-N найдешевших, і саме
  // ВІН обраний, а не найдешевший) — може бути false навіть коли
  // reliabilityConsidered=true (розглядалось, але не змінило вибір).
  reliabilityInfluencedChoice: boolean;
  reliabilityScore?: number;
  reliabilityReviewCount?: number;
  reasoning: string;
}

// Локальный интерфейс полей Product, которые реально используются здесь —
// не зависит от генерации Prisma Client (в песочнице, где писался код,
// `prisma generate` недоступен из-за сетевых ограничений, из-за чего
// возвращаемые типы findMany() иногда сворачиваются в `{}` без явной
// аннотации), стабильно типизирует резолвинг независимо от этого.
interface CatalogProductLike {
  id: string;
  articleNumber: string;
  slug: string;
  name: string;
  specs: unknown;
  cachedPriceUsd: unknown;
}

@Injectable()
export class CalculatorService {
  private readonly logger = new Logger(CalculatorService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly grok: GrokService,
    private readonly pvgis: PvgisService,
    private readonly rateLimit: RateLimitService,
    private readonly cart: CartService,
    private readonly invoice: InvoiceService,
    private readonly email: EmailService,
    private readonly notify: NotifyService,
  ) {}

  // ---- Шаг 1: старт квиза (ТЗ п.31.1-31.4) ----

  async start(userId: string | null, dto: StartCalculatorDto) {
    const goalRecords = await this.prisma.client.projectGoal.findMany({ where: { key: { in: dto.goals } } });
    const topology = resolveTopologyFromGoals(goalRecords.map((g) => g.defaultTopology));

    const requirements = await this.grok.extractCalculatorRequirements({
      city: dto.city,
      budgetUsd: dto.budgetUsd,
      goals: goalRecords.map((g) => g.label),
      dailyConsumptionKwh: dto.dailyConsumptionKwh,
      usageContext: { userId, sessionId: dto.sessionId },
    });

    // АУДИТ 25.08.2026. Раніше null просто йшов далі, а
    // resolveRequirementsToCatalog повертав на нього порожній кошик:
    // { spec: [], totalUsd: 0, withinBudget: true }. Тобто при будь-якому
    // збої Grok (а з 10-секундним таймаутом на reasoning-моделі це
    // регулярна ситуація) користувач проходив увесь квіз і отримував
    // збережений проєкт з НУЛЕМ товарів на $0.00 з позначкою "вкладається
    // в бюджет", без жодної помилки. Чесна 503 незрівнянно краща за
    // мовчазну порожню відповідь: користувач знає, що треба повторити.
    if (!requirements) {
      this.logger.error('extractCalculatorRequirements повернув null — відмовляю в старті замість збереження порожнього проєкту');
      throw new ServiceUnavailableException('Сервіс підбору тимчасово недоступний, спробуйте ще раз за хвилину');
    }

    const resolved = await this.resolveRequirementsToCatalog(
      requirements,
      dto.budgetUsd,
      dto.cableRunMeters,
      dto.trustRecommendations ?? false,
      goalRecords.map((g) => g.label),
      dto.hasExistingInverter ?? false,
    );

    const estimate = await this.prisma.client.projectEstimate.create({
      data: {
        userId: userId ?? undefined,
        sessionId: userId ? undefined : dto.sessionId,
        name: `Проєкт від ${new Date().toLocaleDateString('uk-UA')}${dto.city ? `, ${dto.city}` : ''}`,
        city: dto.city,
        cityRef: dto.cityRef,
        budgetUsd: dto.budgetUsd,
        goals: dto.goals,
        dailyConsumptionKwh: dto.dailyConsumptionKwh,
        cableRunMeters: dto.cableRunMeters,
        financingNeeded: dto.financingNeeded ?? false,
        ownFundsPercent: dto.ownFundsPercent,
        trustRecommendations: dto.trustRecommendations ?? false,
        clientType: dto.clientType,
        hasExistingInverter: dto.hasExistingInverter ?? false,
        scalingStrategy: dto.scalingStrategy,
        recommendedSpec: resolved.spec as unknown as object,
        selectionReasoning: { reasoning: resolved.selectionReasoning, goalsAlignmentText: resolved.goalsAlignmentText, batteryWarning: resolved.batteryWarning } as unknown as object,
        totalUsd: resolved.totalUsd,
        conversationLog: [
          { role: 'user', type: 'quiz', input: dto, at: new Date().toISOString() },
          { role: 'assistant', type: 'requirements', output: requirements, at: new Date().toISOString() },
        ] as unknown as object,
        schemaTopology: topology ?? undefined,
      },
    });

    await this.notify.notifyCalculatorLead({
      id: estimate.id,
      city: estimate.city,
      totalUsd: resolved.totalUsd,
      goals: estimate.goals,
    });

    return {
      estimate,
      requirements,
      withinBudget: resolved.withinBudget,
      budgetGapUsd: resolved.budgetGapUsd,
      cableWarning: resolved.cableWarning,
      batteryWarning: resolved.batteryWarning,
      blockDiagramSvg: topology ? await this.renderDiagram(topology, resolved.spec, false) : null,
    };
  }

  // ---- Шаг 2: диалоговое уточнение (ТЗ п.31.2) ----

  async refine(estimateId: string, userId: string | null, sessionId: string | null, dto: RefineCalculatorDto) {
    // ТЗ п.31.9 — rate limit на пересчёты конкретного расчёта
    const refineWindow = await this.rateLimit.checkAndIncrement(`calculator:refine:${estimateId}`, 10, 600);

    const estimate = await this.getOr404(estimateId);
    this.assertOwnership(estimate, userId, sessionId);
    if (estimate.status !== 'DRAFT') {
      throw new BadRequestException('Можна уточнювати тільки чернетку (DRAFT), проєкт вже фіналізовано');
    }

    const goalRecords = await this.prisma.client.projectGoal.findMany({ where: { key: { in: estimate.goals } } });
    const conversationLog = (estimate.conversationLog as unknown as Record<string, unknown>[]) ?? [];
    const lastRequirements = [...conversationLog].reverse().find((e) => e.type === 'requirements')?.output as
      | GrokCalculatorRequirements
      | undefined;

    const requirements = await this.grok.extractCalculatorRequirements({
      city: estimate.city ?? undefined,
      budgetUsd: estimate.budgetUsd ? Number(estimate.budgetUsd) : undefined,
      goals: goalRecords.map((g) => g.label),
      dailyConsumptionKwh: estimate.dailyConsumptionKwh ? Number(estimate.dailyConsumptionKwh) : undefined,
      refinementText: dto.text,
      previousRequirements: lastRequirements,
      usageContext: { userId, sessionId, projectEstimateId: estimate.id },
    });

    // Той самий випадок, що і в start(): порожній результат тут ще
    // гірший — він ЗАТЕР би вже підібрану користувачем специфікацію
    // порожнім кошиком і записав це в conversationLog як нормальну
    // відповідь. Краще відмовити й лишити чернетку як була.
    if (!requirements) {
      this.logger.error(`extractCalculatorRequirements повернув null при уточненні ${estimateId} — лишаю чернетку без змін`);
      // Повертаємо спожиту квоту: користувач не винен, що ліг Grok, а
      // без цього десять спроб під час збою замикали б йому чернетку на
      // десять хвилин.
      await this.rateLimit.refund(`calculator:refine:${estimateId}`, refineWindow);
      throw new ServiceUnavailableException('Сервіс підбору тимчасово недоступний, спробуйте ще раз за хвилину');
    }

    const resolved = await this.resolveRequirementsToCatalog(
      requirements,
      estimate.budgetUsd ? Number(estimate.budgetUsd) : undefined,
      estimate.cableRunMeters ? Number(estimate.cableRunMeters) : undefined,
      estimate.trustRecommendations,
      goalRecords.map((g) => g.label),
      estimate.hasExistingInverter,
    );

    const updatedLog = [
      ...conversationLog,
      { role: 'user', type: 'refinement', text: dto.text, at: new Date().toISOString() },
      { role: 'assistant', type: 'requirements', output: requirements, at: new Date().toISOString() },
    ];

    const updated = await this.prisma.client.projectEstimate.update({
      where: { id: estimateId },
      data: {
        recommendedSpec: resolved.spec as unknown as object,
        selectionReasoning: { reasoning: resolved.selectionReasoning, goalsAlignmentText: resolved.goalsAlignmentText, batteryWarning: resolved.batteryWarning } as unknown as object,
        totalUsd: resolved.totalUsd,
        conversationLog: updatedLog as unknown as object,
      },
    });

    return {
      estimate: updated,
      requirements,
      withinBudget: resolved.withinBudget,
      budgetGapUsd: resolved.budgetGapUsd,
      cableWarning: resolved.cableWarning,
      batteryWarning: resolved.batteryWarning,
      blockDiagramSvg: updated.schemaTopology
        ? await this.renderDiagram(updated.schemaTopology, resolved.spec, false)
        : null,
    };
  }

  // ---- Правки степпера количества (ТЗ п.31.2.1) — чистая персистентность, без Grok ----

  async updateSpec(estimateId: string, userId: string | null, sessionId: string | null, dto: UpdateSpecDto) {
    const estimate = await this.getOr404(estimateId);
    this.assertOwnership(estimate, userId, sessionId);
    const currentSpec = estimate.recommendedSpec as unknown as ResolvedSpecItem[];

    const byProductId = new Map(dto.items.map((i) => [i.productId, i.quantity]));
    const updatedSpec = currentSpec.map((item) =>
      byProductId.has(item.productId) ? { ...item, quantity: byProductId.get(item.productId)! } : item,
    );
    const totalUsd = updatedSpec.reduce((sum, i) => sum + i.priceUsd * i.quantity, 0);

    return this.prisma.client.projectEstimate.update({
      where: { id: estimateId },
      data: { recommendedSpec: updatedSpec as unknown as object, totalUsd },
    });
  }

  // ---- Финализация — фиксация курса (ТЗ п.31.5) ----

  async finalize(estimateId: string, userId: string | null, sessionId: string | null) {
    const estimate = await this.getOr404(estimateId);
    this.assertOwnership(estimate, userId, sessionId);
    if (estimate.status !== 'DRAFT') return estimate;

    // Аудит 27.08.2026: тут був фолбек `: 41.5` із СЬОГОДНІШНЬОЮ датою в
    // exchangeRateDate — тобто вигаданий курс фіксувався в кошторисі як
    // справжній і ще й із виглядом свіжого. Саме це число потім іде в
    // PDF-кошторис, у розрахунок окупності бізнес-плану й у кошик.
    // Зафіксувати неправильний курс гірше, ніж не фіксувати нічого:
    // другий випадок видно одразу, перший не видно ніколи.
    const rate = await this.prisma.client.exchangeRate.findFirst({ where: { currency: 'USD' }, orderBy: { rateDate: 'desc' } });
    if (!rate) {
      this.logger.error('Курс USD відсутній у базі — фіналізація кошторису неможлива. Запусти крон nbu_rate_sync (адмінка → Крони).');
      throw new ServiceUnavailableException('Курс валют тимчасово недоступний. Спробуй, будь ласка, за кілька хвилин.');
    }
    const exchangeRateUah = Number(rate.rateUah);
    const exchangeRateDate = rate.rateDate;
    const totalUah = roundToCents(Number(estimate.totalUsd) * exchangeRateUah);

    return this.prisma.client.projectEstimate.update({
      where: { id: estimateId },
      data: { status: 'FINALIZED', exchangeRateUah, exchangeRateDate, totalUah },
    });
  }

  // ---- Фаза 4: чек-лист документов + постановка в очередь batch-генерации
  // (ТЗ п.31.11.0) ----

  async requestDocuments(
    estimateId: string,
    userId: string | null,
    sessionId: string | null,
    dto: { requestedDocuments: string[]; contactChannel: string; contactValue: string; scalingStrategy?: 'HEADROOM' | 'IDENTICAL_SEGMENTS' },
  ) {
    const estimate = await this.getOr404(estimateId);
    this.assertOwnership(estimate, userId, sessionId);

    // ТЗ п.31.9 — идемпотентность: если уже QUEUED/PROCESSING, не создаём
    // новую работу повторно, просто возвращаем текущий статус.
    if (estimate.generationStatus === 'QUEUED' || estimate.generationStatus === 'PROCESSING') {
      return estimate;
    }

    return this.prisma.client.projectEstimate.update({
      where: { id: estimateId },
      data: {
        requestedDocuments: dto.requestedDocuments,
        contactChannel: dto.contactChannel,
        contactValue: dto.contactValue,
        scalingStrategy: dto.scalingStrategy ?? undefined,
        generationStatus: 'QUEUED',
      },
    });
  }

  // ---- В корзину (ТЗ п.31.2.1) — батч, вся спецификация или выбранные позиции ----

  async addToCart(estimateId: string, userId: string | null, sessionId: string | null, productIds?: string[]) {
    const estimate = await this.getOr404(estimateId);
    this.assertOwnership(estimate, userId, sessionId);
    const spec = estimate.recommendedSpec as unknown as ResolvedSpecItem[];
    const items = productIds ? spec.filter((i) => productIds.includes(i.productId)) : spec;

    for (const item of items) {
      await this.cart.addItem(userId, sessionId, item.productId, item.quantity);
    }
    return { added: items.length };
  }

  // ---- Полный пакет: аннотация + принципиальная схема + PDF (ТЗ п.31.10.3) ----

  async exportPackage(estimateId: string, userId: string | null, sessionId: string | null) {
    const estimate = await this.getOr404(estimateId);
    this.assertOwnership(estimate, userId, sessionId);
    const spec = estimate.recommendedSpec as unknown as ResolvedSpecItem[];

    let annualKwhEstimate: number | null = null;
    if (estimate.cityRef) {
      const city = await this.prisma.client.novaPoshtaCity.findUnique({ where: { ref: estimate.cityRef } });
      if (city?.lat && city?.lng) {
        const panelsWattTotal = await this.sumPanelsWatt(spec);
        const perKwp = await this.pvgis.getAnnualKwhPerKwp(city.lat, city.lng);
        if (perKwp && panelsWattTotal > 0) annualKwhEstimate = perKwp * (panelsWattTotal / 1000);
      }
    }

    const goalRecords = await this.prisma.client.projectGoal.findMany({ where: { key: { in: estimate.goals } } });
    const specSummary = spec.map((i) => `${i.name} × ${i.quantity} ($${i.priceUsd.toFixed(2)}/шт)`).join('; ');

    const annotationText =
      estimate.annotationText ??
      (await this.grok.generateProjectAnnotation({
        city: estimate.city ?? undefined,
        goals: goalRecords.map((g) => g.label),
        topology: estimate.schemaTopology ?? 'невизначено',
        specSummary,
        totalUsd: Number(estimate.totalUsd),
        annualKwhEstimate,
        usageContext: { userId, sessionId, projectEstimateId: estimate.id },
      })) ??
      undefined;

    let principalDiagramSvg: string | null = null;
    if (estimate.schemaTopology) {
      principalDiagramSvg = await this.renderDiagram(estimate.schemaTopology, spec, true);
      const svgDataUrl = `data:image/svg+xml;base64,${Buffer.from(principalDiagramSvg ?? '').toString('base64')}`;
      await this.prisma.client.projectEstimateDiagram.upsert({
        where: { projectEstimateId_diagramType: { projectEstimateId: estimateId, diagramType: 'PRINCIPAL' } },
        create: { projectEstimateId: estimateId, diagramType: 'PRINCIPAL', svgUrl: svgDataUrl },
        update: { svgUrl: svgDataUrl },
      });
    }

    const updated = await this.prisma.client.projectEstimate.update({
      where: { id: estimateId },
      data: { annotationText },
    });

    const pdfUrl = await this.invoice.generateAndStoreProjectEstimatePdf(estimateId);
    await this.prisma.client.projectEstimate.update({ where: { id: estimateId }, data: { pdfUrl } });

    return { estimate: updated, pdfUrl, principalDiagramSvg, annualKwhEstimate };
  }

  // ---- Отправка (ТЗ п.31.6 + Viber по отдельному запросу) ----
  //
  // Каждая попытка отправки — отдельная запись в ProjectEstimateDelivery
  // (не перезапись одного поля на ProjectEstimate) — можно отправить один
  // и тот же проект повторно или на несколько каналов, история сохраняется.
  //
  // ВАЖНЫЙ НЮАНС (см. AUDIT-PHASE-3.md): статус SENT означает разное для
  // разных каналов. TELEGRAM/EMAIL — подтверждённый успешный вызов API
  // (мы реально знаем, что сообщение ушло). WHATSAPP/VIBER — деньги за
  // Business API нет, работаем через диплинк (wa.me/viber://forward) с
  // предзаполненным текстом; SENT здесь означает только "діплінк згенеровано
  // і повернуто користувачу", а не подтверждённую доставку — финальный клик
  // "Отправить" в самом приложении делает человек, не наш backend.
  async send(estimateId: string, userId: string | null, sessionId: string | null, dto: SendPackageDto) {
    const estimate = await this.getOr404(estimateId);
    this.assertOwnership(estimate, userId, sessionId);
    if (!estimate.pdfUrl) {
      throw new BadRequestException('Спочатку сформуйте пакет документів (POST /calculator/:id/export)');
    }

    const channel = dto.channel.toUpperCase() as 'TELEGRAM' | 'EMAIL' | 'WHATSAPP' | 'VIBER';
    const delivery = await this.prisma.client.projectEstimateDelivery.create({
      data: { projectEstimateId: estimateId, channel, contactValue: dto.contactValue, status: 'PENDING' },
    });

    let deeplink: string | null = null;

    try {
      if (dto.channel === 'email') {
        const result = await this.email.send({
          to: dto.contactValue,
          subject: `Кошторис проєкту Solar Shop №${estimate.id.slice(-8).toUpperCase()}`,
          text: `Ваш кошторис проєкту готовий. Сума: $${Number(estimate.totalUsd).toFixed(2)}.`,
          attachmentUrl: estimate.pdfUrl,
        });
        if (!result.sent) throw new Error(result.error ?? 'unknown email error');
      } else if (dto.channel === 'telegram') {
        if (!estimate.userId) throw new Error('Telegram-відправка доступна лише авторизованим користувачам');
        const user = await this.prisma.client.user.findUnique({ where: { id: estimate.userId } });
        if (!user) throw new Error('Користувача не знайдено');
        const sent = await this.notify.sendDocumentToUser(
          user.telegramId,
          estimate.pdfUrl,
          `Кошторис проєкту №${estimate.id.slice(-8).toUpperCase()}`,
        );
        if (!sent) throw new Error('Telegram sendDocument повернув помилку (можливо, користувач заблокував бота, або PDF ще на data: URL без BLOB_READ_WRITE_TOKEN)');
      } else if (dto.channel === 'whatsapp') {
        deeplink = buildWhatsappDeeplink(dto.contactValue, estimate.id, estimate.pdfUrl);
      } else if (dto.channel === 'viber') {
        deeplink = buildViberDeeplink(estimate.id, estimate.pdfUrl);
      }

      await this.prisma.client.projectEstimateDelivery.update({
        where: { id: delivery.id },
        data: { status: 'SENT', sentAt: new Date() },
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      await this.prisma.client.projectEstimateDelivery.update({
        where: { id: delivery.id },
        data: { status: 'FAILED', errorMessage: message },
      });
      throw new BadRequestException(`Не вдалося надіслати через ${dto.channel}: ${message}`);
    }

    await this.prisma.client.projectEstimate.update({ where: { id: estimateId }, data: { status: 'SENT' } });

    return { ok: true, deeplink };
  }

  // ---- Админка: контакты доставки (по запросу — отдельная вкладка) ----

  async findAllDeliveries() {
    return this.prisma.client.projectEstimateDelivery.findMany({
      include: { projectEstimate: { select: { id: true, name: true, city: true, totalUsd: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ---- Чтение ----

  async findById(id: string, userId: string | null, sessionId: string | null) {
    const estimate = await this.getOr404(id);
    this.assertOwnership(estimate, userId, sessionId);
    return estimate;
  }

  async findMine(userId: string) {
    return this.prisma.client.projectEstimate.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } });
  }

  // ТЗ п.31.7 — гостевые DRAFT-расчёты мёрджатся в userId при входе через
  // Telegram, тот же паттерн, что и у гостевой корзины (Cart.sessionId).
  // Найдено при ревью фронтенда: ни этот метод, ни аналогичный для корзины
  // (CartService.mergeGuestCartIntoUser) реально не вызывались с фронта —
  // эндпоинты существовали, но кнопка логина их не дёргала. Чинится на
  // уровне TelegramLoginButton, не здесь — сам метод уже был в CartService,
  // добавляю симметричный для калькулятора.
  async mergeGuestEstimates(sessionId: string, userId: string): Promise<{ merged: number }> {
    const result = await this.prisma.client.projectEstimate.updateMany({
      where: { sessionId, userId: null },
      data: { sessionId: null, userId },
    });
    return { merged: result.count };
  }

  async findAllForAdmin() {
    return this.prisma.client.projectEstimate.findMany({ orderBy: { createdAt: 'desc' } });
  }

  // За прямим запитом користувача ("в админке дать возможность
  // просмотра результатов детально") — окремий ендпоінт для ОДНОГО
  // розрахунку з адмінськими правами (не через `GET /calculator/:id`,
  // що перевіряє власника через sessionId/userId — адмін переглядає
  // ЧУЖІ розрахунки). Переюзано вже наявний `getOr404()`.
  // За прямим запитом користувача — "телеграм изернейм замовника - дає
  // можливість зразу написати". Окремий метод (не переюзує getOr404()
  // нижче, який викликається значно частіше в гарячих шляхах
  // start/refine/finalize — зайвий join там був би недоречним).
  async findOneForAdmin(id: string) {
    const estimate = await this.prisma.client.projectEstimate.findUnique({
      where: { id },
      include: { user: { select: { username: true, firstName: true, lastName: true } } },
    });
    if (!estimate) throw new NotFoundException('Project estimate not found');
    return estimate;
  }

  async convertToOrder(estimateId: string) {
    const estimate = await this.getOr404(estimateId);
    if (!estimate.userId) {
      throw new BadRequestException('Проєкт без користувача не можна перетворити на замовлення напряму — немає кому належати кошику');
    }
    await this.addToCart(estimateId, estimate.userId, null);
    return this.prisma.client.projectEstimate.update({ where: { id: estimateId }, data: { status: 'CONVERTED_TO_ORDER' } });
  }

  // ---- Приватные хелперы ----

  private async getOr404(id: string) {
    const estimate = await this.prisma.client.projectEstimate.findUnique({ where: { id } });
    if (!estimate) throw new NotFoundException('Project estimate not found');
    return estimate;
  }

  // Найдено при аудите (см. AUDIT-PHASE-3.md) — до этой правки refine/
  // updateSpec/finalize/exportPackage/send не проверяли, что вызывающий
  // действительно владелец расчёта: любой, кто узнал estimateId (cuid,
  // тяжело угадать, но может утечь через share-ссылку/реферер/логи), мог
  // дёргать чужой платный Grok-пайплайн и — что хуже — отправить чужие
  // персональные данные проекта на СВОЙ email/Telegram через POST /send.
  // userId имеет приоритет: если юзер залогинен и владеет чужим гостевым
  // (sessionId) расчётом — это не считается «своим», доступ по sessionId
  // работает только для гостя без аккаунта.
  private assertOwnership(
    estimate: { userId: string | null; sessionId: string | null },
    userId: string | null,
    sessionId: string | null,
  ): void {
    if (estimate.userId) {
      if (estimate.userId !== userId) {
        throw new ForbiddenException('Цей розрахунок належить іншому користувачу');
      }
      return;
    }
    if (estimate.sessionId) {
      if (estimate.sessionId !== sessionId) {
        throw new ForbiddenException('Цей розрахунок належить іншій гостьовій сесії');
      }
      return;
    }
    // Ни userId, ни sessionId на расчёте нет (аномалия данных) — по
    // умолчанию отказываем, не даём доступ «по умолчанию открыт».
    throw new ForbiddenException('Розрахунок не має власника — доступ заборонено');
  }

  // За прямим запитом користувача — "не нужно ограничивать количество
  // черновиков". Раніше тут був м'який ліміт (MAX_DRAFTS_PER_OWNER=5,
  // ТЗ п.31.7) — метод assertDraftLimitNotExceeded() і виклик у
  // start() прибрано повністю, не просто збільшено число.

  // ТЗ п.31.4 — детерминированный резолвинг требований Grok в реальный каталог.
  // Всегда берём самый дешёвый подходящий вариант по каждой категории — это
  // естественно минимизирует итоговую цену (не завышаем бюджет самовольно).
  // За прямим запитом користувача — "учитывать это поле рекомендации
  // опционально при выборе компонентов системы после квиза". Нова
  // сигнатура: trustRecommendations (з квизу) + goalLabels (для
  // "соответствие бизнес целям" у reasoning нижче).
  private async resolveRequirementsToCatalog(
    requirements: GrokCalculatorRequirements | null,
    budgetUsd?: number,
    cableRunMeters?: number,
    trustRecommendations = false,
    goalLabels: string[] = [],
    hasExistingInverter = false,
  ): Promise<ResolveResult> {
    const spec: ResolvedSpecItem[] = [];
    const selectionReasoning: SelectionReasoningEntry[] = [];

    if (!requirements) {
      return { spec, totalUsd: 0, withinBudget: true, budgetGapUsd: null, selectionReasoning, goalsAlignmentText: '' };
    }

    // Панели — ближайшая по мощности модель, quantity = ceil(target/powerW)
    const panels: CatalogProductLike[] = await this.prisma.client.product.findMany({
      where: { category: 'SOLAR_PANEL', status: ProductStatus.PUBLISHED, cachedInStock: true },
      orderBy: { cachedPriceUsd: 'asc' },
    });
    const bestPanel = pickClosest(
      panels,
      (p) => Number((p.specs as Record<string, unknown>).powerW ?? 0),
      requirements.panelsWattTarget / Math.max(1, this.estimatePanelCount(panels, requirements.panelsWattTarget)),
    );
    if (bestPanel) {
      const powerW = Number((bestPanel.specs as Record<string, unknown>).powerW ?? 400);
      const quantity = Math.max(1, Math.ceil(requirements.panelsWattTarget / powerW));
      spec.push({
        productId: bestPanel.id,
        articleNumber: bestPanel.articleNumber,
        slug: bestPanel.slug,
        name: bestPanel.name,
        category: 'SOLAR_PANEL',
        quantity,
        priceUsd: Number(bestPanel.cachedPriceUsd),
      });
      // За прямим запитом користувача ("учитывать это поле
      // рекомендации... опционально") — ЧЕСНО: для панелей вибір
      // йде за критерієм найближчої потужності до цільової
      // (pickClosest), не з відкритого списку взаємозамінних
      // кандидатів за ціною — рейтинг надійності технічно НЕ
      // застосовується тут, на відміну від батареї/контролера
      // нижче. Це обмеження прямо позначене в reasoning, не
      // приховане мовчазним "reliabilityConsidered: false".
      selectionReasoning.push({
        category: 'SOLAR_PANEL',
        productName: bestPanel.name,
        priceUsd: Number(bestPanel.cachedPriceUsd),
        reliabilityConsidered: false,
        reliabilityInfluencedChoice: false,
        reasoning: `Обрано модель потужністю ${powerW}Вт — найближча до цільової конфігурації системи. Для панелей рейтинг надійності поки не враховується: вибір відбувається за критерієм потужності, а не серед відкритого переліку взаємозамінних варіантів.`,
      });
    }

    // batteryWarning оголошено тут, ДО блоку акумуляторів: cableWarning
    // нижче оголошений біля свого блоку, і при копіюванні того ж патерну
    // змінна опинилася б після місця присвоєння — це не косметика, а
    // ReferenceError у рантаймі (temporal dead zone), який тут ніщо б не
    // спіймало: сид і сервіс компілюються, а падає вже на живому запиті.
    let batteryWarning: string | undefined;

    // Аккумулятор — совпадение по химии (если задана), ближайшая ёмкость
    if (requirements.batteryKwhTarget > 0) {
      const batteries = await this.prisma.client.product.findMany({
        where: {
          category: 'BATTERY',
          status: ProductStatus.PUBLISHED,
          cachedInStock: true,
          ...(requirements.batteryChemistry ? { specs: { path: ['chemistry'], equals: requirements.batteryChemistry } } : {}),
        },
        orderBy: { cachedPriceUsd: 'asc' },
      });
      const pool =
        batteries.length > 0
          ? batteries
          : await this.prisma.client.product.findMany({
              where: { category: 'BATTERY', status: ProductStatus.PUBLISHED, cachedInStock: true },
              orderBy: { cachedPriceUsd: 'asc' },
            });
      // АУДИТ 27.08.2026. Нижче був рядок
      //   const capacityKwh = Number(specs.capacityKwh ?? 3.5);
      // — а поля capacityKwh у товарів парсера немає взагалі
      // (extractSpecsFromTitle витягує capacityAh), тож для КОЖНОГО
      // спарсеного акумулятора спрацьовував фолбек 3.5. Плюс не
      // враховувались ні глибина розряду, ні ККД інвертора. Розбір і
      // числа — у packages/db/src/battery.ts.
      //
      // Відсіюємо товари, для яких ємність порахувати нічим: краще взяти
      // наступний за ціною акумулятор із зрозумілими характеристиками,
      // ніж рахувати кількість від вигаданого числа.
      const poolWithCapacity = pool.filter((b) => batteryCapacityKwh(b.specs) !== null);

      // Якщо ЖОДЕН акумулятор не має придатних характеристик — беремо
      // повний pool назад. Інакше вийшло б гірше за початковий баг:
      // блок `if (bestBattery)` нижче просто не виконався б, і кошторис
      // поїхав би клієнту БЕЗ акумулятора взагалі, мовчки. Помилкова
      // кількість хоча б видима; відсутня позиція — ні.
      //
      // Кількість у цьому разі не вигадуємо: ставимо 1 і кажемо прямо,
      // що її має підтвердити менеджер.
      const capacityUnknown = poolWithCapacity.length === 0 && pool.length > 0;
      if (capacityUnknown) {
        batteryWarning =
          'Кількість акумуляторів потребує уточнення: у каталозі не вказані ємність і напруга жодної відповідної моделі. У кошторисі поставлено 1 шт. — менеджер перерахує під ваші потреби.';
        this.logger.error(`Підбір акумуляторів: жоден із ${pool.length} товарів не має даних для розрахунку ємності (capacityAh + voltageV або capacityKwh). Кошторис піде з кількістю 1 і попередженням.`);
      }

      const batteryPick = await this.pickWithReliability(capacityUnknown ? pool : poolWithCapacity, trustRecommendations);
      const bestBattery = batteryPick.chosen;
      if (bestBattery) {
        const nominalKwh = batteryCapacityKwh(bestBattery.specs);
        const sizing = nominalKwh === null ? null : batteryCountFor(requirements.batteryKwhTarget, nominalKwh, requirements.batteryChemistry);
        const capacityKwh = sizing?.nominalKwhPerUnit ?? nominalKwh;
        // 1 шт. — свідомо не «розумний» дефолт, а мітка «порахувати
        // вручну», і вона завжди йде разом із batteryWarning вище.
        const quantity = sizing?.quantity ?? 1;
        spec.push({
          productId: bestBattery.id,
          articleNumber: bestBattery.articleNumber,
          slug: bestBattery.slug,
          name: bestBattery.name,
          category: 'BATTERY',
          quantity,
          priceUsd: Number(bestBattery.cachedPriceUsd),
        });
        selectionReasoning.push({
          category: 'BATTERY',
          productName: bestBattery.name,
          priceUsd: Number(bestBattery.cachedPriceUsd),
          reliabilityConsidered: trustRecommendations,
          reliabilityInfluencedChoice: batteryPick.reliabilityInfluencedChoice,
          reliabilityScore: batteryPick.reliabilityScore,
          reliabilityReviewCount: batteryPick.reliabilityReviewCount,
          reasoning: batteryPick.reliabilityInfluencedChoice
            ? `Обрано не найдешевший, а варіант із рейтингом надійності ${batteryPick.reliabilityScore}/10 (${batteryPick.reliabilityReviewCount} відгуків від покупців) серед 3 найдешевших підходящих — за вашим бажанням довіряти рекомендаціям.`
            : trustRecommendations
              ? 'Розглянуто рейтинг надійності серед найдешевших варіантів, але жоден не мав достатньо відгуків (мінімум 3) з високим рейтингом (від 7/10) — обрано найдешевший підходящий варіант.'
              : sizing
                ? `Обрано найдешевший підходящий варіант номіналом ${capacityKwh} кВт·год${requirements.batteryChemistry ? ` (хімія ${requirements.batteryChemistry})` : ''}. Корисна ємність однієї банки — ${sizing.usableKwhPerUnit} кВт·год (враховано допустиму глибину розряду ${Math.round(sizing.depthOfDischarge * 100)}% і ККД інвертора ${Math.round(INVERTER_EFFICIENCY * 100)}%), тому під ціль ${requirements.batteryKwhTarget} кВт·год потрібно ${quantity} шт.`
                : `Обрано найдешевший підходящий варіант${requirements.batteryChemistry ? ` (хімія ${requirements.batteryChemistry})` : ''}. Ємність у характеристиках товару не вказана, тому кількість розрахувати неможливо — поставлено 1 шт., менеджер уточнить.`,
        });
      }
    }

    // Контроллер — тип + минимальный ток
    const controllers = await this.prisma.client.product.findMany({
      where: {
        category: 'CONTROLLER',
        status: ProductStatus.PUBLISHED,
        cachedInStock: true,
        ...(requirements.controllerType ? { specs: { path: ['controllerType'], equals: requirements.controllerType } } : {}),
      },
      orderBy: { cachedPriceUsd: 'asc' },
    });
    const controllerPool =
      controllers.length > 0
        ? controllers
        : await this.prisma.client.product.findMany({
            where: { category: 'CONTROLLER', status: ProductStatus.PUBLISHED, cachedInStock: true },
            orderBy: { cachedPriceUsd: 'asc' },
          });
    const suitableControllers = controllerPool.filter(
      (c) => Number((c.specs as Record<string, unknown>).maxCurrentA ?? 0) >= requirements.controllerMinAmps,
    );
    const controllerCandidates = suitableControllers.length > 0 ? suitableControllers : controllerPool.slice(-1);
    const controllerPick = await this.pickWithReliability(controllerCandidates, trustRecommendations);
    const suitableController = controllerPick.chosen;
    if (suitableController) {
      spec.push({
        productId: suitableController.id,
        articleNumber: suitableController.articleNumber,
        slug: suitableController.slug,
        name: suitableController.name,
        category: 'CONTROLLER',
        quantity: 1,
        priceUsd: Number(suitableController.cachedPriceUsd),
      });
      selectionReasoning.push({
        category: 'CONTROLLER',
        productName: suitableController.name,
        priceUsd: Number(suitableController.cachedPriceUsd),
        reliabilityConsidered: trustRecommendations,
        reliabilityInfluencedChoice: controllerPick.reliabilityInfluencedChoice,
        reliabilityScore: controllerPick.reliabilityScore,
        reliabilityReviewCount: controllerPick.reliabilityReviewCount,
        reasoning: controllerPick.reliabilityInfluencedChoice
          ? `Обрано не найдешевший, а варіант із рейтингом надійності ${controllerPick.reliabilityScore}/10 (${controllerPick.reliabilityReviewCount} відгуків від покупців) серед найдешевших підходящих за струмом — за вашим бажанням довіряти рекомендаціям.`
          : trustRecommendations
            ? 'Розглянуто рейтинг надійності серед найдешевших варіантів, але жоден не мав достатньо відгуків (мінімум 3) з високим рейтингом (від 7/10) — обрано найдешевший підходящий за струмом варіант.'
            : `Обрано найдешевший підходящий варіант, що витримує розрахунковий струм ${requirements.controllerMinAmps}А${requirements.controllerType ? ` (тип ${requirements.controllerType})` : ''}.`,
      });
    }

    // За прямим запитом користувача — "исправь добавлением категории.
    // ...инвертор должен обеспечить мощность если бизнес цель
    // генерация или собственное потребление - то есть в любом
    // случае" + "Если доп установка инвертор может быть не нужен -
    // добавить в квиз опциональность инвертора". Інвертор додається
    // ЗАВЖДИ, ОКРІМ явного "у мене вже є" — той самий підхід, що вже
    // для контролера: найдешевший ПІДХОДЯЩИЙ за потужністю варіант, з
    // урахуванням рекомендацій покупців, якщо trustRecommendations
    // увімкнено.
    if (hasExistingInverter) {
      // Явний запис у "Обґрунтування вибору" — інакше відсутність
      // інвертора в специфікації виглядала б як пропущений компонент/
      // баг, не свідоме рішення на основі відповіді користувача.
      selectionReasoning.push({
        category: 'INVERTER',
        productName: '—',
        priceUsd: 0,
        reliabilityConsidered: false,
        reliabilityInfluencedChoice: false,
        reasoning: `Не додано до кошторису — ви вказали, що це доповнення до вже наявної системи з власним інвертором (розрахункова потужність ${Math.round(requirements.inverterWattTarget)}Вт — перевірте, чи витримує ваш наявний інвертор це навантаження).`,
      });
    } else {
      const inverters = await this.prisma.client.product.findMany({
        where: { category: 'INVERTER', status: ProductStatus.PUBLISHED, cachedInStock: true },
        orderBy: { cachedPriceUsd: 'asc' },
      });
      const suitableInverters = inverters.filter(
        (i) => Number((i.specs as Record<string, unknown>).outputPowerW ?? 0) >= requirements.inverterWattTarget,
      );
      const inverterCandidates = suitableInverters.length > 0 ? suitableInverters : inverters.slice(-1);
      const inverterPick = await this.pickWithReliability(inverterCandidates, trustRecommendations);
      const suitableInverter = inverterPick.chosen;
      if (suitableInverter) {
        spec.push({
          productId: suitableInverter.id,
          articleNumber: suitableInverter.articleNumber,
          slug: suitableInverter.slug,
          name: suitableInverter.name,
          category: 'INVERTER',
          quantity: 1,
          priceUsd: Number(suitableInverter.cachedPriceUsd),
        });
        selectionReasoning.push({
          category: 'INVERTER',
          productName: suitableInverter.name,
          priceUsd: Number(suitableInverter.cachedPriceUsd),
          reliabilityConsidered: trustRecommendations,
          reliabilityInfluencedChoice: inverterPick.reliabilityInfluencedChoice,
          reliabilityScore: inverterPick.reliabilityScore,
          reliabilityReviewCount: inverterPick.reliabilityReviewCount,
          reasoning: inverterPick.reliabilityInfluencedChoice
            ? `Обрано не найдешевший, а варіант із рейтингом надійності ${inverterPick.reliabilityScore}/10 (${inverterPick.reliabilityReviewCount} відгуків від покупців) серед найдешевших підходящих за потужністю — за вашим бажанням довіряти рекомендаціям.`
            : trustRecommendations
              ? 'Розглянуто рейтинг надійності серед найдешевших варіантів, але жоден не мав достатньо відгуків (мінімум 3) з високим рейтингом (від 7/10) — обрано найдешевший підходящий за потужністю варіант.'
              : `Обрано найдешевший підходящий варіант, що витримує розрахункову потужність ${Math.round(requirements.inverterWattTarget)}Вт — покриває більше з (сумарна потужність панелей, пікове споживання).`,
        });
      }
    }

    // За прямим запитом користувача — "явно упущен раздел кабели и
    // соединители... нету вводных в квизе для кабеля снижения".
    // Розраховуємо ПІСЛЯ панелей/акумулятора/контролера — потребує
    // реальну кількість панелей із spec (не дублюємо змінну quantity,
    // що вже локальна всередині блоку панелей вище).
    const panelCount = spec.find((i) => i.category === 'SOLAR_PANEL')?.quantity ?? 0;
    let cableWarning: string | undefined;

    if (panelCount > 0) {
      // --- Коннектори (MC4) ---
      // За прямим запитом користувача: кількість залежить від числа
      // СТРІЧОК панелей, не від числа самих панелей. 6 панелей на
      // стрічку — типова межа входу MPPT-контролера побутового
      // класу, ЕВРИСТИКА (немає реальних даних про фактичну
      // конфігурацію стрічок з квизу) — явно позначено як таке в
      // коментарі, не видається за точний розрахунок.
      const stringCount = Math.max(1, Math.ceil(panelCount / 6));
      const connectors = await this.prisma.client.product.findMany({
        where: { category: 'CONNECTOR', status: ProductStatus.PUBLISHED, cachedInStock: true },
        orderBy: { cachedPriceUsd: 'asc' },
      });
      const mc4 = connectors.find((c) => (c.specs as Record<string, unknown>).connectorType === 'MC4') ?? connectors[0];
      if (mc4) {
        spec.push({
          productId: mc4.id,
          articleNumber: mc4.articleNumber,
          slug: mc4.slug,
          name: mc4.name,
          category: 'CONNECTOR',
          quantity: stringCount,
          priceUsd: Number(mc4.cachedPriceUsd),
        });
        selectionReasoning.push({
          category: 'CONNECTOR',
          productName: mc4.name,
          priceUsd: Number(mc4.cachedPriceUsd),
          reliabilityConsidered: false,
          reliabilityInfluencedChoice: false,
          reasoning: `Кількість — за розрахунковою кількістю стрічок панелей (${stringCount}). Технічний компонент, рейтинг надійності не застосовується.`,
        });
      }

      // --- DC-кабель (панелі → контролер) ---
      // Евристика: 1.5м на панель (внутрішньострічкова розводка) + 5м
      // фіксовано до контролера — не точний розрахунок траси даху
      // (немає даних про фактичну геометрію в квизі), консервативна
      // оцінка для кошторису.
      const dcCableMeters = Math.ceil(panelCount * 1.5 + 5);
      const dcCables = await this.prisma.client.product.findMany({
        where: { category: 'CABLE', status: ProductStatus.PUBLISHED, cachedInStock: true, specs: { path: ['cableType'], equals: 'DC_SOLAR' } },
        orderBy: { cachedPriceUsd: 'asc' },
      });
      if (dcCables[0]) {
        spec.push({
          productId: dcCables[0].id,
          articleNumber: dcCables[0].articleNumber,
          slug: dcCables[0].slug,
          name: dcCables[0].name,
          category: 'CABLE',
          quantity: dcCableMeters,
          priceUsd: Number(dcCables[0].cachedPriceUsd),
          soldByMeter: true,
        });
        selectionReasoning.push({
          category: 'CABLE',
          productName: `${dcCables[0].name} (DC, панелі → контролер)`,
          priceUsd: Number(dcCables[0].cachedPriceUsd),
          reliabilityConsidered: false,
          reliabilityInfluencedChoice: false,
          reasoning: `Довжина — за евристикою (1.5м/панель + 5м до контролера) = ${dcCableMeters}м. Технічний компонент, рейтинг надійності не застосовується.`,
        });
      }

      // --- AC силовий кабель "зниження" (установка → споживач) ---
      // За прямим запитом користувача — єдина величина, яку
      // ФІЗИЧНО неможливо визначити без прямого вводу (залежить від
      // конкретного будинку/ділянки). Якщо не вказано — консервативний
      // дефолт 15м (типова відстань дах-щиток для приватного будинку)
      // З ЯВНИМ попередженням у результаті, не мовчазне заниження.
      const DEFAULT_CABLE_RUN_M = 15;
      const runMeters = cableRunMeters ?? DEFAULT_CABLE_RUN_M;
      if (cableRunMeters === undefined) {
        cableWarning = `Відстань до точки підключення споживача не вказана — застосовано орієнтовний дефолт ${DEFAULT_CABLE_RUN_M}м. Уточніть реальну відстань для точнішого кошторису кабелю.`;
      }

      // Розрахунок перерізу — падіння напруги по ПУЕ (перевірено
      // web_search, не вигадано): ΔU = (2×I×ρ×L)/S для однофазної
      // лінії 220В, ρ(мідь) = 0.0175 Ом·мм²/м, допустиме ΔU ≤ 5% для
      // силових ліній. Струм — за сумарною потужністю панелей на
      // напрузі побутової мережі 220В (cosφ≈1, стандартне спрощення
      // для активного навантаження). За прямим запитом користувача
      // ("исправь добавлением категории") — категорія "Інвертор"
      // тепер є в каталозі (усі seed-моделі Victron видають
      // стандартні 220-230В змінного струму побутової мережі України
      // — те саме припущення, тепер обґрунтоване реальним товаром у
      // специфікації, не голослівне).
      const currentA = requirements.panelsWattTarget / 220;
      const STANDARD_CROSS_SECTIONS_MM2 = [1.5, 2.5, 4, 6, 10, 16, 25, 35, 50];
      const COPPER_RESISTIVITY = 0.0175; // Ом·мм²/м
      const MAX_VOLTAGE_DROP_PERCENT = 5;
      // 8 А/мм² (не 10) — консервативно враховує поправочний коефіцієнт
      // 0.8 для схованої/трубної прокладки (типово для кабелю
      // зниження), не відкритої прокладки в повітрі.
      const COPPER_AMPACITY_A_PER_MM2 = 8;

      let requiredCrossSectionMm2 = STANDARD_CROSS_SECTIONS_MM2[STANDARD_CROSS_SECTIONS_MM2.length - 1];
      for (const s of STANDARD_CROSS_SECTIONS_MM2) {
        const voltageDropPercent = ((2 * currentA * COPPER_RESISTIVITY * runMeters) / s / 220) * 100;
        const ampacityOk = currentA <= s * COPPER_AMPACITY_A_PER_MM2;
        if (voltageDropPercent <= MAX_VOLTAGE_DROP_PERCENT && ampacityOk) {
          requiredCrossSectionMm2 = s;
          break;
        }
      }

      const acCables = await this.prisma.client.product.findMany({
        where: { category: 'CABLE', status: ProductStatus.PUBLISHED, cachedInStock: true, specs: { path: ['cableType'], equals: 'AC_POWER' } },
        orderBy: { cachedPriceUsd: 'asc' },
      });
      // Найближчий переріз, що НЕ МЕНШЕ розрахованого (краще
      // перевитрата, ніж недостатній переріз — питання безпеки, не
      // економії).
      const suitableAcCable =
        acCables
          .filter((c) => Number((c.specs as Record<string, unknown>).crossSectionMm2 ?? 0) >= requiredCrossSectionMm2)
          .sort((a, b) => Number((a.specs as Record<string, unknown>).crossSectionMm2) - Number((b.specs as Record<string, unknown>).crossSectionMm2))[0] ??
        acCables[acCables.length - 1];

      if (suitableAcCable) {
        // +15% запас на прокладку (повороти, вертикальні ділянки) —
        // стандартна практика монтажників, не довільна цифра (розділ
        // README з посиланнями на джерела).
        const metersToOrder = Math.ceil(runMeters * 1.15);
        spec.push({
          productId: suitableAcCable.id,
          articleNumber: suitableAcCable.articleNumber,
          slug: suitableAcCable.slug,
          name: suitableAcCable.name,
          category: 'CABLE',
          quantity: metersToOrder,
          priceUsd: Number(suitableAcCable.cachedPriceUsd),
          soldByMeter: true,
        });
        selectionReasoning.push({
          category: 'CABLE',
          productName: `${suitableAcCable.name} (AC, зниження)`,
          priceUsd: Number(suitableAcCable.cachedPriceUsd),
          reliabilityConsidered: false,
          reliabilityInfluencedChoice: false,
          reasoning: `Переріз ${requiredCrossSectionMm2}мм² — за розрахунком падіння напруги ПУЕ на відстань ${runMeters}м, +15% запас на прокладку (${metersToOrder}м). Технічний компонент, рейтинг надійності не застосовується.`,
        });
      }
    }

    const totalUsd = spec.reduce((sum, i) => sum + i.priceUsd * i.quantity, 0);
    const withinBudget = budgetUsd === undefined || totalUsd <= budgetUsd;
    const budgetGapUsd = withinBudget ? null : Math.round((totalUsd - (budgetUsd ?? 0)) * 100) / 100;

    // За прямим запитом користувача — "соответствие бизнес целям тоже
    // внести". Детермінований текст на основі реальних вхідних даних
    // квизу (goalLabels/цільова потужність/ємність), не AI-вигадка.
    const goalsAlignmentText =
      goalLabels.length > 0
        ? `Конфігурація розрахована під заявлені цілі: ${goalLabels.join(', ')}. Цільова потужність панелей ${Math.round(requirements.panelsWattTarget)}Вт та ємність накопичення ${requirements.batteryKwhTarget} кВт·год визначені виходячи саме з цих цілей (не з бюджету — бюджет лише обмежує остаточний вибір моделей).`
        : 'Цілі проєкту не вказані в цьому розрахунку — конфігурація базується лише на технічних параметрах (споживання/бюджет).';

    return { spec, totalUsd: Math.round(totalUsd * 100) / 100, withinBudget, budgetGapUsd, cableWarning, batteryWarning, selectionReasoning, goalsAlignmentText };
  }

  // За прямим запитом користувача — "учитывать это поле рекомендации
  // опционально при выборе компонентов системы после квиза". Серед
  // кандидатів (вже відсортованих по ціні asc) — якщо
  // trustRecommendations=false, повертає найдешевшого (стара
  // поведінка, без змін). Якщо true — розглядає ТОП-3 найдешевших:
  // якщо серед них є товар з ДОСТАТНЬОЮ кількістю відгуків (≥3) і
  // ВИСОКИМ рейтингом надійності (≥7/10) — обирає НАЙНАДІЙНІШОГО
  // серед них (при рівному рейтингу — дешевшого), не просто
  // найдешевшого. Пороги (3 відгуки, 7/10) обрані як розумний
  // компроміс: занадто мало відгуків — статистично ненадійний
  // агрегат, занадто високий поріг рейтингу — рекомендація майже
  // ніколи не спрацює.
  private async pickWithReliability(
    candidates: CatalogProductLike[],
    trustRecommendations: boolean,
  ): Promise<{
    chosen: CatalogProductLike | undefined;
    reliabilityInfluencedChoice: boolean;
    reliabilityScore?: number;
    reliabilityReviewCount?: number;
  }> {
    if (candidates.length === 0) return { chosen: undefined, reliabilityInfluencedChoice: false };
    if (!trustRecommendations) return { chosen: candidates[0], reliabilityInfluencedChoice: false };

    const RELIABLE_THRESHOLD = 7;
    const MIN_REVIEWS = 3;
    const TOP_N = 3;
    const pool = candidates.slice(0, TOP_N);

    const grouped = await this.prisma.client.productReview.groupBy({
      by: ['productId'],
      where: { productId: { in: pool.map((c) => c.id) } },
      _count: { _all: true },
      _avg: { reliabilityScore: true },
    });
    const aggByProductId = new Map<string, { score: number; count: number }>(
      grouped.map((g) => [g.productId as string, { score: g._avg.reliabilityScore ?? 0, count: g._count._all }]),
    );

    const reliableCandidates = pool
      .map((c) => ({ item: c, agg: aggByProductId.get(c.id) }))
      .filter((x): x is { item: CatalogProductLike; agg: { score: number; count: number } } => !!x.agg && x.agg.count >= MIN_REVIEWS && x.agg.score >= RELIABLE_THRESHOLD)
      .sort((a, b) => b.agg.score - a.agg.score || Number(a.item.cachedPriceUsd) - Number(b.item.cachedPriceUsd));

    if (reliableCandidates.length > 0) {
      const best = reliableCandidates[0];
      return {
        chosen: best.item,
        reliabilityInfluencedChoice: best.item.id !== candidates[0].id,
        reliabilityScore: Math.round(best.agg.score * 10) / 10,
        reliabilityReviewCount: best.agg.count,
      };
    }
    return { chosen: candidates[0], reliabilityInfluencedChoice: false };
  }

  private estimatePanelCount(panels: CatalogProductLike[], targetWatt: number): number {
    if (panels.length === 0) return 1;
    const avgWatt = panels.reduce((s, p) => s + Number((p.specs as Record<string, unknown>).powerW ?? 400), 0) / panels.length;
    return Math.max(1, Math.round(targetWatt / avgWatt));
  }

  private async sumPanelsWatt(spec: ResolvedSpecItem[]): Promise<number> {
    let total = 0;
    for (const item of spec.filter((i) => i.category === 'SOLAR_PANEL')) {
      const product = await this.prisma.client.product.findUnique({ where: { id: item.productId } });
      if (product) {
        const powerW = Number((product.specs as Record<string, unknown>).powerW ?? 0);
        total += powerW * item.quantity;
      }
    }
    return total;
  }

  // ТЗ п.31.10.1 — детерминированная подстановка резолвленных данных в
  // готовый (не сгенерированный ИИ) шаблон. Grok здесь не участвует вообще.
  private async renderDiagram(topology: SchemaTopologyValue, spec: ResolvedSpecItem[], detailed: boolean): Promise<string | null> {
    const template = await this.prisma.client.schemaTemplate.findUnique({
      where: { topology_diagramType: { topology, diagramType: detailed ? 'PRINCIPAL' : 'BLOCK' } },
    });

    const svgTemplate = template?.svgTemplate ?? buildSchemaTemplateSvg(topology, detailed);

    const panels = spec.filter((s) => s.category === 'SOLAR_PANEL');
    const batteries = spec.filter((s) => s.category === 'BATTERY');
    const controllers = spec.filter((s) => s.category === 'CONTROLLER');

    const panelsLabel = panels.length ? `${panels[0].name} × ${panels[0].quantity}` : 'Сонячні панелі';
    const batteryLabel = batteries.length ? `${batteries[0].name} × ${batteries[0].quantity}` : 'Акумулятор';
    const controllerLabel = controllers.length ? controllers[0].name : 'Контролер заряду';

    // Найдено при повторному аудиті: підстановка йшла БЕЗ XML-екранування —
    // назва товару з `&`/`<`/`>` (напр. "Panel A & B") ламала валідність
    // SVG (не парситься/парситься некоректно в браузері), а сам SVG потім
    // рендериться через dangerouslySetInnerHTML на публічному сайті
    // (SchemaDiagram.tsx) — тому екранування важливе і для коректності
    // рендеру, і як defense-in-depth (Product.name зараз вводиться
    // адміном вручну, не напряму зі скрапленого rawTitle постачальника,
    // але це не гарантія на майбутнє, якщо матчинг колись почне
    // автозаповнювати назву).
    return svgTemplate
      .replace(/\{\{PANELS_LABEL\}\}/g, escapeXml(panelsLabel))
      .replace(/\{\{BATTERY_LABEL\}\}/g, escapeXml(batteryLabel))
      .replace(/\{\{CONTROLLER_LABEL\}\}/g, escapeXml(controllerLabel))
      .replace(/\{\{INVERTER_LABEL\}\}/g, 'Інвертор (підбирається окремо)')
      .replace(/\{\{GRID_LABEL\}\}/g, 'Мережа 220В')
      .replace(/\{\{LOAD_LABEL\}\}/g, 'Навантаження')
      .replace(/\{\{LOAD2_LABEL\}\}/g, 'Навантаження 2');
  }
}

function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

// Вынесено за пределы класса как обычная функция — generic-метод класса
// давал сбой вывода типа T в связке TypeScript+неcгенерированный Prisma
// Client в этой песочнице, обычная модульная функция инферит корректно.
function pickClosest<T>(items: T[], numericValue: (item: T) => number, target: number): T | null {
  if (items.length === 0) return null;
  return items.reduce((best, item) =>
    Math.abs(numericValue(item) - target) < Math.abs(numericValue(best) - target) ? item : best,
  );
}

// ТЗ п.31.6 — WhatsApp на первом этапе: wa.me-диплинк с предзаполненным
// текстом, без полноценной WhatsApp Business API (платная, отдельная
// верификация — избыточно для Фазы 3).
function buildWhatsappDeeplink(phone: string, estimateId: string, pdfUrl: string): string {
  const digits = phone.replace(/\D/g, '');
  const text = encodeURIComponent(
    `Кошторис проєкту Solar Shop №${estimateId.slice(-8).toUpperCase()}: ${pdfUrl}`,
  );
  return `https://wa.me/${digits}?text=${text}`;
}

// Viber не входил в исходное ТЗ (добавлен по отдельному запросу) — та же
// логика, что и WhatsApp: без Viber Business Messages API (платный,
// требует регистрации публичного аккаунта), просто диплинк. В отличие от
// wa.me, у Viber нет универсального "открыть чат с конкретным номером
// и текстом" для не-контактов — используем viber://forward, который
// открывает системный пикер "переслать" с предзаполненным текстом,
// получателя выбирает человек вручную. Из-за этого ограничения статус
// SENT для Viber даже более условный, чем для WhatsApp — см. AUDIT.
function buildViberDeeplink(estimateId: string, pdfUrl: string): string {
  const text = encodeURIComponent(`Кошторис проєкту Solar Shop №${estimateId.slice(-8).toUpperCase()}: ${pdfUrl}`);
  return `viber://forward?text=${text}`;
}
