import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { BlobModule } from '../blob/blob.module';
import { GrokModule } from '../grok/grok.module';
import { ProductsModule } from '../products/products.module';
import { ParserController } from './parser.controller';
import { ParserService } from './parser.service';
import { MatchingService } from './matching.service';
import { SiblingsService } from './siblings.service';
import { SourceListingsService } from './source-listings.service';
import { VendorDataTransferService } from './vendor-data-transfer.service';
import { AdapterRegistry } from './adapter-registry';
import { ReviewAdapterRegistry } from './review-adapter-registry';
import { ProductReviewImportService } from './product-review-import.service';
import { ProductImageMirrorService } from './product-image-mirror.service';

@Module({
  imports: [AuthModule, GrokModule, ProductsModule, BlobModule],
  controllers: [ParserController],
  providers: [
    ParserService,
    MatchingService,
    SiblingsService,
    SourceListingsService,
    VendorDataTransferService,
    AdapterRegistry,
    ReviewAdapterRegistry,
    ProductReviewImportService,
    ProductImageMirrorService,
  ],
  exports: [ParserService, ProductReviewImportService, ProductImageMirrorService], // ParserService всё ещё нужен CronModule для запуска джоба
})
export class ParserModule {}
