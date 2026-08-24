import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { NotifyModule } from '../notify/notify.module';
import { LeadsController } from './leads.controller';
import { LeadsService } from './leads.service';

@Module({
  imports: [AuthModule, NotifyModule],
  controllers: [LeadsController],
  providers: [LeadsService],
})
export class LeadsModule {}
