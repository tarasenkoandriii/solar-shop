import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { UserRole } from '@solar-shop/db';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RateLimitGuard } from '../rate-limit/guards/rate-limit.guard';
import { RateLimit } from '../rate-limit/decorators/rate-limit.decorator';
import { CalculatorSettingsService } from './calculator-settings.service';
import { UpsertTariffDto, ApplyPowerRangeThresholdDto, ApplyScalingThresholdDto, SetDocumentTypeEnabledDto } from './dto/calculator-settings.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller('admin/calculator-settings')
export class CalculatorSettingsController {
  constructor(private readonly service: CalculatorSettingsService) {}

  @Get('tariffs')
  findTariffs() {
    return this.service.findAllTariffs();
  }

  @Post('tariffs')
  upsertTariff(@Body() dto: UpsertTariffDto) {
    return this.service.upsertTariff(dto.key, dto.label, dto.rateUahPerKwh, dto.sourceUrl);
  }

  @Get('power-range-thresholds')
  findPowerRangeThresholds() {
    return this.service.findAllPowerRangeThresholds();
  }

  @UseGuards(RateLimitGuard)
  @RateLimit({ limit: 1, windowSeconds: 180 })
  @Post('power-range-thresholds/suggest-ai')
  suggestPowerRangeThresholds() {
    return this.service.suggestPowerRangeThresholds();
  }

  @Post('power-range-thresholds/apply')
  applyPowerRangeThreshold(@Body() dto: ApplyPowerRangeThresholdDto) {
    return this.service.applyPowerRangeThreshold(dto.tag, dto.minPanelsWattW, dto.maxPanelsWattW ?? null);
  }

  @Get('scaling-thresholds')
  findScalingThresholds() {
    return this.service.findAllScalingThresholds();
  }

  @UseGuards(RateLimitGuard)
  @RateLimit({ limit: 1, windowSeconds: 180 })
  @Post('scaling-thresholds/suggest-ai')
  suggestScalingThreshold() {
    return this.service.suggestScalingThreshold('CONTROLLER');
  }

  @Post('scaling-thresholds/apply')
  applyScalingThreshold(@Body() dto: ApplyScalingThresholdDto) {
    return this.service.applyScalingThreshold('CONTROLLER', dto.headroomMaxPricePercent);
  }

  // За прямим запитом користувача — "На вкладке Налаштування добавить
  // секцію Налаштування документообігу... Спецификация и бизнес план
  // чекбоксами всегда ✅ checked".
  @Get('document-types')
  findDocumentTypeSettings() {
    return this.service.findAllDocumentTypeSettings();
  }

  @Post('document-types')
  setDocumentTypeEnabled(@Body() dto: SetDocumentTypeEnabledDto) {
    return this.service.setDocumentTypeEnabled(dto.key, dto.enabled);
  }
}
