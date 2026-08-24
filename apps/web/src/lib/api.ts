// Знайдено 18.08.2026: `apiGet`/`apiPost` викликаються ВИКЛЮЧНО з
// серверних компонентів (SSR) — жодного клієнтського імпорту немає
// (перевірено по всіх 10 файлах, що імпортують з цього модуля). Раніше
// тут стояв `NEXT_PUBLIC_API_URL` (`http://localhost:3001`) — коректний
// для БРАУЗЕРНОГО коду (тому саме це значення лишається в
// LeadForm.tsx/NovaPoshtaFields.tsx/use-exchange-rate.ts, де `localhost`
// у браузері користувача справді потрапляє на опублікований Docker-порт
// api), але НЕ коректний для SSR-коду, що виконується ВСЕРЕДИНІ
// контейнера `web` — там `localhost` означає сам контейнер `web`, не
// `api` (`TypeError: fetch failed` / `ECONNREFUSED` на кожній сторінці,
// що робить SSR-запит — /batteries, головна, /articles, /products/[slug]
// тощо). API_INTERNAL_URL — та сама серверна змінна, що вже правильно
// прокинута в docker-compose.yml (`http://api:3001`) і в build.args
// (apps/web/Dockerfile) для next.config.mjs rewrites — тепер
// використовується тут так само послідовно.
const API_URL = process.env.API_INTERNAL_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

