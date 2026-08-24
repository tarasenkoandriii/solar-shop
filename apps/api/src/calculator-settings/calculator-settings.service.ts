import { Injectable } from '@nestjs/common';
import { ProductStatus } from '@solar-shop/db';
import { PrismaService } from '../prisma/prisma.service';
import { GrokService } from '../grok/grok.service';

// ТЗ п.31.11.6/31.12.6 — вкладка "Настройки калькулятора": тарифы для
// расчёта окупаемости + пороги диапазонов мощности/HEADROOM, оба с кнопкой
// "Оценить через ИИ" (предложение-черновик, применяется вручную).
@Injectable()
export class CalculatorSettingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly grok: GrokService,
  ) {}

  // ---- Тарифы (ТЗ п.31.11.1a) ----

  findAllTariffs() {
    return this.prisma.client.tariffRate.findMany({ orderBy: { key: 'asc' } });
  }

  async upsertTariff(key: string, label: string, rateUahPerKwh: number, sourceUrl?: string) {
    // Підготовка до мультикраїнності — складений унікальний ключ
    // (countryCode, key), явний "UA" тут, поки адмінка не має вибору
    // країни (за прямим запитом користувача — без конкретики по країнах
    // зараз, лише готова структура БД).
    return this.prisma.client.tariffRate.upsert({
      where: { countryCode_key: { countryCode: 'UA', key } },
      create: { key, label, rateUahPerKwh, sourceUrl, countryCode: 'UA' },
      update: { label, rateUahPerKwh, sourceUrl },
    });
  }

  // ---- Границы диапазонов мощности (ТЗ п.31.11.6) ----

  findAllPowerRangeThresholds() {
    return this.prisma.client.powerRangeThreshold.findMany();
  }

  // Шаг 1 — детерминированная статистика по каталогу (перцентили мощности
  // панелей), без ИИ. Считаем по одиночной панели specs.powerW — целевая
  // суммарная мощность проекта аппроксимируется через типичное количество
  // панелей в подобранных сметах, поэтому для порогов используем мощность
  // ОДНОЙ панели как прокси-метрику (проще и стабильнее, чем пытаться
  // реконструировать распределение суммарных мощностей задним числом).
  private async computePanelWattStats(): Promise<{ percentiles: Record<string, number>; clusters: number[] }> {
    const panels = await this.prisma.client.product.findMany({
      where: { category: 'SOLAR_PANEL', status: ProductStatus.PUBLISHED },
      select: { specs: true },
    });
    const watts = panels
      .map((p) => Number((p.specs as Record<string, unknown>).powerW ?? 0))
      .filter((w) => w > 0)
      .sort((a, b) => a - b);

    if (watts.length === 0) return { percentiles: {}, clusters: [] };

    const percentile = (p: number) => watts[Math.min(watts.length - 1, Math.floor((p / 100) * watts.length))];
    const percentiles = { p25: percentile(25), p50: percentile(50), p75: percentile(75), p90: percentile(90) };

    // Простая кластеризация — точки разрыва там, где соседние значения
    // отличаются больше чем на 20% (естественные "скачки" в номенклатуре)
    const clusters: number[] = [];
    for (let i = 1; i < watts.length; i++) {
      if (watts[i] > watts[i - 1] * 1.2) clusters.push(watts[i]);
    }

    return { percentiles, clusters };
  }

  async suggestPowerRangeThresholds() {
    const stats = await this.computePanelWattStats();
    const suggestion = await this.grok.suggestPowerRangeThresholds(stats);
    if (!suggestion) return null;

    // Сохраняем предложение как черновик (aiSuggestion) — НЕ применяется
    // автоматически, админ жмёт "Применить" отдельно.
    const tags: { tag: 'SMALL' | 'MEDIUM' | 'LARGE'; max: number }[] = [
      { tag: 'SMALL', max: suggestion.small },
      { tag: 'MEDIUM', max: suggestion.medium },
      { tag: 'LARGE', max: suggestion.large },
    ];
    for (const { tag, max } of tags) {
      await this.prisma.client.powerRangeThreshold.upsert({
        where: { tag },
        create: { tag, minPanelsWattW: 0, maxPanelsWattW: max, aiSuggestion: suggestion.reasoning },
        update: { aiSuggestion: suggestion.reasoning },
      });
    }
    await this.prisma.client.powerRangeThreshold.upsert({
      where: { tag: 'COMMERCIAL' },
      create: { tag: 'COMMERCIAL', minPanelsWattW: suggestion.large, maxPanelsWattW: null, aiSuggestion: suggestion.reasoning },
      update: { aiSuggestion: suggestion.reasoning },
    });

    return { suggestion, stats };
  }

  async applyPowerRangeThreshold(tag: 'SMALL' | 'MEDIUM' | 'LARGE' | 'COMMERCIAL', minPanelsWattW: number, maxPanelsWattW: number | null) {
    return this.prisma.client.powerRangeThreshold.upsert({
      where: { tag },
      create: { tag, minPanelsWattW, maxPanelsWattW, aiSuggestion: null },
      update: { minPanelsWattW, maxPanelsWattW, aiSuggestion: null },
    });
  }

  // Определяет PowerRangeTag проекта по суммарной мощности панелей —
  // используется при подборе манифеста бизнес-плана (ТЗ п.31.11.5 шаг 1).
  async resolvePowerRangeTag(totalPanelsWattW: number): Promise<'SMALL' | 'MEDIUM' | 'LARGE' | 'COMMERCIAL' | null> {
    const thresholds = await this.findAllPowerRangeThresholds();
    if (thresholds.length === 0) return null;
    const match = thresholds.find(
      (t) => totalPanelsWattW >= t.minPanelsWattW && (t.maxPanelsWattW === null || totalPanelsWattW < t.maxPanelsWattW),
    );
    return match?.tag ?? null;
  }

  // ---- Порог HEADROOM (ТЗ п.31.12.6) ----

  findAllScalingThresholds() {
    return this.prisma.client.scalingThreshold.findMany();
  }

  private async computePriceSteps(category: 'CONTROLLER'): Promise<number[]> {
    const items = await this.prisma.client.product.findMany({
      where: { category, status: ProductStatus.PUBLISHED, cachedInStock: true },
      select: { specs: true, cachedPriceUsd: true },
    });
    const sorted = items
      .map((i) => ({
        amps: Number((i.specs as Record<string, unknown>).maxCurrentA ?? 0),
        price: Number(i.cachedPriceUsd ?? 0),
      }))
      .filter((i) => i.amps > 0 && i.price > 0)
      .sort((a, b) => a.amps - b.amps);

    const steps: number[] = [];
    for (let i = 1; i < sorted.length; i++) {
      const pct = ((sorted[i].price - sorted[i - 1].price) / sorted[i - 1].price) * 100;
      if (pct > 0) steps.push(Math.round(pct * 10) / 10);
    }
    return steps;
  }

  async suggestScalingThreshold(category: 'CONTROLLER') {
    const steps = await this.computePriceSteps(category);
    const suggestion = await this.grok.suggestScalingThreshold(category, steps);
    if (!suggestion) return null;

    await this.prisma.client.scalingThreshold.upsert({
      where: { category },
      create: { category, headroomMaxPricePercent: suggestion.thresholdPercent, aiSuggestion: suggestion.reasoning },
      update: { aiSuggestion: suggestion.reasoning },
    });

    return { suggestion, steps };
  }

  async applyScalingThreshold(category: 'CONTROLLER', headroomMaxPricePercent: number) {
    return this.prisma.client.scalingThreshold.upsert({
      where: { category },
      create: { category, headroomMaxPricePercent, aiSuggestion: null },
      update: { headroomMaxPricePercent, aiSuggestion: null },
    });
  }

  // За прямим запитом користувача — "На вкладке Налаштування добавить
  // секцію Налаштування документообігу... Спецификация и бизнес план
  // чекбоксами всегда ✅ checked... Если checked в налаштуваннях то
  // давать вибирати на клієнтському сайті, якщо ні то grayed + not
  // checked". Ті самі 5 ключів, що вже DOCS у DocumentChecklist.tsx.
  private static readonly ALWAYS_ENABLED_DOC_KEYS = ['SPEC', 'BUSINESS_PLAN'];
  private static readonly ALL_DOC_KEYS = ['SPEC', 'ANNOTATION', 'BLOCK_DIAGRAM', 'PRINCIPAL_DIAGRAM', 'BUSINESS_PLAN'];

  // Створює відсутні записи з дефолтом enabled=true — щоб UI одразу
  // бачив усі 5 пунктів, навіть якщо адмін ще не відкривав цю секцію
  // жодного разу (не порожній список до першого upsert).
  async findAllDocumentTypeSettings() {
    const existing = await this.prisma.client.documentTypeSetting.findMany();
    const existingKeys = new Set(existing.map((e) => e.key));
    const missing = CalculatorSettingsService.ALL_DOC_KEYS.filter((k) => !existingKeys.has(k));
    if (missing.length > 0) {
      await this.prisma.client.documentTypeSetting.createMany({
        data: missing.map((key) => ({ key, enabled: true })),
        skipDuplicates: true,
      });
      return this.prisma.client.documentTypeSetting.findMany();
    }
    return existing;
  }

  // Захист НЕ лише на UI-рівні — навіть прямий виклик API з
  // key='SPEC'/'BUSINESS_PLAN' і enabled=false ігнорується, примусово
  // лишається true. "Всегда ✅ checked" — гарантія бекенду, не
  // домовленість з фронтендом.
  async setDocumentTypeEnabled(key: string, enabled: boolean) {
    const finalEnabled = CalculatorSettingsService.ALWAYS_ENABLED_DOC_KEYS.includes(key) ? true : enabled;
    return this.prisma.client.documentTypeSetting.upsert({
      where: { key },
      create: { key, enabled: finalEnabled },
      update: { enabled: finalEnabled },
    });
  }

  // Публічний метод (без auth) — DocumentChecklist.tsx на
  // клієнтському сайті читає це, щоб сірити/забороняти вимкнені типи.
  // Повертає ЛИШЕ масив дозволених ключів — мінімальна поверхня,
  // не весь об'єкт налаштувань назовні.
  async getEnabledDocumentTypeKeys(): Promise<string[]> {
    const settings = await this.findAllDocumentTypeSettings();
    return settings.filter((s) => s.enabled).map((s) => s.key);
  }
}
