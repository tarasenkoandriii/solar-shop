import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { GrokModule } from '../grok/grok.module';
import { CartModule } from '../cart/cart.module';
import { InvoiceModule } from '../invoice/invoice.module';
import { EmailModule } from '../email/email.module';
import { NotifyModule } from '../notify/notify.module';
import { CalculatorSettingsModule } from '../calculator-settings/calculator-settings.module';
import { CalculatorController } from './calculator.controller';
import { CalculatorService } from './calculator.service';
import { PvgisService } from './pvgis.service';

@Module({
  imports: [AuthModule, GrokModule, CartModule, InvoiceModule, EmailModule, NotifyModule, CalculatorSettingsModule],
  controllers: [CalculatorController],
  providers: [CalculatorService, PvgisService],
  exports: [PvgisService], // нужен ProjectGoalsModule/админке "Настройки калькулятора" позже
})
export class CalculatorModule {}
