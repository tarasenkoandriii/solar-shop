import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

// Экран «Листинги» (ТЗ п.13.4) — сырые позиции по поставщикам отдельно от
// канонических «Товаров», с priceCheckedAt/stockCheckedAt для диагностики
// упавших адаптеров (ТЗ п.13.5).
@Injectable()
export class SourceListingsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(params: { vendorId?: string; inStockOnly?: boolean }) {
    return this.prisma.client.sourceListing.findMany({
      where: {
        vendorId: params.vendorId,
        inStock: params.inStockOnly ? true : undefined,
      },
      include: { vendor: true, products: { include: { product: true } } },
      orderBy: { lastParsedAt: 'desc' },
      take: 200,
    });
  }
}
