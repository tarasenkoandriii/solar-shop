import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { GrokModule } from '../grok/grok.module';
import { ProjectGoalsController } from './project-goals.controller';
import { ProjectGoalsService } from './project-goals.service';

@Module({
  imports: [AuthModule, GrokModule],
  controllers: [ProjectGoalsController],
  providers: [ProjectGoalsService],
})
export class ProjectGoalsModule {}
