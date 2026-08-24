import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { GrokService } from '../grok/grok.service';
import { InvoiceService } from '../invoice/invoice.service';
import { EmailService } from '../email/email.service';
import { NotifyService } from '../notify/notify.service';
import { CalculatorSettingsService } from '../calculator-settings/calculator-settings.service';
import { FinancingService } from '../financing/financing.service';
import { PaybackService } from './payback.service';
import { BusinessPlanManifestService } from './business-plan-manifest.service';

interface ResolvedSpecItem {
  productId: string;
  articleNumber: string;
  name: string;
  category: 'SOLAR_PANEL' | 'BATTERY' | 'CONTROLLER' | 'INVERTER' | 'CABLE' | 'CONNECTOR';
  quantity: number;
  priceUsd: number;
}

// ТЗ п.31.11.0 — batch-обработчик: забирает все QUEUED-проекты разом,
// генерирует отмеченный чек-листом пакет документов, отправляет на
// сохранённый контакт, уведомляет менеджера. Вызывается и из крона
// (раз в несколько минут), и вручную из админки — тот же метод.
@Injectable()
export class BusinessPlanGenerationService {
  private readonly logger = new Logger(BusinessPlanGenerationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly grok: GrokService,
    private readonly invoice: InvoiceService,
    private readonly email: EmailService,
    private readonly notify: NotifyService,
    private readonly settings: CalculatorSettingsService,
    private readonly financing: FinancingService,
    private readonly payback: PaybackService,
    private readonly manifests: BusinessPlanManifestService,
  ) {}

  // Забирает все QUEUED-проекты и обрабатывает пакетно (ТЗ: "меньше
  // накладных расходов, чем если бы каждый клик дёргал Grok в реальном
  // времени" — в этой реализации вызовы всё равно последовательные, т.к.
  // отдельного batch/async-режима у Grok API на момент имплементации не
  // подтверждено — см. AUDIT-PHASE-4.md).
  async processQueue(): Promise<{ processed: number; completed: number; failed: number }> {
    const queued = await this.prisma.client.projectEstimate.findMany({ where: { generationStatus: 'QUEUED' } });
    let completed = 0;
    let failed = 0;

    for (const estimate of queued) {
      await this.prisma.client.projectEstimate.update({ where: { id: estimate.id }, data: { generationStatus: 'PROCESSING' } });
      try {
        await this.generateForEstimate(estimate.id);
        completed++;
      } catch (err) {
        this.logger.error(`Business plan generation failed for ${estimate.id}: ${err}`);
        await this.prisma.client.projectEstimate.update({ where: { id: estimate.id }, data: { generationStatus: 'FAILED' } });
        await this.notify.notifyCronFailed('business_plan_batch_processor', `estimate ${estimate.id}: ${err}`);
        failed++;
      }
    }

    return { processed: queued.length, completed, failed };
  }

