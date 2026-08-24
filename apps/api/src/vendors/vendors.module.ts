import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { GrokModule } from '../grok/grok.module';
import { AdapterRegistry } from '../parser/adapter-registry';
import { VendorsController } from './vendors.controller';
import { VendorsService } from './vendors.service';

@Module({
  imports: [AuthModule, GrokModule],
  controllers: [VendorsController],
  // AdapterRegistry — окрема інстанція від тієї, що в ParserModule (клас
  // без стану, просто статичний список адаптерів — дві інстанції не
  // проблема, простіше, ніж робити ParserModule → VendorsModule
  // залежність заради одного класу).
  providers: [VendorsService, AdapterRegistry],
  exports: [VendorsService],
})
export class VendorsModule {}
