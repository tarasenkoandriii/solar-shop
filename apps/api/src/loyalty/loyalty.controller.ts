import { Body, Controller, Delete, Get, Param, Post, Put, UseGuards } from '@nestjs/common';
import { UserRole } from '@solar-shop/db';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { LoyaltyService } from './loyalty.service';
import { CreateLoyaltyTierDto, UpdateLoyaltyTierDto } from './dto/loyalty-tier.dto';

@Controller()
export class LoyaltyController {
  constructor(private readonly service: LoyaltyService) {}

  // Публичные — показать "текущий уровень скидки и сколько осталось до
  // следующего" на /account (ТЗ п.23.1) без раскрытия админ-функций
  @Get('loyalty/tiers')
  getTiers() {
    return this.service.getTiers();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Post('admin/loyalty/tiers')
  create(@Body() dto: CreateLoyaltyTierDto) {
    return this.service.createTier(dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Put('admin/loyalty/tiers/:id')
  update(@Param('id') id: string, @Body() dto: UpdateLoyaltyTierDto) {
    return this.service.updateTier(id, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Delete('admin/loyalty/tiers/:id')
  remove(@Param('id') id: string) {
    return this.service.removeTier(id);
  }
}
