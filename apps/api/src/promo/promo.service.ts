import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ProductPricingService } from '../products/product-pricing.service';
import { UpsertPromoSettingsDto } from './dto/promo-settings.dto';

// Вкладка «Акции» (ТЗ п.18.3) — порог + список товаров сейчас в акции.
@Injectable()
export class PromoService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly pricing: ProductPricingService,
  ) {}

  getSettings() {
    return this.prisma.client.promoSettings.findMany();
  }

  async upsertSettings(dto: UpsertPromoSettingsDto) {
    const category = dto.category ?? null;

    // Знайдено при реальній Docker-збірці: `PromoSettings.upsert({ where:
    // { category: null } })` не компілюється — `upsert` вимагає повний
    // WhereUniqueInput, а nullable unique-поле не приймає `null` як
    // значення для unique-lookup (SQL: NULL не ідентифікує рядок
    // однозначно). Для глобального override (category: null) — ручна
    // find-or-create логіка замість нативного upsert; для конкретної
    // категорії (non-null) — звичайний upsert працює як є.
    if (category === null) {
      const existing = await this.prisma.client.promoSettings.findFirst({ where: { category: null } });
      if (existing) {
        await this.prisma.client.promoSettings.update({
          where: { id: existing.id },
          data: { thresholdPercent: dto.thresholdPercent },
        });
      } else {
        await this.prisma.client.promoSettings.create({
          data: { category: null, thresholdPercent: dto.thresholdPercent },
        });
      }
    } else {
      await this.prisma.client.promoSettings.upsert({
        where: { category },
        create: { category, thresholdPercent: dto.thresholdPercent },
        update: { thresholdPercent: dto.thresholdPercent },
      });
    }

    // "применяется мгновенно" — пересчёт по всему каталогу/категории сразу (ТЗ п.18.2)
    return this.recalculateAll();
  }

  getPromoProducts() {
    return this.prisma.client.product.findMany({
      where: { cachedIsPromo: true },
      include: { manufacturer: true },
      orderBy: { cachedDiscountPercent: 'desc' },
    });
  }

  async recalculateAll() {
    return this.pricing.recalculateAll();
  }
}
