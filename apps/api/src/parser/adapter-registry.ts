import { Injectable } from '@nestjs/common';
import type { ISourceAdapter } from './adapter.interface';
import { SunshopAdapter } from './adapters/sunshop.adapter';
import { AkumulyatorCenterAdapter } from './adapters/akumulyator-center.adapter';
import { VoltmarketAdapter } from './adapters/voltmarket.adapter';
import { VenconAdapter } from './adapters/vencon.adapter';

// Реестр адаптеров — новый Vendor подключается добавлением сюда новой
// реализации ISourceAdapter (ТЗ п.13.4). 4 из 5 приоритетных поставщиков
// ТЗ п.12 покрыты (sunshop.com.ua, akumulyator.center, voltmarket.ua,
// vencon.ua) — saen.com.ua сознательно не реализован: при исследовании
// сайта на этапе написания кода выяснилось, что это в первую очередь
// сайт монтажной компании (лендинги услуг/проектов), а не витрина с
// фиксированной сеткой товаров, как у остальных 4 — прямая ссылка на
// прайс-лист вернула 404, структура каталога не подтвердилась. Нужно
// либо найти у него реальный каталог другим способом при следующей
// сессии с доступом к сайту, либо исключить из списка источников
// (см. AUDIT-PHASE-2.md).
@Injectable()
export class AdapterRegistry {
  private readonly adapters: ISourceAdapter[] = [
    new SunshopAdapter(),
    new AkumulyatorCenterAdapter(),
    new VoltmarketAdapter(),
    new VenconAdapter(),
  ];

  getAll(): ISourceAdapter[] {
    return this.adapters;
  }

  getByVendorName(vendorName: string): ISourceAdapter | undefined {
    return this.adapters.find((a) => a.vendorName === vendorName);
  }
}
