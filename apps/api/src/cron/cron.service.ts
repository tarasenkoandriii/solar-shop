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
import { ProductImageMirrorService } from '../parser/product-image-mirror.service';

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
  | 'product_review_parser'
  | 'product_image_mirror';

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
  {
    jobKey: 'product_image_mirror',
    // За прямим запитом користувача — "полностью сделай через блоб".
    // Картинки товарів приходять з доменів постачальників, а next/image
    // пропускає лише домени з images.remotePatterns — звідси биті іконки
    // в каталозі. Джоб поступово переносить фото на Vercel Blob (він у
    // allowlist), після чого оптимізація вмикається сама.
    //
    // ОКРЕМИЙ джоб, а не частина product_parser: завантаження файлу
    // коштує на порядок більше за запит до БД, а парсер і без того ледве
    // вкладався в ліміт Vercel. Розклад — раз у декілька хвилин, поки
    // черга не спорожніє; далі ідемпотентно нічого не робить.
    description: 'Перенесення картинок товарів із сайтів постачальників на Vercel Blob (дедуплікація за оригінальним URL) — тайм-боксовано ~200с, решта лишається на наступний прогін',
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
    private readonly productImageMirror: ProductImageMirrorService,
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
        // Окремі позиції тепер можуть впасти, не роняючи вендора
        // (ParserService.runForVendor ізолює їх). Якщо не підняти цей
        // лічильник сюди, прогін, де мовчки загубилась половина товарів,
        // виглядав би в історії як бездоганний SUCCESS.
        const totalFailedListings = results.reduce((sum, r) => sum + (r.failed ?? 0), 0);
        // Пропущені позиції — не помилки, але й не робота: найчастіше це
        // відсутній курс валют, тобто каталог тихо не оновлюється.
        const totalSkippedListings = results.reduce((sum, r) => sum + (r.skipped ?? 0), 0);
        return {
          summary: `${results.length} vendors: +${totalCreated} new, ${totalUpdated} updated, ${failedVendors.length} vendors failed${totalFailedListings > 0 ? `, ${totalFailedListings} позицій з помилкою` : ''}${totalSkippedListings > 0 ? `, ${totalSkippedListings} пропущено (курс/ціна)` : ''}${vendorsSkippedDueToBudget.length > 0 ? `, ${vendorsSkippedDueToBudget.length} відкладено (бюджет часу)` : ''}${isComplete ? ' — усі вендори оброблені цього циклу' : ''}`,
          debugLog: debugMode ? { results, vendorsSkippedDueToBudget, isComplete } : undefined,
          itemsProcessed: totalCreated + totalUpdated,
          // Вендор, у якого впали ВСІ позиції, отримує ще й error — без
          // цієї поправки він рахувався б і як один провалений вендор, і
          // як 184 проваленi позиції одночасно.
          itemsFailed: totalFailedListings + failedVendors.filter((r) => !r.failed).length,
          status:
            failedVendors.length === 0 && totalFailedListings === 0 && totalSkippedListings === 0
              ? 'SUCCESS'
              : failedVendors.length === results.length
                ? 'FAILED'
                : 'PARTIAL',
        };
      }
      case 'article_parser': {
        // Знайдено 18.08.2026: попередня версія runParser() чекала
        // відповідь Grok синхронно (AbortError-таймаути на реальному
        // прогоні). За прямим запитом користувача — тепер лише подає
        // пачку до Grok Batch API й повертається одразу, без "translated"/
        // "failed" (результати з'являться пізніше, окремим джобом нижче).
        // Той самий бюджет, що й у решти тайм-боксованих джобів.
        const result = await this.articles.runParser(200_000);
        const unrepairable = await this.articles.countUnrepairableArticles().catch(() => 0);
        const retrySummary = result.orphanRetries > 0 ? `, повторно замовлено ${result.orphanRetries} статей` : '';
        const budgetSummary = result.itemsSkippedByTimeBudget > 0 ? `, ${result.itemsSkippedByTimeBudget} відкладено (бюджет часу)` : '';
        const unrepairableSummary = unrepairable > 0 ? `, ${unrepairable} остаточно без перекладу (ремонт неможливий)` : '';
        // Пачка тепер містить не лише нові статті, а й повторні
        // замовлення для тих, чия попередня пачка не відпрацювала. Тому
        // успіх НЕ можна визначати по `created`: нічний прогін без
        // новин, який переотправив 10 статей і отримав відмову від xAI,
        // раніше відзвітував би "no new articles" зі статусом SUCCESS —
        // тобто повністю провалений ремонт був невидимий.
        const ordered = result.created + result.orphanRetries;
        const submitFailed = ordered > 0 && !result.batchSubmitted;
        return {
          summary: result.batchSubmitted
            ? `Found ${result.found}, created ${result.created}, batch ${result.xaiBatchId} submitted${retrySummary}${budgetSummary}${unrepairableSummary}`
            : `Found ${result.found}, created ${result.created}${retrySummary}, ${ordered > 0 ? `batch submission failed: ${result.batchError}` : 'no new articles'}${budgetSummary}${unrepairableSummary}`,
          debugLog: debugMode ? result : undefined,
          // Повторні замовлення — теж виконана робота, інакше вдалий
          // ремонтний прогін звітував би нулем оброблених.
          itemsProcessed: ordered,
          itemsFailed: submitFailed ? ordered : 0,
          status: ordered === 0 || result.batchSubmitted ? 'SUCCESS' : 'FAILED',
        };
      }
      case 'article_batch_poll': {
        const result = await this.articles.processPendingBatches();
        // givenUp — пачки, які визнані безнадійними і більше не
        // опитуються. Це не рядова помилка окремого перекладу: показуємо
        // окремо, інакше зникнення пачки виглядало б як тиша.
        const givenUpSummary = result.givenUp > 0 ? `, ${result.givenUp} пачок визнано невдалими і знято з опитування` : '';
        return {
          summary: `${result.processed} batches processed (${result.translatedTotal} translations, ${result.failedTotal} failed), ${result.stillPending} still pending${givenUpSummary}`,
          debugLog: debugMode ? result : undefined,
          itemsProcessed: result.translatedTotal,
          itemsFailed: result.failedTotal + result.givenUp,
          status: result.failedTotal === 0 && result.givenUp === 0 ? 'SUCCESS' : 'PARTIAL',
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
        // Той самий бюджет, що й у решти тайм-боксованих джобів: 200с
        // роботи + запас до ліміту функції.
        const result = await this.businessPlan.processQueue(200_000);
        const recoveredSummary = result.recovered > 0 ? `, ${result.recovered} повернуто з зависання` : '';
        const skippedSummary = result.skipped > 0 ? `, ${result.skipped} відкладено (бюджет часу)` : '';
        return {
          summary: `Processed ${result.processed}, completed ${result.completed}, failed ${result.failed}${recoveredSummary}${skippedSummary}`,
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
        // АУДИТ 29.08.2026 — у зведенні бракувало найголовнішого для
        // користувача: чи оновилась ПУБЛІЧНА карта. Було видно лише
        // "ПОВНІСТЮ ЗІБРАНО" про сирі точки, тоді як сайт паралельно
        // писав "Дані сітки ще не розраховані" — і зі звіту джоба
        // неможливо було зрозуміти, що це різні речі.
        // 'failed' МУСИТЬ бути видно в зведенні й у статусі: сирі точки
        // зібрані, а публічна карта лишилась старою — це саме та тиха
        // розбіжність, з якої почалась ця правка.
        const mapSummary =
          result.interpolation.status === 'rebuilt'
            ? `, карту перебудовано (${result.interpolation.cells} клітинок)`
            : result.interpolation.status === 'failed'
              ? `, УВАГА: карту перебудувати НЕ вдалось (${result.interpolation.error}) — сайт показує стару сітку`
              : '';
        return {
          summary: `+${result.newlyComputed} нових точок за ${Math.round(result.elapsedMs / 1000)}с, прогрес ${result.progressPercent}% (${result.totalPoints - result.remainingPoints}/${result.totalPoints}), лишилось ${result.remainingPoints}${permanentCount > 0 ? ` (з них ${permanentCount} поза покриттям PVGIS назавжди)` : ''}${result.isComplete ? ' — ПОВНІСТЮ ЗІБРАНО' : ''}${mapSummary}${failedSummary}`,
          debugLog: debugMode ? result : undefined,
          itemsProcessed: result.newlyComputed,
          itemsFailed: result.newlyFailed,
          status: result.interpolation.status === 'failed' ? 'PARTIAL' : 'SUCCESS',
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
      case 'product_image_mirror': {
        const r = await this.productImageMirror.runMirror(200_000);
        if (r.skippedReason) {
          // Сховище не налаштоване — це НЕ помилка прогону: картинки
          // працюють на прямих посиланнях. Але й SUCCESS писати не можна,
          // інакше "нічого не зроблено" виглядало б як "все готово".
          return {
            summary: `Пропущено: ${r.skippedReason} У черзі ${r.pending} картинок.`,
            debugLog: debugMode ? r : undefined,
            itemsProcessed: 0,
            itemsFailed: 0,
            status: r.pending === 0 ? 'SUCCESS' : 'PARTIAL',
          };
        }
        const dedupSummary = r.deduped > 0 ? `, ${r.deduped} перевикористано вже завантажених` : '';
        const givenUpSummary = r.givenUp > 0 ? `, ${r.givenUp} остаточно лишились на прямому посиланні` : '';
        return {
          summary: `Перенесено на Blob ${r.mirrored} картинок${dedupSummary} за ${Math.round(r.elapsedMs / 1000)}с${givenUpSummary}${r.remaining > 0 ? `, лишилось ${r.remaining} на наступний прогін` : ' — черга порожня'}`,
          debugLog: debugMode ? r : undefined,
          itemsProcessed: r.mirrored + r.deduped,
          itemsFailed: r.failed,
          status: r.failed === 0 ? 'SUCCESS' : r.mirrored + r.deduped === 0 ? 'FAILED' : 'PARTIAL',
        };
      }
      default:
        return { summary: `Unknown jobKey: ${jobKey}`, status: 'FAILED' };
    }
  }
}
