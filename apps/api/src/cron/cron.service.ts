import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ParserService } from '../parser/parser.service';
import { ArticlesService } from '../articles/articles.service';
import { CurrencyService } from '../currency/currency.service';
import { NovaPoshtaService } from '../nova-poshta/nova-poshta.service';
import { PromoService } from '../promo/promo.service';
import { RateLimitService } from '../rate-limit/rate-limit.service';
import { NotifyService } from '../notify/notify.service';
import { FinancingService } from '../financing/financing.service';
import { BusinessPlanGenerationService } from '../business-plan/business-plan-generation.service';
import { SolarMapService } from '../solar-map/solar-map.service';
import { ProductReviewImportService } from '../parser/product-review-import.service';

export type JobKey =
  | 'product_parser'
  | 'article_parser'
  | 'article_batch_poll'
  | 'nova_poshta_directory_sync'
  | 'nbu_rate_sync'
  | 'promo_recalc'
  | 'rate_limit_cleanup'
  | 'financing_program_parser'
  | 'business_plan_batch_processor'
  | 'pvgis_country_grid'
  | 'product_review_parser';

// Реестр джобов — статический список в коде (ТЗ п.27.1), расписание живёт
// в конфигурации Supabase pg_cron снаружи, не редактируется через UI.
// business_plan_batch_processor і article_batch_poll — розклад "раз у
// декілька хвилин", НЕ суточний (ТЗ п.31.11.0, і за аналогією для
// article-rewrite Batch API — за прямим запитом користувача) — обидва
// відмічені в description.
export const JOB_REGISTRY: { jobKey: JobKey; description: string }[] = [
  { jobKey: 'product_parser', description: 'Обход адаптеров всех Vendor, upsert SourceListing, matching engine' },
  { jobKey: 'article_parser', description: 'Поиск новых статей в RSS + подача пачки рерайт/перевод в Grok Batch API (не ждёт результат синхронно)' },
  {
    jobKey: 'article_batch_poll',
    description: 'Опрос незавершённых Grok Batch API пачек article-rewrite, материализация переводов — расписание раз в несколько минут, НЕ суточное',
  },
  { jobKey: 'nova_poshta_directory_sync', description: 'Обновление справочника городов/отделений НП' },
  { jobKey: 'nbu_rate_sync', description: 'Получение курса НБУ, запись в ExchangeRate' },
  { jobKey: 'promo_recalc', description: 'Пересчёт isPromo/discountPercent по каталогу' },
  { jobKey: 'rate_limit_cleanup', description: 'Очистка устаревших RateLimitEntry' },
  { jobKey: 'financing_program_parser', description: 'ИИ-поиск программ кредитования (суточный)' },
  {
    jobKey: 'business_plan_batch_processor',
    description: 'Batch-генерация бизнес-планов для QUEUED-проектов — расписание раз в несколько минут, НЕ суточное',
  },
  {
    jobKey: 'pvgis_country_grid',
    // За прямим запитом користувача — "ітеративний ідемпотентний крон
    // джоб з менеджментом часу запуску в районі 200 секунд і прогрес
    // індикацією, рахувати PVGIS для всієї країни (сирі дані)".
    // Розклад — раз у декілька хвилин, той самий клас, що
    // business_plan_batch_processor вище, НЕ суточний (доки покриття не
    // 100%, потім можна рідше — просто ідемпотентно нічого не робить,
    // якщо все вже пораховано).
    description: 'Ітеративний тайм-боксований (~200с) збір сирих даних PVGIS по всій сітці України — розклад раз у декілька хвилин до повного покриття',
  },
  {
    jobKey: 'product_review_parser',
    // За прямим запитом користувача — "добавить парсер отзывов на
    // товары отдельно скриптом для каждого магазина, показать отзывы
    // на нашем сайте с указанием источника отзыва". Тайм-боксовано
    // (~200с) — реальний прояв: перша реалізація без цього зависала
    // в RUNNING (розділ README) при десятках listings послідовно.
    description: 'Обхід пов\'язаних SourceListing, парсинг відгуків із сайтів-джерел (де підключений адаптер), дедуплікація за хешем вмісту — тайм-боксовано ~200с, не встигле лишається на наступний прогін',
  },
];