  async generateForEstimate(estimateId: string): Promise<void> {
    const estimate = await this.prisma.client.projectEstimate.findUniqueOrThrow({ where: { id: estimateId } });
    const spec = estimate.recommendedSpec as unknown as ResolvedSpecItem[];
    const requested = new Set(estimate.requestedDocuments);

    // Аннотация (может уже быть сгенерирована на этапе п.31.10.2, но
    // batch-пакет может запрашиваться позже сохранённого проекта заново)
    let annotationText = estimate.annotationText;
    if (requested.has('ANNOTATION') && !annotationText) {
      const goalRecords = await this.prisma.client.projectGoal.findMany({ where: { key: { in: estimate.goals } } });
      const specSummary = spec.map((i) => `${i.name} × ${i.quantity} ($${i.priceUsd.toFixed(2)}/шт)`).join('; ');
      annotationText = await this.grok.generateProjectAnnotation({
        city: estimate.city ?? undefined,
        goals: goalRecords.map((g) => g.label),
        topology: estimate.schemaTopology ?? 'невизначено',
        specSummary,
        totalUsd: Number(estimate.totalUsd),
      });
    }

    // Разбивка на этапы (ТЗ п.31.12) — только если бюджет не покрывает
    // полную целевую комплектацию и scalingStrategy выбрана явно
    let phases: { phaseNumber: number; title: string; description: string; specItems: ResolvedSpecItem[]; cumulativeTotalUsd: number; timingNote: string }[] = [];
    if (estimate.scalingStrategy && estimate.scalingStrategy !== 'NONE' && estimate.budgetUsd) {
      phases = await this.planPhases(spec, Number(estimate.budgetUsd), estimate.scalingStrategy);
      await this.prisma.client.projectPhase.deleteMany({ where: { projectEstimateId: estimateId } });
      for (const p of phases) {
        await this.prisma.client.projectPhase.create({
          data: {
            projectEstimateId: estimateId,
            phaseNumber: p.phaseNumber,
            title: p.title,
            description: p.description,
            specItems: p.specItems as unknown as object,
            cumulativeTotalUsd: p.cumulativeTotalUsd,
            timingNote: p.timingNote,
          },
        });
      }
    }

    // Окупаемость (ТЗ п.31.11.1a) — чистая арифметика, без Grok
    const paybackEstimate = requested.has('BUSINESS_PLAN') ? await this.payback.compute(estimateId) : null;

    // Бизнес-план (ТЗ п.31.11) — манифест + Додаток 1 (кредитование) +
    // Додаток 2 (масштабирование, если применимо)
    let businessPlanContent: string | null = null;
    let manifestId: string | null = null;
    if (requested.has('BUSINESS_PLAN')) {
      const panelsWattTotal = await this.sumPanelsWatt(spec);
      const powerRangeTag = await this.settings.resolvePowerRangeTag(panelsWattTotal);
      const match = await this.manifests.findBestMatch(estimate.goals, powerRangeTag);

      if (match) {
        manifestId = match.manifest.id;
        // За прямим запитом користувача — "добавить вопрос кого
        // представляет пользователь". Реальна відповідь квизу замінює
        // попередню евристику по цілях проєкту — fallback лишений
        // ЛИШЕ для розрахунків, створених ДО цієї фічі (де
        // clientType ще null).
        const clientType = estimate.clientType ?? (estimate.goals.includes('COMMERCIAL_OBJECT') ? 'бізнес' : 'фізичні особи');
        const programs = estimate.creditAmountUsd
          ? await this.financing.findForBusinessPlan(Number(estimate.creditAmountUsd), clientType)
          : [];

        const projectSummary = [
          `Місто: ${estimate.city ?? 'не вказано'}`,
          `Специфікація: ${spec.map((i) => `${i.name} × ${i.quantity}`).join('; ')}`,
          `Разом: $${Number(estimate.totalUsd).toFixed(2)}`,
          paybackEstimate
            ? `Окупність: орієнтовно ${paybackEstimate.paybackYearsMin.toFixed(1)}-${paybackEstimate.paybackYearsMax.toFixed(1)} років (за даними PVGIS та тарифом ${paybackEstimate.tariffLabel})`
            : '',
          estimate.creditAmountUsd ? `Сума кредиту: $${Number(estimate.creditAmountUsd).toFixed(2)}` : '',
          programs.length > 0
            ? `Доступні програми кредитування: ${programs.map((p) => `${p.name} (${p.url})`).join('; ')}`
            : 'Доступні програми кредитування: не знайдено відповідних у поточному оточенні',
          phases.length > 0
            ? `Поетапна реалізація (${estimate.scalingStrategy}): ${phases.map((p) => `${p.title} — $${p.cumulativeTotalUsd.toFixed(2)}`).join('; ')}`
            : '',
        ]
          .filter(Boolean)
          .join('\n');

        businessPlanContent = await this.grok.fillBusinessPlanContent({
          manifestContent: match.manifest.content,
          projectSummary,
        });
      }
    }

    const updated = await this.prisma.client.projectEstimate.update({
      where: { id: estimateId },
      data: {
        annotationText: annotationText ?? undefined,
        businessPlanManifestId: manifestId ?? undefined,
      },
    });

    const pdfUrl = await this.invoice.generateAndStoreBusinessPlanPdf(estimateId, businessPlanContent, paybackEstimate);
    await this.prisma.client.projectEstimate.update({
      where: { id: estimateId },
      data: { businessPlanUrl: pdfUrl, generationStatus: 'COMPLETED' },
    });

    // ТЗ п.31.11.0 — по завершении отправляется на сохранённый контакт +
    // уведомление менеджеру (тёплый лид с готовым пакетом документов)
    if (updated.contactChannel === 'email' && updated.contactValue) {
      await this.email.send({
        to: updated.contactValue,
        subject: `Бізнес-план проєкту Solar Shop №${estimateId.slice(-8).toUpperCase()}`,
        text: 'Ваш пакет документів готовий.',
        attachmentUrl: pdfUrl,
      });
    } else if (updated.contactChannel === 'telegram' && updated.userId) {
      const user = await this.prisma.client.user.findUnique({ where: { id: updated.userId } });
      if (user) await this.notify.sendDocumentToUser(user.telegramId, pdfUrl, `Бізнес-план проєкту №${estimateId.slice(-8).toUpperCase()}`);
    }

    await this.notify.notifyCalculatorLead({
      id: estimate.id,
      city: estimate.city,
      totalUsd: Number(estimate.totalUsd),
      goals: estimate.goals,
    });
  }

