import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { GrokModule } from '../grok/grok.module';
import { CurrencyModule } from '../currency/currency.module';
import { ImportScoutController } from './import-scout.controller';
import { ImportScoutService } from './import-scout.service';

@Module({
  imports: [AuthModule, GrokModule, CurrencyModule],
  controllers: [ImportScoutController],
  providers: [ImportScoutService],
  exports: [ImportScoutService],
})
export class ImportScoutModule {}
