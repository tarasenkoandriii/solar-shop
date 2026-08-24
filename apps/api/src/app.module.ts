import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { ProductsModule } from './products/products.module';
import { ManufacturersModule } from './manufacturers/manufacturers.module';
import { OfficesModule } from './offices/offices.module';
import { LeadsModule } from './leads/leads.module';
import { CurrencyModule } from './currency/currency.module';
import { VendorsModule } from './vendors/vendors.module';
import { ParserModule } from './parser/parser.module';
import { ImportScoutModule } from './import-scout/import-scout.module';
import { PromoModule } from './promo/promo.module';
import { GrokModule } from './grok/grok.module';
import { CartModule } from './cart/cart.module';
import { OrdersModule } from './orders/orders.module';
import { LoyaltyModule } from './loyalty/loyalty.module';
import { NovaPoshtaModule } from './nova-poshta/nova-poshta.module';
import { ArticlesModule } from './articles/articles.module';
import { CronModule } from './cron/cron.module';
import { NotifyModule } from './notify/notify.module';
import { RateLimitModule } from './rate-limit/rate-limit.module';
import { EmailModule } from './email/email.module';
import { CalculatorModule } from './calculator/calculator.module';
import { ProjectGoalsModule } from './project-goals/project-goals.module';
import { SchemaTemplatesModule } from './schema-templates/schema-templates.module';
import { CalculatorSettingsModule } from './calculator-settings/calculator-settings.module';
import { FinancingModule } from './financing/financing.module';
import { BusinessPlanModule } from './business-plan/business-plan.module';
import { SolarMapModule } from './solar-map/solar-map.module';
import { HealthController } from './common/health.controller';

@Module({
  imports: [
    // Єдиний .env для всього монорепо (див. /.env.example у корені) —
    // спочатку шукає apps/api/.env (локальний override, якщо є), інакше
    // бере кореневий /.env. У проді (Vercel) жоден файл не читається,
    // process.env інжектиться напряму — envFilePath ігнорується, якщо
    // жоден з файлів фізично не існує (не помилка).
    ConfigModule.forRoot({ isGlobal: true, envFilePath: ['.env', '../../.env'] }),
    PrismaModule,
    AuthModule,
    ProductsModule,
    ManufacturersModule,
    OfficesModule,
    LeadsModule,
    CurrencyModule,
    VendorsModule,
    GrokModule,
    ParserModule,
    ImportScoutModule,
    PromoModule,
    NovaPoshtaModule,
    CartModule,
    OrdersModule,
    LoyaltyModule,
    ArticlesModule,
    CronModule,
    NotifyModule,
    RateLimitModule,
    EmailModule,
    CalculatorModule,
    ProjectGoalsModule,
    SchemaTemplatesModule,
    CalculatorSettingsModule,
    FinancingModule,
    BusinessPlanModule,
    SolarMapModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