  // ТЗ п.31.12.2/31.12.5 — детерминированное разбиение на этапы, если
  // бюджет не покрывает целевую комплектацию целиком. Панели/АКБ (модульные
  // по природе) масштабируются пропорционально под бюджет для этапа 1,
  // контроллер (центральный компонент) остаётся полного размера сразу при
  // HEADROOM — под конечную целевую мощность, не только этап 1.
  // За прямим запитом користувача — "реализовать реальную разницу в
  // логике (второй контроллер меньшего размера для второго этапа)".
  // Знайдена раніше проблема (розділ README): `strategy` впливав ЛИШЕ
  // на текстову мітку, сам розрахунок був ІДЕНТИЧНИЙ для обох
  // стратегій. Тепер IDENTICAL_SEGMENTS РЕАЛЬНО підбирає ДВА окремих
  // контролери — кожен під СВІЙ сегмент (пропорційно частці панелей у
  // цьому етапі), не один великий контролер одразу (це і робить
  // HEADROOM, лишений БЕЗ ЗМІН — вже коректно реалізовував свою
  // семантику).
  private async planPhases(
    fullSpec: ResolvedSpecItem[],
    budgetUsd: number,
    strategy: 'HEADROOM' | 'IDENTICAL_SEGMENTS',
  ): Promise<{ phaseNumber: number; title: string; description: string; specItems: ResolvedSpecItem[]; cumulativeTotalUsd: number; timingNote: string }[]> {
    const fullTotal = fullSpec.reduce((s, i) => s + i.priceUsd * i.quantity, 0);
    if (fullTotal <= budgetUsd) {
      // Бюджет и так покрывает всё — этапы не нужны, один этап целиком
      return [
        {
          phaseNumber: 1,
          title: 'Етап 1: повна комплектація',
          description: 'Бюджет покриває цільову комплектацію повністю, розбивка на етапи не потрібна.',
          specItems: fullSpec,
          cumulativeTotalUsd: fullTotal,
          timingNote: 'Одразу',
        },
      ];
    }

    const controller = fullSpec.find((i) => i.category === 'CONTROLLER');
    const scalable = fullSpec.filter((i) => i.category !== 'CONTROLLER');
    const controllerCost = controller ? controller.priceUsd * controller.quantity : 0;
    const budgetForScalable = Math.max(0, budgetUsd - controllerCost);
    const scalableFullCost = scalable.reduce((s, i) => s + i.priceUsd * i.quantity, 0);
    const scaleFactor = scalableFullCost > 0 ? Math.min(1, budgetForScalable / scalableFullCost) : 1;

    let phase1Controller: ResolvedSpecItem | null = controller ?? null;
    let phase2Controller: ResolvedSpecItem | null = null;

    if (strategy === 'IDENTICAL_SEGMENTS' && controller) {
      // Пропорційний струм для КОЖНОГО сегменту, не повний одразу —
      // maxCurrentA УЖЕ обраного повнорозмірного контролера є хорошим
      // проксі "необхідного струму для повної системи" (він сам був
      // підібраний під requirements.controllerMinAmps раніше в
      // calculator.service.ts, ближче до точного значення, ніж
      // намагатись повторно розпарсити conversationLog JSON).
      const controllerFull = await this.prisma.client.product.findUnique({ where: { id: controller.productId } });
      const fullMaxCurrentA = Number((controllerFull?.specs as Record<string, unknown> | undefined)?.maxCurrentA ?? 0);
      const controllerType = (controllerFull?.specs as Record<string, unknown> | undefined)?.controllerType as string | undefined;

      const phase1Amps = fullMaxCurrentA * scaleFactor;
      const phase2Amps = fullMaxCurrentA * (1 - scaleFactor);

      phase1Controller = await this.pickSmallerController(phase1Amps, controllerType);
      phase2Controller = await this.pickSmallerController(phase2Amps, controllerType);

      // Чесний фолбек — якщо в каталозі немає меншого підходящого
      // контролера (наприклад, найменша модель вже перевищує
      // phase1Amps), лишаємо оригінальний повнорозмірний для Етапу 1,
      // не намагаємось штучно підібрати щось невідповідне.
      if (!phase1Controller) phase1Controller = controller;
    }

    const phase1Items: ResolvedSpecItem[] = [
      ...(phase1Controller ? [phase1Controller] : []),
      ...scalable.map((i) => ({ ...i, quantity: Math.max(1, Math.floor(i.quantity * scaleFactor)) })),
    ];
    const phase1Total = phase1Items.reduce((s, i) => s + i.priceUsd * i.quantity, 0);

    const phase2Items: ResolvedSpecItem[] = [
      ...(phase2Controller ? [phase2Controller] : []),
      ...scalable
        .map((i) => {
          const phase1Item = phase1Items.find((p1) => p1.productId === i.productId);
          const remaining = i.quantity - (phase1Item?.quantity ?? 0);
          return remaining > 0 ? { ...i, quantity: remaining } : null;
        })
        .filter((i): i is ResolvedSpecItem => i !== null),
    ];
    // cumulativeTotalUsd для Етапу 2 — реальна сума ОБОХ контролерів
    // (якщо IDENTICAL_SEGMENTS) + повна комплектація масштабованого,
    // не завжди дорівнює fullTotal — два менших контролери можуть
    // коштувати ДЕШЕВШЕ або ДОРОЖЧЕ за один великий, залежно від цін
    // каталогу, це чесно відображає реальний економічний ефект вибору
    // стратегії, не лише текстову мітку.
    const phase2CumulativeTotal =
      strategy === 'IDENTICAL_SEGMENTS'
        ? phase1Total + phase2Items.reduce((s, i) => s + i.priceUsd * i.quantity, 0)
        : fullTotal;

    const strategyLabel = strategy === 'HEADROOM' ? 'із запасом по контролеру' : 'ідентичними сегментами';
    const phase1Description =
      strategy === 'IDENTICAL_SEGMENTS' && phase1Controller?.productId !== controller?.productId
        ? `Компоненти в межах поточного бюджету, ${strategyLabel}: контролер підібрано під ЦЕЙ сегмент (менший, дешевший за повнорозмірний), не під фінальну потужність.`
        : `Компоненти в межах поточного бюджету, ${strategyLabel}. Докупка пізніше не вимагає заміни вже встановленого.`;
    const phase2Description =
      strategy === 'IDENTICAL_SEGMENTS' && phase2Controller
        ? `Докупка панелей/акумуляторів + ДРУГИЙ окремий контролер під цей сегмент (${phase2Controller.name}) — два незалежних контролери замість одного великого.`
        : 'Докупка панелей/акумуляторів до повної цільової комплектації — контролер вже має необхідний запас.';

    return [
      {
        phaseNumber: 1,
        title: 'Етап 1: базова система (в межах бюджету)',
        description: phase1Description,
        specItems: phase1Items,
        cumulativeTotalUsd: phase1Total,
        timingNote: 'Зараз',
      },
      {
        phaseNumber: 2,
        title: 'Етап 2: розширення до цільової потужності',
        description: phase2Description,
        specItems: phase2Items,
        cumulativeTotalUsd: phase2CumulativeTotal,
        timingNote: 'Через 3-6 місяців після Етапу 1 (орієнтовно)',
      },
    ];
  }

