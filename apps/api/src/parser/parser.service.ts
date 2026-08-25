import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AdapterRegistry } from './adapter-registry';
import { MatchingService } from './matching.service';
import { ProductPricingService } from '../products/product-pricing.service';
import type { RawListing } from './adapter.interface';

export interface ParserRunResult {
  vendorName: string;
  fetched: number;
  created: number;
  updated: number;
  priceChanged: number;
  stockChanged: number;
  matchAttempted: number;
  error?: string;
}

@Injectable()
export class ParserService {
  private readonly logger = new Logger(ParserService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly registry: AdapterRegistry,
    private readonly matching: MatchingService,
    private readonly pricing: ProductPricingService,
  ) {}

  // За прямим запитом користувача — "менеджмент времени... 200 секунд,
  // идемпотентный крон и тд как с данными PVGIS". На відміну від PVGIS
  // (точка-за-точкою резюмовність), тут granularity — ЦІЛИЙ вендор за
  // раз: fetchListings() у кожного адаптера виконує ВСЮ роботу (усі
  // сторінки, усі категорії) за один виклик, нема проміжного cursor'а
  // для паузи на середині — переписувати ISourceAdapter під
  // сторінка-за-сторінкою резюмовність вийшло б за межі цього запиту.
  // Замість цього: вендори сортуються по lastFullyParsedAt (найдавніше
  // оброблений/ще ніколи не оброблений — першим), обробляються по
  // одному, поки не вичерпається бюджет часу — той самий природний
  // "кеш і є прогресом" принцип, що вже в SolarYieldEstimate, тут через
  // Vendor.lastFullyParsedAt.
  async runAll(timeBudgetMs = 260_000): Promise<{ results: (ParserRunResult & { isComplete?: boolean })[]; vendorsSkippedDueToBudget: string[]; isComplete: boolean }> {
    const startedAt = Date.now();
    // За прямим запитом користувача — "добавить тайм менеджмент"
    // (повторний запит на РЕАЛЬНИЙ production-збій: попередній фікс
    // тайм-боксував лише фазу СКРЕЙПІНГУ — ОБРОБКА зібраних даних
    // (upsert + matching engine, мінімум 2-3 послідовних DB-запити на
    // кожен listing через Supabase-пулер) НЕ мала жодного бюджету
    // взагалі, для сотень listings легко сумувалась у десятки-сотні
    // секунд ПОНАД уже витрачений на скрейпінг час). Тепер ОДИН
    // спільний дедлайн на ОБИДВІ фази (не окремі бюджети для кожної)
    // — і адаптер (збір), і runForVendor() (обробка) перевіряють той
    // самий deadlineAt, що обчислюється ОДИН раз тут.
    const SAFETY_MARGIN_MS = 30_000;
    const deadlineAt = startedAt + timeBudgetMs - SAFETY_MARGIN_MS;

    const neverParsed = await this.prisma.client.vendor.findMany({
      where: { isActive: true, lastFullyParsedAt: null },
      orderBy: { createdAt: 'asc' },
    });
    const previouslyParsed = await this.prisma.client.vendor.findMany({
      where: { isActive: true, lastFullyParsedAt: { not: null } },
      orderBy: { lastFullyParsedAt: 'asc' },
    });
    const orderedVendors = [...neverParsed, ...previouslyParsed];

    const results: (ParserRunResult & { isComplete?: boolean })[] = [];
    const vendorsSkippedDueToBudget: string[] = [];

    for (const vendor of orderedVendors) {
      if (Date.now() >= deadlineAt) {
        vendorsSkippedDueToBudget.push(vendor.name);
        continue;
      }

      const adapter = this.registry.getByVendorName(vendor.name);
      if (!adapter) continue; // поставщик заведён в БД, но адаптер ещё не реализован — пропускаем, не роняем весь прогон

      console.log(`[ParserService] Обробляю вендора "${vendor.name}"...`);
      try {
        const { listings, isComplete: scrapeComplete } = await adapter.fetchListings(deadlineAt);
        const vendorResult = await this.runForVendor(vendor.id, adapter.vendorName, listings, deadlineAt);
        results.push(vendorResult);
        // lastFullyParsedAt оновлюється ЛИШЕ якщо ОБИДВІ фази (і
        // скрейпінг, і обробка) реально завершились повністю —
        // часткові дані вже збережені (ідемпотентно, upsert по
        // sourceUrl), АЛЕ вендор лишається "не до кінця обробленим" і
        // знову буде першим у черзі наступного прогону (ordered by
        // lastFullyParsedAt).
        const isVendorComplete = scrapeComplete && vendorResult.isComplete;
        if (isVendorComplete) {
          await this.prisma.client.vendor.update({ where: { id: vendor.id }, data: { lastFullyParsedAt: new Date() } });
        } else {
          console.log(`[ParserService] "${vendor.name}": бюджет часу вичерпано (${!scrapeComplete ? 'на скрейпінгу' : 'на обробці'}), зібрано ${listings.length} позицій — продовжимо з початку наступного разу.`);
          vendorsSkippedDueToBudget.push(vendor.name);
          // Час уже вичерпано — йти далі по решті вендорів цього
          // прогону немає сенсу, весь бюджет витрачено. Явно
          // позначаємо ВСІХ, хто ще не встиг навіть почати цього
          // прогону — інакше vendorsSkippedDueToBudget був би
          // неповним для діагностики (хоча загальний isComplete
          // флаг і так коректний завдяки одному запису вище).
          const remainingVendorNames = orderedVendors
            .slice(orderedVendors.indexOf(vendor) + 1)
            .map((v) => v.name);
          vendorsSkippedDueToBudget.push(...remainingVendorNames);
          break;
        }
      } catch (err) {
        this.logger.error(`Adapter ${vendor.name} failed`, err as Error);
        results.push({
          vendorName: vendor.name,
          fetched: 0,
          created: 0,
          updated: 0,
          priceChanged: 0,
          stockChanged: 0,
          matchAttempted: 0,
          error: err instanceof Error ? err.message : String(err),
        });
        // Помилка адаптера — все одно позначаємо lastFullyParsedAt, щоб
        // вендор, що постійно падає, не блокував чергу назавжди попереду
        // решти (той самий вендор просто спробується знову в СВОЮ чергу
        // наступного разу, не одразу).
        await this.prisma.client.vendor.update({ where: { id: vendor.id }, data: { lastFullyParsedAt: new Date() } });
      }
    }

    const isComplete = vendorsSkippedDueToBudget.length === 0;
    console.log(`[ParserService] Завершено: ${results.length} вендорів оброблено за ${Math.round((Date.now() - startedAt) / 1000)}с${vendorsSkippedDueToBudget.length > 0 ? `, ${vendorsSkippedDueToBudget.length} відкладено на наступний прогін (бюджет часу)` : ''}.`);

    return { results, vendorsSkippedDueToBudget, isComplete };
  }

