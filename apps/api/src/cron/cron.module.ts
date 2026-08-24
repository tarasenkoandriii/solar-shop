import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ParserModule } from '../parser/parser.module';
import { ArticlesModule } from '../articles/articles.module';
import { CurrencyModule } from '../currency/currency.module';
import { NovaPoshtaModule } from '../nova-poshta/nova-poshta.module';
import { PromoModule } from '../promo/promo.module';
import { NotifyModule } from '../notify/notify.module';
import { FinancingModule } from '../financing/financing.module';
import { BusinessPlanModule } from '../business-plan/business-plan.module';
import { SolarMapModule } from '../solar-map/solar-map.module';
import { CronController, InternalCronController } from './cron.controller';
import { CronService } from './cron.service';

@Module({
  imports: [
    AuthModule,
    ParserModule,
    ArticlesModule,
    CurrencyModule,
    NovaPoshtaModule,
    PromoModule,
    NotifyModule,
    FinancingModule,
    BusinessPlanModule,
    SolarMapModule,
  ],
  controllers: [CronController, InternalCronController],
  providers: [CronService],
})
export class CronModule {}
