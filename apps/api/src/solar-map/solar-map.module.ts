import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { CalculatorModule } from '../calculator/calculator.module';
import { SolarMapController } from './solar-map.controller';
import { SolarMapService } from './solar-map.service';
import { EmbedViewService } from './embed-view.service';

@Module({
  imports: [AuthModule, CalculatorModule],
  controllers: [SolarMapController],
  providers: [SolarMapService, EmbedViewService],
  // За запитом користувача — новий крон-джоб pvgis_country_grid у
  // CronModule потребує SolarMapService напряму (не тільки через власний
  // контролер) — без explicit exports NestJS не дає él інжектувати в
  // інший модуль.
  exports: [SolarMapService],
})
export class SolarMapModule {}
