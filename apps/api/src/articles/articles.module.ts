import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { GrokModule } from '../grok/grok.module';
import { ArticlesController } from './articles.controller';
import { ArticlesService } from './articles.service';

@Module({
  imports: [AuthModule, GrokModule],
  controllers: [ArticlesController],
  providers: [ArticlesService],
  exports: [ArticlesService], // нужен CronModule для запуска джоба
})
export class ArticlesModule {}
