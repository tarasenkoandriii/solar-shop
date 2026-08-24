import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { GrokService } from './grok.service';
import { GrokBatchService } from './grok-batch.service';
import { GrokUsageService } from './grok-usage.service';
import { GrokUsageController } from './grok-usage.controller';

@Module({
  imports: [AuthModule],
  controllers: [GrokUsageController],
  providers: [GrokService, GrokBatchService, GrokUsageService],
  exports: [GrokService, GrokBatchService],
})
export class GrokModule {}
