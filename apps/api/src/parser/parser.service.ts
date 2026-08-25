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
  async runAll(timeBudgetMs = 200_000): Promise<{ results: ParserRunResult[]; vendorsSkippedDueToBudget: string[]; isComplete: boolean }> {
    const startedAt = Date.now();
    // Найгірший випадок одного вендора — важко оцінити наперед (залежить
    // від кількості товарів на сайті, вже і так time-boxed запитами
    // всередині fetchCategoryPageHtml — timeoutMs:15_000, retries:2), тому
    // запас тут щедріший, ніж для одиночного PVGIS-виклику: 30с — час на
    // "долити" вже розпочатий вендор, не переривати його жорстко на
    // півдорозі (недороблений вендор просто спробується знову наступного
    // разу, ідемпотентно, не втрачаючи вже збереного).
    const SAFETY_MARGIN_MS = 30_000;

    const neverParsed = await this.prisma.client.vendor.findMany({
      where: { isActive: true, lastFullyParsedAt: null },
      orderBy: { createdAt: 'asc' },
    });
    const previouslyParsed = await this.prisma.client.vendor.findMany({
      where: { isActive: true, lastFullyParsedAt: { not: null } },
      orderBy: { lastFullyParsedAt: 'asc' },
    });
    const orderedVendors = [...neverParsed, ...previouslyParsed];

    const results: ParserRunResult[] = [];
    const vendorsSkippedDueToBudget: string[] = [];

    for (const vendor of orderedVendors) {
      if (Date.now() - startedAt > timeBudgetMs - SAFETY_MARGIN_MS) {
        vendorsSkippedDueToBudget.push(vendor.name);
        continue;
      }

      const adapter = this.registry.getByVendorName(vendor.name);
      if (!adapter) continue; // поставщик заведён в БД, но адаптер ещё не реализован — пропускаем, не роняем весь прогон

      console.log(`[ParserService] Обробляю вендора "${vendor.name}"...`);
      try {
        // За прямим запитом користувача — "добавить тайм менеджмент и
        // сделать идемпотентным" (повторний запит на РЕАЛЬНИЙ прогін,
        // де sunshop.com.ua завис довше за весь HTTP-таймаут Vercel,
        // 300с — попередня тайм-боксація МІЖ вендорами не рятувала від
        // зависання ВСЕРЕДИНІ одного). Дедлайн — залишок ЗАГАЛЬНОГО
        // бюджету цього прогону, не фіксоване число — якщо на цього
        // вендора лишилось мало часу, адаптер сам це побачить і
        // перерве обхід рано, повернувши часткові дані.
        const deadlineAt = startedAt + timeBudgetMs - SAFETY_MARGIN_MS;
        const { listings, isComplete } = await adapter.fetchListings(deadlineAt);
        results.push(await this.runForVendor(vendor.id, adapter.vendorName, listings));
        // lastFullyParsedAt оновлюється ЛИШЕ якщо адаптер реально
        // завершив обхід усіх категорій/сторінок — часткові дані вже
        // збережені (ідемпотентно, upsert по sourceUrl), АЛЕ вендор
        // лишається "не до кінця обробленим" і знову буде першим у
        // черзі наступного прогону (ordered by lastFullyParsedAt).
        if (isComplete) {
          await this.prisma.client.vendor.update({ where: { id: vendor.id }, data: { lastFullyParsedAt: new Date() } });
        } else {
          console.log(`[ParserService] "${vendor.name}": бюджет часу вичерпано під час обходу, зібрано ${listings.length} позицій — продовжимо з початку наступного разу.`);
          vendorsSkippedDueToBudget.push(vendor.name);
          // Час на ЦЬОГО вендора вже вичерпано — йти далі по решті
          // вендорів цього прогону немає сенсу, весь бюджет витрачено.
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

  private async runForVendor(vendorId: string, vendorName: string, rawListings: RawListing[]): Promise<ParserRunResult> {
    let created = 0;
    let updated = 0;
    let priceChanged = 0;
    let stockChanged = 0;
    let matchAttempted = 0;

    for (const raw of rawListings) {
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

    return { vendorName, fetched: rawListings.length, created, updated, priceChanged, stockChanged, matchAttempted };
  }
}
