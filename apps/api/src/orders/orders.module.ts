import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { CartModule } from '../cart/cart.module';
import { ProductsModule } from '../products/products.module';
import { LoyaltyModule } from '../loyalty/loyalty.module';
import { NovaPoshtaModule } from '../nova-poshta/nova-poshta.module';
import { NotifyModule } from '../notify/notify.module';
import { InvoiceModule } from '../invoice/invoice.module';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { ProfitService } from './profit.service';

@Module({
  imports: [AuthModule, CartModule, ProductsModule, LoyaltyModule, NovaPoshtaModule, NotifyModule, InvoiceModule],
  controllers: [OrdersController],
  providers: [OrdersService, ProfitService],
  exports: [OrdersService],
})
export class OrdersModule {}
