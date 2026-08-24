import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { GrokService } from '../grok/grok.service';
import { CurrencyService } from '../currency/currency.service';
import { RateLimitService } from '../rate-limit/rate-limit.service';

// За прямим запитом користувача — реалізація doc/TZ_ImportScout.md.
// Регулярні вирази на КОНКРЕТНУ сторінку товару (не категорію/пошук)
// — по одному на кожне джерело (ТЗ розділ 4/5). Перевірено проти
// реальних посилань, знайдених під час написання самого ТЗ (розділ
// 2.2/2.4 документа):
//   AliExpress: https://www.aliexpress.com/item/1005004348343905.html
//   Alibaba:    https://www.alibaba.com/product-detail/450-Watts-Solar-Panel-Mono-48v_1601016336331.html
//   1688:       https://detail.1688.com/offer/655278011200.html
const URL_PATTERNS: Record<string, RegExp> = {
  ALIEXPRESS: /aliexpress\.com\/item\/\d+\.html/i,
  ALIBABA: /alibaba\.com\/product-detail\/[\w-]+_\d+\.html/i,
  '1688': /1688\.com\/offer\/\d+\.html/i,
};

const CATEGORY_LABEL: Record<string, string> = {
  SOLAR_PANEL: 'сонячна панель',
  BATTERY: 'акумулятор',
  CONTROLLER: 'контролер заряду',
  INVERTER: 'інвертор',
  CABLE: 'кабель',
  CONNECTOR: 'конектор',
};

@Injectable()
export class ImportScoutService {
  private readonly logger = new Logger(ImportScoutService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly grok: GrokService,
    private readonly currency: CurrencyService,
    private readonly rateLimit: RateLimitService,
  ) {}

  // За прямим запитом користувача — ТЗ розділ 5: "не частіше 1 запиту
  // на товар на годину, щоб випадкове подвійне натискання не
  // подвоювало витрати" (пошук через Grok API коштує грошей).
  async searchForProduct(productId: string, requestedByUserId: string) {
    const product = await this.prisma.client.product.findUnique({ where: { id: productId } });
    if (!product) throw new NotFoundException('Product not found');

    // ТЗ розділ 5 — "не частіше 1 запиту на товар на годину". Метод
    // сам кидає HttpException(429) при перевищенні (RateLimitService,
    // той самий патерн, що вже скрізь у проєкті) — не перехоплюється
    // тут навмисно: НЕ підміняти семантично коректний 429 на щось
    // інше, нехай пробрасується як є.
    await this.rateLimit.checkAndIncrement(`import-scout:${productId}`, 1, 3600);

    const specs = (product.specs as Record<string, unknown>) ?? {};
    const keySpecsText = Object.entries(specs)
      .filter(([, v]) => v !== null && v !== undefined && v !== '')
      .map(([k, v]) => `${k}: ${v}`)
      .join(', ');

    const offers = await this.grok.searchImportOffers(
      {
        productName: `${CATEGORY_LABEL[product.category] ?? product.category} ${product.name}`,
        brand: null, // Product не має окремого поля бренду тут — назва вже містить бренд у більшості записів каталогу
        model: product.manufacturerSku,
        keySpecs: keySpecsText || 'немає додаткових специфікацій',
      },
      requestedByUserId,
    );

    if ('error' in offers) {
      this.logger.warn(`Import scout search failed for product ${productId}: ${offers.error}`);
      return { error: offers.error, results: [] };
    }

    const created: Awaited<ReturnType<typeof this.prisma.client.importScoutResult.create>>[] = [];
    for (const offer of offers) {
      const pattern = URL_PATTERNS[offer.source];
      const urlVerified = pattern ? pattern.test(offer.sourceUrl) : false;

      // ТЗ розділ 2.4/4 — конвертація CNY→USD детермінованим кроком
      // бекенду (не покладається на LLM для валютного розрахунку).
      let priceMinUsd = offer.priceMinUsd;
      let priceMaxUsd = offer.priceMaxUsd;
      if (offer.source === '1688' && offer.priceRawCny !== null && priceMinUsd === null) {
        const converted = await this.currency.convertCnyToUsd(offer.priceRawCny);
        if (converted !== null) {
          priceMinUsd = converted;
          priceMaxUsd = converted;
        }
        // Якщо converted === null (курс CNY ще не синхронізовано) —
        // priceMinUsd/priceMaxUsd лишаються null, не абсурдне число.
        // UI показує priceRawCny як є (розділ 6 ТЗ).
      }

      const row = await this.prisma.client.importScoutResult.create({
        data: {
          productId,
          source: offer.source,
          title: offer.title,
          priceRawCny: offer.priceRawCny,
          priceMinUsd,
          priceMaxUsd,
          moq: offer.moq,
          sourceUrl: offer.sourceUrl,
          urlVerified,
          supplierName: offer.supplierName,
          supplierYearsOnPlatform: offer.supplierYearsOnPlatform,
          ourCostPriceUsdSnapshot: product.cachedCostPriceUsd,
          requestedBy: requestedByUserId,
        },
      });
      created.push(row);
    }

    return { error: null, results: created };
  }

  // Історія попередніх пошуків для товару — читання без нового
  // запиту до Grok (ТЗ розділ 6 — картки попередніх результатів).
  async getResultsForProduct(productId: string) {
    return this.prisma.client.importScoutResult.findMany({
      where: { productId },
      orderBy: { foundAt: 'desc' },
    });
  }
}
