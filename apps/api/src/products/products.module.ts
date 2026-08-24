import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';
import { ProductPricingService } from './product-pricing.service';
import { ProductReviewService } from './product-review.service';
import { CategoryService } from './category.service';
import { CategoryController } from './category.controller';

@Module({
  imports: [AuthModule],
  controllers: [ProductsController, CategoryController],
  providers: [ProductsService, ProductPricingService, ProductReviewService, CategoryService],
  exports: [ProductsService, ProductPricingService, CategoryService],
})
export class ProductsModule {}
