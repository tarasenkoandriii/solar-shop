import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { GrokModule } from '../grok/grok.module';
import { InvoiceModule } from '../invoice/invoice.module';
import { EmailModule } from '../email/email.module';
import { NotifyModule } from '../notify/notify.module';
import { CalculatorSettingsModule } from '../calculator-settings/calculator-settings.module';
import { FinancingModule } from '../financing/financing.module';
import { CalculatorModule } from '../calculator/calculator.module';
import { BusinessPlanController } from './business-plan.controller';
import { BusinessPlanManifestService } from './business-plan-manifest.service';
import { BusinessPlanGenerationService } from './business-plan-generation.service';
import { PaybackService } from './payback.service';

@Module({
  imports: [AuthModule, GrokModule, InvoiceModule, EmailModule, NotifyModule, CalculatorSettingsModule, FinancingModule, CalculatorModule],
  controllers: [BusinessPlanController],
  providers: [BusinessPlanManifestService, BusinessPlanGenerationService, PaybackService],
  exports: [BusinessPlanGenerationService, BusinessPlanManifestService, PaybackService],
})
export class BusinessPlanModule {}
