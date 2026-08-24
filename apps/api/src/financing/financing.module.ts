import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { GrokModule } from '../grok/grok.module';
import { FinancingController } from './financing.controller';
import { FinancingService } from './financing.service';
import { FinancingReviewService } from './financing-review.service';

@Module({
  imports: [AuthModule, GrokModule],
  controllers: [FinancingController],
  providers: [FinancingService, FinancingReviewService],
  exports: [FinancingService],
})
export class FinancingModule {}
