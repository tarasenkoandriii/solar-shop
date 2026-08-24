// Формат JSON-экспорта данных парсера по одному Vendor — для миграции
// между окружениями (напр. локальная разработка → staging → прод), не
// привязан к конкретной БД: Product ссылки идут по articleNumber
// (глобально уникален), а не по id, т.к. id в разных окружениях не совпадают.
export interface VendorExportListing {
  sourceUrl: string;
  sourceSku: string | null;
  rawTitle: string;
  rawCategory: string | null;
  rawPrice: string; // Decimal как строка — не терять точность в JSON
  rawCurrency: string;
  priceUsd: string;
  priceRateDate: string | null;
  inStock: boolean;
  images: string[];
  affiliateUrl: string | null;
  isPromo: boolean;
  discountPercent: number | null;
  firstSeenAt: string;
  lastParsedAt: string;
  // Привязки к каноническим товарам — по articleNumber, не по productId
  // (ТЗ п.13.1 ProductListing), т.к. id несовместимы между окружениями.
  productLinks: {
    articleNumber: string;
    matchType: string;
    matchConfidence: number | null;
    isPrimary: boolean;
  }[];
}

export interface VendorExportData {
  formatVersion: 1;
  exportedAt: string;
  vendor: {
    name: string;
    website: string;
    warehouseCities: string[];
  };
  listings: VendorExportListing[];
}

export interface VendorImportResult {
  vendorName: string;
  vendorCreated: boolean;
  listingsProcessed: number;
  listingsCreated: number;
  listingsUpdated: number;
  productLinksCreated: number;
  productLinksUpdated: number;
  productLinksSkipped: { articleNumber: string; sourceUrl: string; reason: string }[];
  errors: string[];
}
