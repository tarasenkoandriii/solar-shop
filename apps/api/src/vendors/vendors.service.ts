import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { GrokService } from '../grok/grok.service';
import { AdapterRegistry } from '../parser/adapter-registry';
import { CreateVendorDto, UpdateVendorDto } from './dto/vendor.dto';

// За запитом користувача — "не має сенсу робити фізичне поле БД" —
// статус парсера рахується наживо при кожному відкритті /admin/vendors,
// не зберігається окремою колонкою на Vendor.
const PARSER_FRESHNESS_WINDOW_MS = 48 * 60 * 60 * 1000; // 48 годин — той самий орієнтир, що вже застосований для Google News sitemap (розділ 28), узгоджено з очікуваною добовою частотою product_parser

export type ParserStatus = 'NOT_WRITTEN' | 'WORKING' | 'NEEDS_DEBUG';

// Поставщики (ТЗ п.13.1/25.4) — НЕ производитель (Manufacturer). Публично
// имя поставщика не показывается (п.25.3), только в админке.
@Injectable()
export class VendorsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly grok: GrokService,
    private readonly adapterRegistry: AdapterRegistry,
  ) {}

  // Обчислюється на льоту при кожному виклику (не фізичне поле БД, за
  // прямим запитом користувача):
  // - NOT_WRITTEN — для цього Vendor.name немає реалізації ISourceAdapter
  //   у AdapterRegistry (нові ІІ-знайдені постачальники, seed-вендор,
  //   вручну додані без коду адаптера)
  // - WORKING — адаптер є, і є хоч один SourceListing із lastParsedAt у
  //   межах останніх 48 годин (реальний слід того, що парсер недавно
  //   успішно доторкнувся до цього постачальника)
  // - NEEDS_DEBUG — адаптер є, але жодного свіжого SourceListing немає
  //   (або взагалі жодного, або всі застарілі) — сигнал, що останні
  //   прогони або падають, або перестали знаходити товари
  async findAll() {
    const vendors = await this.prisma.client.vendor.findMany({ orderBy: { name: 'asc' } });
    const cutoff = new Date(Date.now() - PARSER_FRESHNESS_WINDOW_MS);

    return Promise.all(
      vendors.map(async (v) => {
        const hasAdapter = !!this.adapterRegistry.getByVendorName(v.name);
        if (!hasAdapter) {
          return { ...v, parserStatus: 'NOT_WRITTEN' as ParserStatus };
        }

        const recentListing = await this.prisma.client.sourceListing.findFirst({
          where: { vendorId: v.id, lastParsedAt: { gte: cutoff } },
          select: { id: true },
        });

        return { ...v, parserStatus: (recentListing ? 'WORKING' : 'NEEDS_DEBUG') as ParserStatus };
      }),
    );
  }

  // За запитом користувача — ІІ-пошук нових постачальників, крім
  // ручного додавання. excludeNames рахується тут (не на фронті), щоб
  // завжди бути актуальним на момент пошуку.
  async searchCandidates(country: string, category?: string, city?: string) {
    const existing = await this.prisma.client.vendor.findMany({ select: { name: true } });
    const excludeNames = existing.map((v) => v.name);
    const result = await this.grok.searchVendorCandidates(country, category, city, excludeNames);
    if ('error' in result) return { vendors: [], error: result.error };

    // Додатковий захист: навіть якщо ІІ проігнорував excludeNames у
    // промпті — відфільтровуємо збіги по домену тут, детерміновано.
    const existingWebsites = new Set(
      (await this.prisma.client.vendor.findMany({ select: { website: true } })).map((v) => normalizeHost(v.website)),
    );
    const filtered = result.filter((v) => !existingWebsites.has(normalizeHost(v.website)));

    return { vendors: filtered, error: null };
  }

  async estimateCatalog(website: string) {
    const result = await this.grok.estimateVendorCatalog(website);
    if ('error' in result) return { estimatedProductCount: null, categories: [], notes: result.error };
    return result;
  }

  create(dto: CreateVendorDto) {
    return this.prisma.client.vendor.create({
      data: {
        ...dto,
        contractStatus: dto.contractStatus ?? 'NOT_CONTACTED',
        contractSignedAt: dto.contractStatus === 'SIGNED' ? new Date() : undefined,
      },
    });
  }

  async update(id: string, dto: UpdateVendorDto) {
    const existing = await this.getOr404(id);
    return this.prisma.client.vendor.update({
      where: { id },
      data: {
        ...dto,
        contractSignedAt:
          dto.contractStatus === 'SIGNED' && existing.contractStatus !== 'SIGNED'
            ? new Date()
            : undefined,
      },
    });
  }

  async remove(id: string) {
    await this.getOr404(id);
    await this.prisma.client.vendor.delete({ where: { id } });
    return { ok: true };
  }

  private async getOr404(id: string) {
    const vendor = await this.prisma.client.vendor.findUnique({ where: { id } });
    if (!vendor) throw new NotFoundException('Vendor not found');
    return vendor;
  }
}

function normalizeHost(url: string): string {
  return url
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .replace(/\/$/, '');
}
