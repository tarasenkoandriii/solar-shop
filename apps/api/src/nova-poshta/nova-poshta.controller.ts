import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { UserRole } from '@solar-shop/db';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RateLimitGuard } from '../rate-limit/guards/rate-limit.guard';
import { RateLimit } from '../rate-limit/decorators/rate-limit.decorator';
import { NovaPoshtaService } from './nova-poshta.service';

@Controller('nova-poshta')
export class NovaPoshtaController {
  constructor(private readonly service: NovaPoshtaService) {}

  // Публичный автокомплит города/отделения при чекауте (ТЗ п.22.1) — живой
  // поиск через Nova Poshta API (searchSettlements), rate limit добавлен
  // отдельно ниже, чтобы не открывать NP API ключ на неограниченный спам.
  @UseGuards(RateLimitGuard)
  @RateLimit({ limit: 30, windowSeconds: 60 })
  @Get('cities')
  searchCities(@Query('q') query: string) {
    return this.service.searchCities(query ?? '');
  }

  @UseGuards(RateLimitGuard)
  @RateLimit({ limit: 30, windowSeconds: 60 })
  @Get('warehouses')
  getWarehouses(@Query('cityRef') cityRef: string, @Query('q') query?: string) {
    return this.service.getWarehouses(cityRef, query ?? '');
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Get('admin/sync')
  sync() {
    return this.service.syncDirectory();
  }
}