@Injectable()
export class CronService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly parser: ParserService,
    private readonly articles: ArticlesService,
    private readonly currency: CurrencyService,
    private readonly novaPoshta: NovaPoshtaService,
    private readonly promo: PromoService,
    private readonly rateLimit: RateLimitService,
    private readonly notify: NotifyService,
    private readonly financing: FinancingService,
    private readonly businessPlan: BusinessPlanGenerationService,
    private readonly solarMap: SolarMapService,
    private readonly productReviewImport: ProductReviewImportService,
  ) {}

  getRegistry() {
    return JOB_REGISTRY;
  }

  async getHistory(jobKey?: string, limit = 50) {
    return this.prisma.client.cronJobRun.findMany({
      where: jobKey ? { jobKey } : undefined,
      orderBy: { startedAt: 'desc' },
      take: limit,
    });
  }

  // ТЗ п.27.3 — единая точка запуска (от pg_cron ИЛИ вручную из админки),
  // triggeredBy различает источник, debugMode переключает расширенный ответ.
  async run(jobKey: JobKey, triggeredBy: string, debugMode: boolean) {
    const run = await this.prisma.client.cronJobRun.create({
      data: { jobKey, triggeredBy, debugMode, status: 'RUNNING' },
    });

    const startedAt = Date.now();
    try {
      const { summary, debugLog, itemsProcessed, itemsFailed, status } = await this.execute(jobKey, debugMode);

      await this.prisma.client.cronJobRun.update({
        where: { id: run.id },
        data: {
          status,
          finishedAt: new Date(),
          durationMs: Date.now() - startedAt,
          summary,
          debugLog: debugMode ? (debugLog as object) : undefined,
          itemsProcessed,
          itemsFailed,
        },
      });

      if (status === 'FAILED') {
        await this.notify.notifyCronFailed(jobKey, summary ?? 'unknown error');
      }

      return this.prisma.client.cronJobRun.findUnique({ where: { id: run.id } });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      await this.prisma.client.cronJobRun.update({
        where: { id: run.id },
        data: { status: 'FAILED', finishedAt: new Date(), durationMs: Date.now() - startedAt, errorMessage },
      });
      await this.notify.notifyCronFailed(jobKey, errorMessage);
      throw err;
    }
  }

  private async execute(
    jobKey: JobKey,
    debugMode: boolean,
  ): Promise<{
    summary: string;
    debugLog?: unknown;
    itemsProcessed?: number;
    itemsFailed?: number;
    status: 'SUCCESS' | 'FAILED' | 'PARTIAL';
  }> {
    switch (jobKey) {
      case 'product_parser': {
        // За прямим запитом користувача — "добавить тайм менеджмент"
        // — явно передаємо бюджет тут (не покладаємось мовчки на
        // дефолт runAll()), синхронізовано з реальним HTTP-таймаутом
        // Vercel (300с) — 260с бюджету + 30с safety margin усередині
        // runAll() = 290с найгірший випадок, 10с запасу.
        const { results, vendorsSkippedDueToBudget, isComplete } = await this.parser.runAll(260_000);
        const totalCreated = results.reduce((s, r) => s + r.created, 0);
        const totalUpdated = results.reduce((s, r) => s + r.updated, 0);
        const failedVendors = results.filter((r) => r.error);
        return {
          summary: `${results.length} vendors: +${totalCreated} new, ${totalUpdated} updated, ${failedVendors.length} failed${vendorsSkippedDueToBudget.length > 0 ? `, ${vendorsSkippedDueToBudget.length} відкладено (бюджет часу)` : ''}${isComplete ? ' — усі вендори оброблені цього циклу' : ''}`,
          debugLog: debugMode ? { results, vendorsSkippedDueToBudget, isComplete } : undefined,
          itemsProcessed: totalCreated + totalUpdated,
          itemsFailed: failedVendors.length,
          status: failedVendors.length === 0 ? 'SUCCESS' : failedVendors.length === results.length ? 'FAILED' : 'PARTIAL',
        };
      }
      case 'article_parser': {
        // Знайдено 18.08.2026: попередня версія runParser() чекала
        // відповідь Grok синхронно (AbortError-таймаути на реальному
        // прогоні). За прямим запитом користувача — тепер лише подає
        // пачку до Grok Batch API й повертається одразу, без "translated"/
        // "failed" (результати з'являться пізніше, окремим джобом нижче).
        const result = await this.articles.runParser();
        return {
          summary: result.batchSubmitted
            ? `Found ${result.found}, created ${result.created}, batch ${result.xaiBatchId} submitted`
            : `Found ${result.found}, created ${result.created}, ${result.created > 0 ? `batch submission failed: ${result.batchError}` : 'no new articles'}`,
          debugLog: debugMode ? result : undefined,
          itemsProcessed: result.created,
          itemsFailed: result.created > 0 && !result.batchSubmitted ? result.created : 0,
          status: result.created === 0 || result.batchSubmitted ? 'SUCCESS' : 'FAILED',
        };
      }
      case 'article_batch_poll': {
        const result = await this.articles.processPendingBatches();
        return {
          summary: `${result.processed} batches processed (${result.translatedTotal} translations, ${result.failedTotal} failed), ${result.stillPending} still pending`,
          debugLog: debugMode ? result : undefined,
          itemsProcessed: result.translatedTotal,
          itemsFailed: result.failedTotal,
          status: result.failedTotal === 0 ? 'SUCCESS' : 'PARTIAL',
        };
      }
      case 'nova_poshta_directory_sync': {
        const result = await this.novaPoshta.syncDirectory();
        return {
          summary: `${result.cities} cities, ${result.warehouses} warehouses updated`,
          debugLog: debugMode ? result : undefined,
          itemsProcessed: result.cities + result.warehouses,
          status: 'SUCCESS',
        };
      }
      case 'nbu_rate_sync': {
        const usdRate = await this.currency.syncFromNbu('USD');
        // За реалізацією doc/TZ_ImportScout.md розділ 2.4/4 — без цього
        // виклику convertCnyToUsd() ЗАВЖДИ повертав би null (курс CNY
        // ніколи не з'явився б у ExchangeRate), фіча 1688 ніколи не
        // конвертувала б ціну автоматично. Той самий крон, не окремий
        // — синхронний виклик, коштує лише ще один HTTP-запит до НБУ.
        let cnySummary = '';
        try {
          const cnyRate = await this.currency.syncFromNbu('CNY');
          cnySummary = `, CNY rate: ${cnyRate.rateUah} UAH`;
        } catch (err) {
          cnySummary = `, CNY rate sync failed: ${err instanceof Error ? err.message : String(err)}`;
        }
        return {
          summary: `USD rate: ${usdRate.rateUah} UAH (${usdRate.rateDate.toISOString().slice(0, 10)})${cnySummary}`,
          debugLog: debugMode ? { usdRate, cnySummary } : undefined,
          itemsProcessed: 1,
          status: 'SUCCESS',
        };
      }
      case 'promo_recalc': {
        const result = await this.promo.recalculateAll();
        return {
          summary: `Recalculated pricing/promo for ${result.processed} products`,
          debugLog: debugMode ? result : undefined,
          itemsProcessed: result.processed,
          status: 'SUCCESS',
        };
      }
      case 'rate_limit_cleanup': {
        const deleted = await this.rateLimit.cleanupOlderThan(24);
        return { summary: `Deleted ${deleted} stale rate-limit entries`, itemsProcessed: deleted, status: 'SUCCESS' };
      }
      case 'financing_program_parser': {
        const result = await this.financing.runParser();
        return {
          summary: `Found ${result.found}, created ${result.created}, updated ${result.updated} (${result.changed.length} з реальними змінами умов, ${result.imagesBackfilled} картинок підтягнуто), flagged for recheck ${result.flaggedForRecheck}`,
          debugLog: debugMode ? result : undefined,
          itemsProcessed: result.created + result.updated,
          itemsFailed: result.errors.length,
          status: result.errors.length === 0 ? 'SUCCESS' : 'PARTIAL',
        };
      }
      case 'business_plan_batch_processor': {
        const result = await this.businessPlan.processQueue();
        return {
          summary: `Processed ${result.processed}, completed ${result.completed}, failed ${result.failed}`,
          debugLog: debugMode ? result : undefined,
          itemsProcessed: result.completed,
          itemsFailed: result.failed,
          status: result.failed === 0 ? 'SUCCESS' : result.completed === 0 && result.processed > 0 ? 'FAILED' : 'PARTIAL',
        };
      }
      case 'pvgis_country_grid': {
        const result = await this.solarMap.computeRawGridChunk();
        const permanentCount = result.failedPoints.filter((f) => f.permanent).length;
        const failedSummary = result.failedPoints.length > 0
          ? ` — упали: ${result.failedPoints.map((f) => `(${f.lat},${f.lng})${f.permanent ? ' [поза покриттям]' : ''}: ${f.diagnostic}`).join('; ')}`
          : '';
        return {
          summary: `+${result.newlyComputed} нових точок за ${Math.round(result.elapsedMs / 1000)}с, прогрес ${result.progressPercent}% (${result.totalPoints - result.remainingPoints}/${result.totalPoints}), лишилось ${result.remainingPoints}${permanentCount > 0 ? ` (з них ${permanentCount} поза покриттям PVGIS назавжди)` : ''}${result.isComplete ? ' — ПОВНІСТЮ ЗІБРАНО' : ''}${failedSummary}`,
          debugLog: debugMode ? result : undefined,
          itemsProcessed: result.newlyComputed,
          itemsFailed: result.newlyFailed,
          status: 'SUCCESS',
        };
      }
      case 'product_review_parser': {
        const result = await this.productReviewImport.runImport();
        const noAdapterSummary =
          result.vendorsWithNoAdapter.length > 0 ? `, без адаптера: ${result.vendorsWithNoAdapter.join(', ')}` : '';
        const timeBudgetSummary =
          result.listingsSkippedByTimeBudget > 0
            ? ` — зупинено по тайм-бюджету (${Math.round(result.elapsedMs / 1000)}с), лишилось ${result.listingsSkippedByTimeBudget} листингів на наступний прогін`
            : '';
        return {
          summary: `Перевірено ${result.productsChecked} товарів (${result.listingsChecked} листингів), знайдено ${result.reviewsFound} відгуків, створено ${result.reviewsCreated} нових${noAdapterSummary}${timeBudgetSummary}`,
          debugLog: debugMode ? result : undefined,
          itemsProcessed: result.reviewsCreated,
          itemsFailed: 0,
          status: 'SUCCESS',
        };
      }
      default:
        return { summary: `Unknown jobKey: ${jobKey}`, status: 'FAILED' };
    }
  }
}