  // Найдешевший підходящий за струмом контролер — той самий підхід
  // (сортування за ціною, фільтр за maxCurrentA), що вже
  // calculator.service.ts. Повертає null, якщо жодної підходящої
  // моделі немає (не намагається штучно підібрати щось невідповідне).
  private async pickSmallerController(
    requiredAmps: number,
    controllerType: string | undefined,
  ): Promise<ResolvedSpecItem | null> {
    const controllers = await this.prisma.client.product.findMany({
      where: {
        category: 'CONTROLLER',
        status: 'PUBLISHED',
        cachedInStock: true,
        ...(controllerType ? { specs: { path: ['controllerType'], equals: controllerType } } : {}),
      },
      orderBy: { cachedPriceUsd: 'asc' },
    });
    const pool = controllers.length > 0 ? controllers : await this.prisma.client.product.findMany({
      where: { category: 'CONTROLLER', status: 'PUBLISHED', cachedInStock: true },
      orderBy: { cachedPriceUsd: 'asc' },
    });
    const suitable = pool.filter((c) => Number((c.specs as Record<string, unknown>).maxCurrentA ?? 0) >= requiredAmps);
    const chosen = suitable[0];
    if (!chosen) return null;
    return {
      productId: chosen.id,
      articleNumber: chosen.articleNumber,
      name: chosen.name,
      category: 'CONTROLLER',
      quantity: 1,
      priceUsd: Number(chosen.cachedPriceUsd),
    };
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
}
