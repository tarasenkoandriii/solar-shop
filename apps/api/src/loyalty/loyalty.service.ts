import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateLoyaltyTierDto, UpdateLoyaltyTierDto } from './dto/loyalty-tier.dto';

// ТЗ п.23.3-23.4 — накопительная скидка, действует только у авторизованных
// через Telegram (лишний стимул логиниться).
@Injectable()
export class LoyaltyService {
  constructor(private readonly prisma: PrismaService) {}

  getTiers() {
    return this.prisma.client.loyaltyTier.findMany({ orderBy: { minSpendUah: 'asc' } });
  }

  async createTier(dto: CreateLoyaltyTierDto) {
    await this.validateOrdering(dto.minSpendUah, dto.discountPercent);
    return this.prisma.client.loyaltyTier.create({ data: dto });
  }

  async updateTier(id: string, dto: UpdateLoyaltyTierDto) {
    const existing = await this.prisma.client.loyaltyTier.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Tier not found');
    const minSpendUah = dto.minSpendUah ?? Number(existing.minSpendUah);
    const discountPercent = dto.discountPercent ?? existing.discountPercent;
    await this.validateOrdering(minSpendUah, discountPercent, id);
    return this.prisma.client.loyaltyTier.update({ where: { id }, data: dto });
  }

  async removeTier(id: string) {
    const existing = await this.prisma.client.loyaltyTier.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Tier not found');
    await this.prisma.client.loyaltyTier.delete({ where: { id } });
    return { ok: true };
  }

  // Действующая скидка = максимальный discountPercent среди уровней, чей
  // minSpendUah <= lifetimeSpendUah (ТЗ п.23.3). Только для авторизованных.
  async getDiscountForUser(userId: string | null): Promise<number> {
    if (!userId) return 0;
    const user = await this.prisma.client.user.findUnique({ where: { id: userId } });
    if (!user) return 0;

    const tiers = await this.prisma.client.loyaltyTier.findMany({
      where: { minSpendUah: { lte: user.lifetimeSpendUah } },
      orderBy: { discountPercent: 'desc' },
      take: 1,
    });
    return tiers[0]?.discountPercent ?? 0;
  }

  // Пересчёт кэша lifetimeSpendUah — вызывается OrdersService при переходе
  // заказа в PAID (ТЗ п.23.3, считаем с момента PAID, не SHIPPED).
  async recalculateLifetimeSpend(userId: string): Promise<void> {
    const paidOrders = await this.prisma.client.order.findMany({
      where: { userId, status: { in: ['PAID', 'SHIPPED'] } },
      select: { totalUah: true },
    });
    const total = paidOrders.reduce((sum, o) => sum + Number(o.totalUah), 0);
    await this.prisma.client.user.update({ where: { id: userId }, data: { lifetimeSpendUah: total } });
  }

  // Валидация формы (ТЗ п.23.4): пороги уникальны и упорядочены — нельзя
  // задать более высокую скидку на более низком пороге, чем на высоком.
  private async validateOrdering(minSpendUah: number, discountPercent: number, excludeId?: string): Promise<void> {
    const others = await this.prisma.client.loyaltyTier.findMany({ where: { id: { not: excludeId } } });

    for (const other of others) {
      const otherMin = Number(other.minSpendUah);
      if (otherMin < minSpendUah && other.discountPercent > discountPercent) {
        throw new BadRequestException(
          `Порог ${minSpendUah}₴ со скидкой ${discountPercent}% ниже, чем уже существующий порог ${otherMin}₴ (${other.discountPercent}%) — уровни должны быть монотонно возрастающими`,
        );
      }
      if (otherMin > minSpendUah && other.discountPercent < discountPercent) {
        throw new BadRequestException(
          `Порог ${minSpendUah}₴ со скидкой ${discountPercent}% выше, чем уже существующий более высокий порог ${otherMin}₴ (${other.discountPercent}%) — уровни должны быть монотонно возрастающими`,
        );
      }
    }
  }
}