export async function apiGet<T>(path: string, revalidateSeconds = 60): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    next: { revalidate: revalidateSeconds },
  });
  if (!res.ok) {
    throw new Error(`API GET ${path} failed: ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(`API POST ${path} failed: ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export interface Manufacturer {
  id: string;
  name: string;
  region: 'EUROPE' | 'CHINA';
  logoUrl: string | null;
  country: string;
}

export interface ProductImage {
  id: string;
  url: string;
  altText: string | null;
  sortOrder: number;
}

// Фаза 2: цена/наличие больше не поля Product напрямую — читаются из
// денормализованного кэша (см. packages/db/prisma/schema.prisma), который
// пересчитывается ProductPricingService при изменении siblings.
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
  cachedPriceUsd: string | null;
  cachedInStock: boolean;
  cachedIsPromo: boolean;
  cachedDiscountPercent: number | null;
  cachedWarehouseCities: string[];
  cachedIsNew: boolean;
}

export interface ProductListing {
  id: string;
  sourceListing: {
    priceUsd: string;
    inStock: boolean;
    vendor: { warehouseCities: string[] };
  };
}

export interface ProductDetail extends Product {
  listings: ProductListing[];
  // За прямим запитом користувача — "поле рекомендации (в основном
  // надёжность со скорингом на основе отзывов)". Обчислюється наживо
  // на бекенді (той самий принцип, що вже reviewAggregate для програм
  // кредитування), не денормалізоване поле.
  reviewAggregate: { reviewCount: number; avgReliabilityScore: number | null };
}

export interface ProductReview {
  id: string;
  reliabilityScore: number;
  reviewText: string | null;
  reviewTextStatus: 'PENDING' | 'APPROVED' | 'REJECTED';
  // За прямим запитом користувача — "фиксировать количество купленных
  // единиц и сколько прошло времени от покупки".
  quantityAtReview: number;
  daysSincePurchaseAtReview: number;
  createdAt: string;
  // За прямим запитом користувача — "удалять отзывы (самим покупателем
  // только)" — прапорець для показу кнопок редагувати/видалити лише
  // на власних відгуках, без розкриття чужого userId.
  isMine: boolean;
}

// За прямим запитом користувача — "добавить парсер отзывов на
// товары... показать отзывы на нашем сайте с указанием источника
// отзыва".
export interface ImportedProductReview {
  id: string;
  vendorName: string;
  sourceUrl: string;
  authorName: string | null;
  ratingNormalized: number | null;
  reviewText: string;
  publishedAtRaw: string | null;
}

export interface ReviewableOrderItem {
  orderItemId: string;
  quantity: number;
  purchasedAt: string;
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

export interface ProductListResponse {
  items: Product[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface ExchangeRate {
  currency: string;
  rateUah: string;
  rateDate: string;
}

export interface CartItem {
  id: string;
  productId: string;
  listingId: string | null;
  quantity: number;
  priceSnapshot: string;
  product: Product;
}

export interface Cart {
  id: string;
  items: CartItem[];
  subtotalUsd: number;
}

export interface Order {
  id: string;
  status: 'NEW' | 'INVOICED' | 'PAID' | 'SHIPPED' | 'CANCELLED';
  totalUsd: string;
  totalUah: string;
  ttnNumber: string | null;
  ttnStatus: string;
  invoicePdfUrl: string | null;
  createdAt: string;
  items: { id: string; quantity: number; priceUsd: string; product: Product }[];
}

export interface NpCity {
  ref: string;
  name: string;
  area: string;
}

export interface NpWarehouse {
  ref: string;
  name: string;
  number: string;
}

export interface LoyaltyTier {
  id: string;
  minSpendUah: string;
  discountPercent: number;
}

// ---- Фаза 3: ІІ-калькулятор проєкту (ТЗ п.31) ----

export interface ProjectGoal {
  id: string;
  key: string;
  label: string;
  description: string | null;
  defaultTopology: 'OFF_GRID' | 'BACKUP_UPS' | 'GRID_TIE' | 'COMMERCIAL' | null;
}

export interface ResolvedSpecItem {
  productId: string;
  articleNumber: string;
  slug: string;
  name: string;
  category: 'SOLAR_PANEL' | 'BATTERY' | 'CONTROLLER' | 'INVERTER' | 'CABLE' | 'CONNECTOR';
  quantity: number;
  priceUsd: number;
  soldByMeter?: boolean;
}

export interface GrokRequirements {
  panelsWattTarget: number;
  batteryKwhTarget: number;
  batteryChemistry: string | null;
  controllerType: string | null;
  controllerMinAmps: number;
  confidenceLevel: 'high' | 'medium' | 'low';
  reasoning: string;
}

export interface ProjectEstimate {
  id: string;
  userId: string | null;
  sessionId: string | null;
  name: string;
  city: string | null;
  cityRef: string | null;
  budgetUsd: string | null;
  goals: string[];
  dailyConsumptionKwh: string | null;
  cableRunMeters: string | null;
  financingNeeded: boolean;
  // За прямим запитом користувача — "добавить вопрос кого
  // представляет пользователь".
  clientType: string | null;
  // За прямим запитом користувача — "добавить в квиз опциональность
  // инвертора".
  hasExistingInverter: boolean;
  // За прямим запитом користувача — "реализовать реальную разницу в
  // логике... дать выбрать в квизе".
  scalingStrategy: 'HEADROOM' | 'IDENTICAL_SEGMENTS' | null;
  // За прямим запитом користувача — "внести в квиз вопрос - доверять
  // ли рекомендациям" + "написать обоснование выбора компонентов...
  // учтены ли рекомендации при подборе".
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
  recommendedSpec: ResolvedSpecItem[];
  totalUsd: string;
  exchangeRateUah: string | null;
  exchangeRateDate: string | null;
  totalUah: string | null;
  // За прямим запитом користувача ("показывать как аккордеон... перша
  // вкладка квиз") — тип раніше НЕ відображав `input`/`output`, хоча
  // backend РЕАЛЬНО зберігає їх (calculator.service.ts: `{role:
  // 'user', type: 'quiz', input: dto, at}`) — розширено, щоб коректно
  // прочитати збережені відповіді квизу для показу в акордеоні.
  conversationLog: { role: string; type: string; text?: string; input?: Record<string, unknown>; output?: unknown; at: string }[];
  annotationText: string | null;
  schemaTopology: 'OFF_GRID' | 'BACKUP_UPS' | 'GRID_TIE' | 'COMMERCIAL' | null;
  pdfUrl: string | null;
  status: 'DRAFT' | 'FINALIZED' | 'SENT' | 'CONVERTED_TO_ORDER';
  generationStatus: 'NOT_REQUESTED' | 'QUEUED' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  createdAt: string;
}

export interface CalculatorStepResult {
  estimate: ProjectEstimate;
  requirements: GrokRequirements | null;
  withinBudget: boolean;
  budgetGapUsd: number | null;
  cableWarning?: string;
  blockDiagramSvg: string | null;
}

export interface ExportPackageResult {
  estimate: ProjectEstimate;
  pdfUrl: string;
  principalDiagramSvg: string | null;
  annualKwhEstimate: number | null;
}
