import { Injectable } from '@nestjs/common';
import type { IReviewScraperAdapter } from './review-adapter.interface';
import { SunshopReviewAdapter } from './adapters/sunshop-review.adapter';
import { AkumulyatorCenterReviewAdapter } from './adapters/akumulyator-center-review.adapter';
import { VoltmarketReviewAdapter } from './adapters/voltmarket-review.adapter';
import { VenconReviewAdapter } from './adapters/vencon-review.adapter';

// За прямим запитом користувача — "добавить парсер отзывов на товары
// отдельно скриптом для каждого магазина". Той самий принцип, що вже
// AdapterRegistry для парсингу самих товарів — новий магазин
// підключається додаванням сюди нової реалізації, без змін в іншому
// пайплайні.
@Injectable()
export class ReviewAdapterRegistry {
  private readonly adapters: IReviewScraperAdapter[] = [
    new SunshopReviewAdapter(),
    new AkumulyatorCenterReviewAdapter(),
    new VoltmarketReviewAdapter(),
    new VenconReviewAdapter(),
  ];

  getByVendorName(vendorName: string): IReviewScraperAdapter | undefined {
    return this.adapters.find((a) => a.vendorName === vendorName);
  }
}