  private async runForVendor(
    vendorId: string,
    vendorName: string,
    rawListings: RawListing[],
    deadlineAt: number,
  ): Promise<ParserRunResult & { isComplete: boolean }> {
    let created = 0;
    let updated = 0;
    let priceChanged = 0;
    let stockChanged = 0;
    let matchAttempted = 0;

    for (const raw of rawListings) {
      // За прямим запитом користувача — "добавить тайм менеджмент"
      // (повторний запит на РЕАЛЬНИЙ production-збій: попередній фікс
      // тайм-боксував лише фазу СКРЕЙПІНГУ, АЛЕ ОБРОБКА зібраних даних
      // тут — мінімум 2-3 послідовних DB-запити на кожен listing
      // (Supabase через пулер, кожен запит окремий мережевий round-
      // trip) + matching engine — для сотень listings легко сумується
      // у десятки-сотні секунд ПОНАД уже витрачений на скрейпінг час.
      // Один спільний дедлайн на ОБИДВІ фази (не окремі бюджети) —
      // перевіряється тут так само, як усередині кожного адаптера.
      if (Date.now() >= deadlineAt) {
        return { vendorName, fetched: rawListings.length, created, updated, priceChanged, stockChanged, matchAttempted, isComplete: false };
      }

      const existing = await this.prisma.client.sourceListing.findUnique({
        where: { vendorId_sourceUrl: { vendorId, sourceUrl: raw.sourceUrl } },
      });

      const now = new Date();
      const rate = await this.prisma.client.exchangeRate.findFirst({
        where: { currency: raw.rawCurrency === 'UAH' ? 'USD' : raw.rawCurrency },
        orderBy: { rateDate: 'desc' },
      });
      const priceUsd = rate ? raw.rawPrice / Number(rate.rateUah) : raw.rawPrice;

      if (!existing) {
        const listing = await this.prisma.client.sourceListing.create({
          data: {
            vendorId,
            sourceUrl: raw.sourceUrl,
            sourceSku: raw.sourceSku,
            rawTitle: raw.rawTitle,
            rawCategory: raw.rawCategory,
            siteCategoryLabel: raw.siteCategoryLabel,
            rawPrice: raw.rawPrice,
            rawCurrency: raw.rawCurrency,
            priceUsd,
            priceRateDate: rate?.rateDate,
            priceCheckedAt: now,
            priceChangedAt: now,
            inStock: raw.inStock,
            stockCheckedAt: now,
            stockChangedAt: now,
            images: raw.images,
            firstSeenAt: now,
            lastParsedAt: now,
          },
        });
        await this.prisma.client.priceHistoryEntry.create({
          data: { sourceListingId: listing.id, priceUsd, inStock: raw.inStock },
        });
        created++;
        await this.matching.matchListing(listing.id);
        matchAttempted++;
        continue;
      }

      // ТЗ п.13.5: priceCheckedAt/stockCheckedAt обновляются ВСЕГДА при
      // успешном парсинге, priceChangedAt/stockChangedAt — только при
      // реальном изменении значения.
      const priceHasChanged = Number(existing.priceUsd) !== priceUsd;
      const stockHasChanged = existing.inStock !== raw.inStock;

      await this.prisma.client.sourceListing.update({
        where: { id: existing.id },
        data: {
          rawTitle: raw.rawTitle,
          siteCategoryLabel: raw.siteCategoryLabel,
          rawPrice: raw.rawPrice,
          priceUsd,
          priceRateDate: rate?.rateDate,
          priceCheckedAt: now,
          priceChangedAt: priceHasChanged ? now : undefined,
          inStock: raw.inStock,
          stockCheckedAt: now,
          stockChangedAt: stockHasChanged ? now : undefined,
          images: raw.images,
          lastParsedAt: now,
        },
      });

      if (priceHasChanged || stockHasChanged) {
        await this.prisma.client.priceHistoryEntry.create({
          data: { sourceListingId: existing.id, priceUsd, inStock: raw.inStock },
        });
        priceChanged += priceHasChanged ? 1 : 0;
        stockChanged += stockHasChanged ? 1 : 0;

        const link = await this.prisma.client.productListing.findFirst({ where: { sourceListingId: existing.id } });
        if (link) {
          // Листинг уже привязан к канону — просто пересчитать кэш цены/
          // наличия товара (matching.matchListing() тут не нужен, он для
          // ещё непривязанных листингов).
          await this.pricing.recalculate(link.productId);
        } else {
          await this.matching.matchListing(existing.id);
        }
      }

      updated++;
    }

    return { vendorName, fetched: rawListings.length, created, updated, priceChanged, stockChanged, matchAttempted, isComplete: true };
  }
}
