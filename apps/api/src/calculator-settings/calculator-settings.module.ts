import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { GrokModule } from '../grok/grok.module';
import { CalculatorSettingsController } from './calculator-settings.controller';
import { CalculatorSettingsService } from './calculator-settings.service';

@Module({
  imports: [AuthModule, GrokModule],
  controllers: [CalculatorSettingsController],
  providers: [CalculatorSettingsService],
  exports: [CalculatorSettingsService],
})
export class CalculatorSettingsModule {}
