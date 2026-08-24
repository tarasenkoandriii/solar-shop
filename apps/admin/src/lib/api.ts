// Все запросы идут через same-origin /api/* (проксируется next.config.mjs
// rewrites на реальный API_INTERNAL_URL) — решает проблему cross-domain
// cookie: браузер видит /api/* как запрос к собственному домену admin,
// сессионная cookie (sameSite: 'lax') отправляется штатно.
const API_BASE = '/api';

export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...(options.headers ?? {}) },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`${options.method ?? 'GET'} ${path} failed: ${res.status} ${body}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export interface Manufacturer {
  id: string;
  name: string;
  region: 'EUROPE' | 'CHINA';
  country: string;
  logoUrl: string | null;
}

export interface ProductImage {
  id: string;
  url: string;
  altText: string | null;
  sortOrder: number;
}

export interface Product {
  id: string;
  slug: string;
  articleNumber: string;
  manufacturerSku: string | null;
  category: 'SOLAR_PANEL' | 'BATTERY' | 'CONTROLLER' | 'INVERTER';
  name: string;
  manufacturerId: string | null;
  manufacturer: Manufacturer | null;
  images: ProductImage[];
  shortDescription: string;
  description: string;
  specs: Record<string, unknown>;
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  // За прямим запитом користувача — "показывать цену товара по
  // второму из самых дешёвых вариантов". Внутрішня собівартість —
  // видима лише в адмінці, ніколи не публічно.
  cachedCostPriceUsd: string | null;
  cachedPriceUsd: string | null;
  cachedInStock: boolean;
  cachedIsPromo: boolean;
  cachedDiscountPercent: number | null;
  cachedIsNew: boolean;
  isSeedData: boolean;
  listings?: { id: string }[];
}

export interface Vendor {
  id: string;
  name: string;
  website: string;
  warehouseCities: string[];
  isActive: boolean;
  contactPhone: string | null;
  contactAddress: string | null;
  contactPersonName: string | null;
  contractStatus: 'NOT_CONTACTED' | 'NEGOTIATING' | 'SIGNED' | 'DECLINED';
  contractNote: string | null;
  // Рахується на бекенді при кожному запиті (не фізична колонка БД) —
  // за запитом користувача.
  parserStatus: 'NOT_WRITTEN' | 'WORKING' | 'NEEDS_DEBUG';
}

export interface Category {
  id: string;
  key: string;
  nameUk: string;
  nameRu: string;
  nameEn: string;
  articleNumberPrefix: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  createdAt: string;
}

export interface PendingCategory extends Category {
  waitingProductCount: number;
}

export interface VendorCandidate {
  name: string;
  website: string;
  notes: string;
}

export interface VendorCatalogEstimate {
  estimatedProductCount: number | null;
  categories: string[];
  notes: string;
}

// Міграція даних парсера між оточеннями (напр. локальна розробка →
// staging → прод) — див. VendorDataTransferService на бекенді.
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

export interface SourceListing {
  id: string;
  vendorId: string;
  vendor: { name: string };
  sourceUrl: string;
  rawTitle: string;
  priceUsd: string;
  inStock: boolean;
  priceCheckedAt: string;
  stockCheckedAt: string;
  products: { product: { id: string; name: string } }[];
}

export interface SiblingCandidate {
  sourceListingId: string;
  rawTitle: string;
  vendorName: string;
  productId: string;
  productName: string;
  confidence: number;
  // За прямим запитом користувача — "модифицировать логику siblings".
  priceImpact: {
    currentCostUsd: number | null;
    currentPublicUsd: number | null;
    projectedCostUsd: number | null;
    projectedPublicUsd: number | null;
  };
}

export interface Order {
  id: string;
  status: 'NEW' | 'INVOICED' | 'PAID' | 'SHIPPED' | 'CANCELLED';
  contactName: string;
  contactPhone: string;
  totalUsd: string;
  totalUah: string;
  ttnNumber: string | null;
  ttnStatus: string;
  invoicePdfUrl: string | null;
  createdAt: string;
  user: { username: string | null } | null;
  items: { id: string; quantity: number; priceUsd: string; product: { name: string; articleNumber: string } }[];
}

// За прямим запитом користувача — "добавить в админку вкладку
// profit... выводить на вкладке profit обе цены и разницу которую мы
// заработаем, и статус заказа".
export interface OrderProfitRow {
  orderId: string;
  status: string;
  createdAt: string;
  contactName: string;
  costUsd: number;
  publicUsd: number;
  profitUsd: number;
  itemsWithUnknownCost: number;
  hasNoProfitItems: boolean;
}

export interface DelegateResult {
  ordersScanned: number;
  itemsDelegated: number;
  itemsWithNoAlternative: number;
  delegationsCreated: number;
  ttnCreated: number;
  ttnFailed: number;
}

// За прямим запитом користувача — "OrderDelegation не имеет пути
// просмотра — данные в БД есть, но нет GET-эндпоинта и UI для
// просмотра, какому поставщику что делегировано. Исправь".
export interface OrderDelegationRow {
  id: string;
  ttnNumber: string | null;
  ttnStatus: string;
  createdAt: string;
  order: { id: string; contactName: string; status: string };
  vendor: { id: string; name: string };
  items: { id: string; quantity: number; priceUsd: string; product: { name: string; articleNumber: string } }[];
}

// За прямим запитом користувача — реалізація doc/TZ_ImportScout.md.
export interface ProductProfitRow {
  productId: string;
  productName: string;
  totalProfitUsd: number;
  unitsSold: number;
}

export interface ProductSalesRow {
  productId: string;
  productName: string;
  unitsSold: number;
  ordersCount: number;
}

export interface ImportScoutResult {
  id: string;
  productId: string;
  source: 'ALIEXPRESS' | 'ALIBABA' | '1688';
  title: string;
  priceRawCny: string | null;
  priceMinUsd: string | null;
  priceMaxUsd: string | null;
  moq: number | null;
  sourceUrl: string;
  urlVerified: boolean;
  supplierName: string | null;
  supplierYearsOnPlatform: number | null;
  ourCostPriceUsdSnapshot: string | null;
  foundAt: string;
}

export interface ImportScoutSearchResponse {
  error: string | null;
  results: ImportScoutResult[];
}

export interface LoyaltyTier {
  id: string;
  minSpendUah: string;
  discountPercent: number;
}

export interface PromoSetting {
  id: string;
  category: 'SOLAR_PANEL' | 'BATTERY' | 'CONTROLLER' | 'INVERTER' | null;
  thresholdPercent: number;
}

export interface ArticleTranslation {
  id: string;
  locale: string;
  title: string;
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
}

export interface Article {
  id: string;
  slug: string;
  sourceSite: string | null;
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  translations: ArticleTranslation[];
  score: number | null;
  scoreReasoning: string | null;
  coverImage: string | null;
}

export interface CronJobInfo {
  jobKey: string;
  description: string;
}

export interface CronJobRun {
  id: string;
  jobKey: string;
  triggeredBy: string;
  status: 'RUNNING' | 'SUCCESS' | 'FAILED' | 'PARTIAL';
  startedAt: string;
  durationMs: number | null;
  summary: string | null;
  debugLog: unknown;
  itemsProcessed: number | null;
  itemsFailed: number | null;
  errorMessage: string | null;
}

export interface Office {
  id: string;
  city: string;
  address: string;
  phone: string;
  email: string;
  workHours: string;
  lat: number | null;
  lng: number | null;
}

export interface Lead {
  id: string;
  name: string;
  phone: string;
  comment: string | null;
  status: 'NEW' | 'IN_PROGRESS' | 'CLOSED';
  source: 'WEB' | 'TMA';
  createdAt: string;
}

export interface AdminUser {
  id: string;
  telegramId: string;
  username: string | null;
  firstName: string | null;
  role: 'CUSTOMER' | 'MANAGER' | 'ADMIN';
}

// Фаза 3 — куда/когда/статус отправки матеріалів калькулятора
export interface ProjectEstimateDelivery {
  id: string;
  projectEstimateId: string;
  projectEstimate: { id: string; name: string; city: string | null; totalUsd: string };
  channel: 'TELEGRAM' | 'EMAIL' | 'WHATSAPP' | 'VIBER';
  contactValue: string;
  status: 'PENDING' | 'SENT' | 'FAILED';
  errorMessage: string | null;
  sentAt: string | null;
  createdAt: string;
}

export interface ProjectGoal {
  id: string;
  key: string;
  label: string;
  description: string | null;
  defaultTopology: 'OFF_GRID' | 'BACKUP_UPS' | 'GRID_TIE' | 'COMMERCIAL' | null;
  generatedBy: string;
  isActive: boolean;
  createdAt: string;
}

export interface ProjectEstimateAdmin {
  id: string;
  name: string;
  city: string | null;
  budgetUsd: string | null;
  goals: string[];
  totalUsd: string;
  status: 'DRAFT' | 'FINALIZED' | 'SENT' | 'CONVERTED_TO_ORDER';
  userId: string | null;
  createdAt: string;
}

// За прямим запитом користувача — "в админке дать возможность
// просмотра результатов детально на странице в том же дизайне
// (аккордеон)". Окремий, ПОВНІШИЙ тип — вузький ProjectEstimateAdmin
// вище достатній для таблиці списку, детальна сторінка потребує
// набагато більше полів (той самий набір, що вже клієнтський
// ProjectEstimate на apps/web).
export interface ProjectEstimateDetail extends ProjectEstimateAdmin {
  cityRef: string | null;
  dailyConsumptionKwh: string | null;
  cableRunMeters: string | null;
  financingNeeded: boolean;
  ownFundsPercent: number | null;
  // За прямим запитом користувача — "телеграм изернейм замовника -
  // дає можливість зразу написати".
  user: { username: string | null; firstName: string | null; lastName: string | null } | null;
  // За прямим запитом користувача — "в админке дать возможность
  // просмотра... учтены ли рекомендации при подборе и какие,
  // соответствие бизнес целям тоже внести".
  trustRecommendations: boolean;
  selectionReasoning: {
    reasoning: {
      category: 'SOLAR_PANEL' | 'BATTERY' | 'CONTROLLER' | 'INVERTER' | 'CABLE' | 'CONNECTOR';
      productName: string;
      priceUsd: number;
      reliabilityConsidered: boolean;
      reliabilityInfluencedChoice: boolean;
      reliabilityScore?: number;
      reliabilityReviewCount?: number;
      reasoning: string;
    }[];
    goalsAlignmentText: string;
  } | null;
  recommendedSpec: {
    productId: string;
    articleNumber: string;
    slug: string;
    name: string;
    category: 'SOLAR_PANEL' | 'BATTERY' | 'CONTROLLER' | 'INVERTER' | 'CABLE' | 'CONNECTOR';
    quantity: number;
    priceUsd: number;
    soldByMeter?: boolean;
  }[];
  exchangeRateUah: string | null;
  exchangeRateDate: string | null;
  totalUah: string | null;
  conversationLog: { role: string; type: string; text?: string; input?: Record<string, unknown>; output?: unknown; at: string }[];
  annotationText: string | null;
  schemaTopology: 'OFF_GRID' | 'BACKUP_UPS' | 'GRID_TIE' | 'COMMERCIAL' | null;
  pdfUrl: string | null;
  generationStatus: 'NOT_REQUESTED' | 'QUEUED' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
}

export interface SchemaTemplateAdmin {
  id: string;
  topology: 'OFF_GRID' | 'BACKUP_UPS' | 'GRID_TIE' | 'COMMERCIAL';
  diagramType: 'BLOCK' | 'PRINCIPAL';
  svgTemplate: string;
  notes: string | null;
  lastAuditReport: string | null;
  lastAuditAt: string | null;
}

// ---- Фаза 4 ----

export interface FinancingProgram {
  id: string;
  name: string;
  eligibility: string;
  description: string;
  url: string;
  discoverySourceUrl: string | null;
  minLoanUsd: string | null;
  maxLoanUsd: string | null;
  imageUrl: string | null;
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  lastVerifiedAt: string | null;
  needsRecheck: boolean;
  createdAt: string;
  // За прямим запитом користувача — "нет защиты от дубликатов"
  similarPublished: { id: string; name: string; url: string } | null;
}

// За прямим запитом користувача — "текст модерируемый в админке"
export interface PendingFinancingReview {
  id: string;
  city: string;
  branch: string;
  businessPlanQualityScore: number;
  bankResponsivenessScore: number;
  processingSpeedScore: number;
  applicationSuccessScore: number;
  coveragePercent: number | null;
  reviewText: string | null;
  createdAt: string;
  financingProgram: { name: string };
}

// За прямим запитом користувача — "отзывы подробно от уже купивших
// этот товар". Той самий патерн модерації, що вже
// PendingFinancingReview.
export interface PendingProductReview {
  id: string;
  reliabilityScore: number;
  reviewText: string | null;
  // За прямим запитом користувача — "фиксировать количество купленных
  // единиц и сколько прошло времени от покупки" — корисно бачити цей
  // контекст саме при модерації, не лише публічно на сторінці товару.
  quantityAtReview: number;
  daysSincePurchaseAtReview: number;
  createdAt: string;
  product: { name: string };
}

// За прямим запитом користувача — "добавить парсер отзывов на
// товары... показать отзывы на нашем сайте с указанием источника".
export interface ImportedProductReviewAdmin {
  id: string;
  vendorName: string;
  sourceUrl: string;
  authorName: string | null;
  ratingRaw: number | null;
  ratingNormalized: number | null;
  reviewText: string;
  publishedAtRaw: string | null;
  scrapedAt: string;
  product: { name: string };
}

export interface BusinessPlanManifest {
  id: string;
  version: number;
  goalTags: string[];
  powerRangeTag: 'SMALL' | 'MEDIUM' | 'LARGE' | 'COMMERCIAL' | null;
  content: string;
  generatedBy: string;
  changeNote: string | null;
  isActive: boolean;
  createdAt: string;
}

export interface TariffRate {
  id: string;
  key: string;
  label: string;
  rateUahPerKwh: string;
  sourceUrl: string | null;
  updatedAt: string;
}

// За прямим запитом користувача — "На вкладке Налаштування добавить
// секцію Налаштування документообігу".
export interface DocumentTypeSetting {
  id: string;
  key: string;
  enabled: boolean;
}

export interface PowerRangeThreshold {
  id: string;
  tag: 'SMALL' | 'MEDIUM' | 'LARGE' | 'COMMERCIAL';
  minPanelsWattW: number;
  maxPanelsWattW: number | null;
  aiSuggestion: string | null;
  updatedAt: string;
}

export interface ScalingThreshold {
  id: string;
  category: string;
  headroomMaxPricePercent: number;
  aiSuggestion: string | null;
  updatedAt: string;
}

export interface EmbedStats {
  totalViews: number;
  topDomains: { host: string; count: number }[];
  timeline: { date: string; count: number }[];
}

// За прямим запитом користувача — "тарифицировать... в токенах и
// деньгах расходы, показать и привязывать к telegram id"
export interface UserUsageSummary {
  userId: string | null;
  telegramId: string | null;
  username: string | null;
  firstName: string | null;
  sessionId: string | null;
  requestCount: number;
  totalTokens: number;
  totalCostUsd: number;
}

export interface GrokUsageSummaryResponse {
  perUser: UserUsageSummary[];
  totalCostUsd: number;
  totalRequests: number;
}

export interface GrokBalanceResponse {
  consoleUrl: string | null;
  diagnostic: string;
}

export interface AdminExpense {
  id: string;
  description: string;
  category: string | null;
  amountUsd: string;
  createdAt: string;
}

export interface ExpenseLogEntry {
  id: string;
  type: 'ai_usage' | 'admin_expense';
  description: string;
  amountUsd: number;
  createdAt: string;
}
