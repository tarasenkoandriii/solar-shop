import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { MatchType } from '@solar-shop/db';
import { PrismaService } from '../prisma/prisma.service';
import { ProductPricingService } from '../products/product-pricing.service';
import type { VendorExportData, VendorExportListing, VendorImportResult } from './vendor-export.types';

@Injectable()
export class VendorDataTransferService {
  private readonly logger = new Logger(VendorDataTransferService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly pricing: ProductPricingService,
  ) {}

  async exportVendor(vendorId: string): Promise<VendorExportData> {
    const vendor = await this.prisma.client.vendor.findUnique({
      where: { id: vendorId },
      include: {
        listings: {
          include: { products: { include: { product: true } } },
        },
      },
    });
    if (!vendor) throw new NotFoundException('Vendor not found');

    const listings: VendorExportListing[] = vendor.listings.map((l) => ({
      sourceUrl: l.sourceUrl,
      sourceSku: l.sourceSku,
      rawTitle: l.rawTitle,
      rawCategory: l.rawCategory,
      rawPrice: l.rawPrice.toString(),
      rawCurrency: l.rawCurrency,
      priceUsd: l.priceUsd.toString(),
      priceRateDate: l.priceRateDate?.toISOString() ?? null,
      inStock: l.inStock,
      images: l.images,
      affiliateUrl: l.affiliateUrl,
      isPromo: l.isPromo,
      discountPercent: l.discountPercent,
      firstSeenAt: l.firstSeenAt.toISOString(),
      lastParsedAt: l.lastParsedAt.toISOString(),
      productLinks: l.products.map((pl) => ({
        articleNumber: pl.product.articleNumber,
        matchType: pl.matchType,
        matchConfidence: pl.matchConfidence,
        isPrimary: pl.isPrimary,
      })),
    }));

    return {
      formatVersion: 1,
      exportedAt: new Date().toISOString(),
      vendor: {
        name: vendor.name,
        website: vendor.website,
        warehouseCities: vendor.warehouseCities,
      },
      listings,
    };
  }

  async importVendorData(payload: unknown): Promise<VendorImportResult> {
    const data = this.validatePayload(payload);

    const result: VendorImportResult = {
      vendorName: data.vendor.name,
      vendorCreated: false,
      listingsProcessed: 0,
      listingsCreated: 0,
      listingsUpdated: 0,
      productLinksCreated: 0,
      productLinksUpdated: 0,
      productLinksSkipped: [],
      errors: [],
    };

    const existingVendor = await this.prisma.client.vendor.findUnique({ where: { name: data.vendor.name } });
    const vendor = existingVendor
      ? await this.prisma.client.vendor.update({
          where: { id: existingVendor.id },
          data: { website: data.vendor.website, warehouseCities: data.vendor.warehouseCities },
        })
      : await this.prisma.client.vendor.create({
          data: {
            name: data.vendor.name,
            website: data.vendor.website,
            warehouseCities: data.vendor.warehouseCities,
          },
        });
    result.vendorCreated = !existingVendor;

    const productsToRecalculate = new Set<string>();

    for (const listing of data.listings) {
      result.listingsProcessed++;
      try {
        const existingListing = await this.prisma.client.sourceListing.findUnique({
          where: { vendorId_sourceUrl: { vendorId: vendor.id, sourceUrl: listing.sourceUrl } },
        });

        const listingData = {
          sourceSku: listing.sourceSku ?? undefined,
          rawTitle: listing.rawTitle,
          rawCategory: listing.rawCategory ?? undefined,
          rawPrice: listing.rawPrice,
          rawCurrency: listing.rawCurrency,
          priceUsd: listing.priceUsd,
          priceRateDate: listing.priceRateDate ? new Date(listing.priceRateDate) : undefined,
          inStock: listing.inStock,
          images: listing.images,
          affiliateUrl: listing.affiliateUrl ?? undefined,
          isPromo: listing.isPromo,
          discountPercent: listing.discountPercent ?? undefined,
          lastParsedAt: new Date(listing.lastParsedAt),
        };

        const savedListing = existingListing
          ? await this.prisma.client.sourceListing.update({
              where: { id: existingListing.id },
              data: { ...listingData, priceCheckedAt: new Date(), stockCheckedAt: new Date() },
            })
          : await this.prisma.client.sourceListing.create({
              data: {
                ...listingData,
                vendorId: vendor.id,
                sourceUrl: listing.sourceUrl,
                firstSeenAt: new Date(listing.firstSeenAt),
                priceCheckedAt: new Date(),
                stockCheckedAt: new Date(),
              },
            });

        if (existingListing) result.listingsUpdated++;
        else result.listingsCreated++;

        for (const link of listing.productLinks) {
          const product = await this.prisma.client.product.findUnique({
            where: { articleNumber: link.articleNumber },
          });

          if (!product) {
            result.productLinksSkipped.push({
              articleNumber: link.articleNumber,
              sourceUrl: listing.sourceUrl,
              reason: "Товар з таким articleNumber не знайдено в цільовому оточенні",
            });
            continue;
          }

          const existingLink = await this.prisma.client.productListing.findUnique({
            where: { productId_sourceListingId: { productId: product.id, sourceListingId: savedListing.id } },
          });

          if (existingLink) {
            await this.prisma.client.productListing.update({
              where: { id: existingLink.id },
              data: {
                matchType: link.matchType as MatchType,
                matchConfidence: link.matchConfidence ?? undefined,
                isPrimary: link.isPrimary,
              },
            });
            result.productLinksUpdated++;
          } else {
            await this.prisma.client.productListing.create({
              data: {
                productId: product.id,
                sourceListingId: savedListing.id,
                matchType: link.matchType as MatchType,
                matchConfidence: link.matchConfidence ?? undefined,
                isPrimary: link.isPrimary,
              },
            });
            result.productLinksCreated++;
          }

          productsToRecalculate.add(product.id);
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        this.logger.error(`Import failed for listing ${listing.sourceUrl}: ${message}`);
        result.errors.push(`${listing.sourceUrl}: ${message}`);
      }
    }

    for (const productId of productsToRecalculate) {
      await this.pricing.recalculate(productId).catch((err) => {
        result.errors.push(`Pricing recalculation failed for product ${productId}: ${err}`);
      });
    }

    return result;
  }

  private validatePayload(payload: unknown): VendorExportData {
    if (!payload || typeof payload !== 'object') {
      throw new BadRequestException("Некоректний файл — очікувався JSON-об'єкт");
    }
    const data = payload as Partial<VendorExportData>;

    if (data.formatVersion !== 1) {
      throw new BadRequestException(`Непідтримувана версія формату: ${data.formatVersion} (очікується 1)`);
    }
    if (!data.vendor?.name || !data.vendor?.website) {
      throw new BadRequestException("Відсутні обов'язкові поля vendor.name / vendor.website");
    }
    if (!Array.isArray(data.listings)) {
      throw new BadRequestException('Поле listings має бути масивом');
    }
    for (const [i, listing] of data.listings.entries()) {
      if (!listing.sourceUrl || !listing.rawTitle || listing.priceUsd === undefined) {
        throw new BadRequestException(
          `Листинг №${i + 1}: відсутні обов'язкові поля (sourceUrl/rawTitle/priceUsd)`,
        );
      }
      if (!Array.isArray(listing.productLinks)) {
        throw new BadRequestException(`Листинг №${i + 1}: productLinks має бути масивом (може бути порожнім)`);
      }
    }

    return data as VendorExportData;
  }
}
