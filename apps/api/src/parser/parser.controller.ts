import { Body, Get, Controller, Param, Post, Query, UseGuards } from '@nestjs/common';
import { UserRole } from '@solar-shop/db';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { SiblingsService } from './siblings.service';
import { SourceListingsService } from './source-listings.service';
import { VendorDataTransferService } from './vendor-data-transfer.service';

// Запуск парсера (product_parser) — только через единую точку CronModule
// (ТЗ п.27.3: "тот же внутренний эндпоинт, что и pg_cron"), см.
// /admin/cron/product_parser/run и /internal/cron/product_parser/run.
// Здесь остаются только экраны "Листинги" и "Кандидаты в siblings", плюс
// экспорт/импорт данных парсера по Vendor для миграции между окружениями.
@Controller()
export class ParserController {
  constructor(
    private readonly siblings: SiblingsService,
    private readonly sourceListings: SourceListingsService,
    private readonly dataTransfer: VendorDataTransferService,
  ) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @Get('admin/listings')
  listListings(@Query('vendorId') vendorId?: string, @Query('inStockOnly') inStockOnly?: string) {
    return this.sourceListings.findAll({ vendorId, inStockOnly: inStockOnly === 'true' });
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Get('admin/siblings/candidates')
  getCandidates() {
    return this.siblings.getCandidates();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Post('admin/siblings/:sourceListingId/confirm/:productId')
  confirm(@Param('sourceListingId') sourceListingId: string, @Param('productId') productId: string) {
    return this.siblings.confirmMatch(sourceListingId, productId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Post('admin/siblings/:sourceListingId/reject/:productId')
  reject(@Param('sourceListingId') sourceListingId: string, @Param('productId') productId: string) {
    return this.siblings.rejectMatch(sourceListingId, productId);
  }

  // Миграция данных парсера между окружениями — экспорт по одному Vendor
  // в JSON (скачивается как файл в браузере), импорт того же формата
  // идемпотентно применяется в целевом окружении.
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Get('admin/vendors/:id/export')
  exportVendor(@Param('id') id: string) {
    return this.dataTransfer.exportVendor(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Post('admin/vendors/import')
  importVendor(@Body() payload: unknown) {
    return this.dataTransfer.importVendorData(payload);
  }
}
