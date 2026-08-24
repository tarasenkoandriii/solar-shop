import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { GrokModule } from '../grok/grok.module';
import { SchemaTemplatesController } from './schema-templates.controller';
import { SchemaTemplatesService } from './schema-templates.service';

@Module({
  imports: [AuthModule, GrokModule],
  controllers: [SchemaTemplatesController],
  providers: [SchemaTemplatesService],
})
export class SchemaTemplatesModule {}
