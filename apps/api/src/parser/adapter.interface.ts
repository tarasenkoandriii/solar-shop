// Общий интерфейс адаптера парсера (ТЗ п.13.2) — один адаптер на сайт-
// источник. Новый Vendor подключается написанием нового адаптера,
// реализующего этот интерфейс, без изменений в остальном пайплайне.
export interface RawListing {
  sourceUrl: string;
  sourceSku?: string;
  rawTitle: string;
  rawCategory?: string;
  // За прямим запитом користувача — сирий текст категорії, як сторінка
  // сама його показує (H1/breadcrumb), окремо від rawCategory
  // (внутрішній ключ, який ми свідомо шукаємо). Однакове для всіх
  // товарів з одного виклику fetchCategory() — сторінка категорії одна
  // на всю пагінацію, мітка не змінюється між сторінками.
  siteCategoryLabel?: string;
  rawPrice: number; // как на сайте, обычно UAH
  rawCurrency: string;
  inStock: boolean;
  images: string[];
}

export interface ISourceAdapter {
  /** Уникальный ключ адаптера — должен совпадать с Vendor.name в БД */
  readonly vendorName: string;

  fetchListings(): Promise<RawListing[]>;
}
