import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { NovaPoshtaService } from './nova-poshta.service';
import { NovaPoshtaController } from './nova-poshta.controller';

@Module({
  imports: [AuthModule],
  controllers: [NovaPoshtaController],
  providers: [NovaPoshtaService],
  exports: [NovaPoshtaService],
})
export class NovaPoshtaModule {}
