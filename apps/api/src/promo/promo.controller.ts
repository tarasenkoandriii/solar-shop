import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { UserRole } from '@solar-shop/db';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { PromoService } from './promo.service';
import { UpsertPromoSettingsDto } from './dto/promo-settings.dto';

@Controller()
export class PromoController {
  constructor(private readonly service: PromoService) {}

  // Публично — бейджи "Акция" на витрине читают Product.cachedIsPromo
  // напрямую через ProductsController, здесь только список для отдельного
  // маркетингового блока/страницы, если понадобится (ТЗ п.18.4).
  @Get('promo/products')
  getPromoProducts() {
    return this.service.getPromoProducts();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Get('admin/promo/settings')
  getSettings() {
    return this.service.getSettings();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Post('admin/promo/settings')
  upsertSettings(@Body() dto: UpsertPromoSettingsDto) {
    return this.service.upsertSettings(dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Post('admin/promo/recalculate')
  recalculate() {
    return this.service.recalculateAll();
  }
}
