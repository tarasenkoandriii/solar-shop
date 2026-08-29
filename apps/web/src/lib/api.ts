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

// АУДИТ 29.08.2026 — знайдено наживо на карті сонячного потенціалу.
//
// Симптом: адмінка звітує "589/629 точок, ПОВНІСТЮ ЗІБРАНО ✅", сам
// ендпоінт /solar-map/grid у браузері віддає 1647 клітинок, а сторінка
// вперто малює "Дані сітки ще не розраховані". Перевірено на свіжому
// рендері (x-vercel-cache: MISS, age: 0) — у RSC-payload приходило
// `{"points":[]}`.
//
// Причина: Next.js Data Cache. `apiGet(path, 86400)` ставить fetch у кеш
// на добу, а кешується РЕЗУЛЬТАТ, включно з порожнім. Сітка ще не була
// порахована → API чесно віддав `[]` → цей `[]` ліг у Data Cache на 24
// години. Далі не рятує нічого: сторінка `force-dynamic`, кеш сторінки
// вимкнено, дані в БД уже є — а кожен рендер усе одно бере `[]` із
// Data Cache. Vercel до того ж зберігає Data Cache МІЖ деплоями, тож
// навіть редеплой не прибирає застряглу порожню відповідь. Виклик із
// браузера через rewrite /api/* Data Cache не проходить — саме тому
// "в браузері дані є, а на сторінці немає".
//
// Лікування: для списків, порожнеча яких означає "ще не готово, але
// колись з'явиться", порожня відповідь НЕ приймається з кешу — робимо
// один некешований повтор. Ціна помилки асиметрична: зайвий запит до
// API поки даних справді немає — проти доби мовчазно порожньої карти
// після того, як дані вже з'явились.
export async function apiGetNonEmptyList<T>(path: string, revalidateSeconds = 3600): Promise<T[]> {
  const cached = await apiGet<T[]>(path, revalidateSeconds);
  if (Array.isArray(cached) && cached.length > 0) return cached;

  // Окремий URL — НЕ забаганка. Крім Data Cache, Next.js мемоїзує
  // однакові fetch у межах ОДНОГО рендера, і `cache:'no-store'` від
  // цього не рятує: перевірено на `next start` зі стабом — повтор
  // повертав той самий порожній масив, не роблячи мережевого запиту
  // взагалі (стаб бачив 1 виклик замість 2), тож перший рендер після
  // кешування порожнечі все одно віддавав порожню сторінку. Різний URL
  // робить запит іншим і для мемоїзації, і для Data Cache. Бекенду цей
  // параметр байдужий: getGrid() не оголошує @Query, тож глобальний
  // ValidationPipe до query-параметрів навіть не заглядає.
  //
  // Хвилинний БУКЕТ, а не Date.now(), і revalidate замість no-store —
  // навмисно. Порожня відповідь тут не завжди аномалія: поки крон
  // збирає сітку (629 точок, кілька прогонів по ~200с) вона
  // ЗАКОНОМІРНО порожня, і унікальний URL на кожен рендер означав би
  // повний обхід кешу на кожен запит до трьох публічних сторінок —
  // включно з /embed/solar-map, який вбудовується в чужі сайти й не
  // має rate-limit. Букет обмежує це одним реальним запитом за
  // хвилину на весь інстанс, а дані все одно з'являються протягом
  // хвилини після того, як вони справді з'явились.
  const bucket = Math.floor(Date.now() / 60_000);
  const bust = `${path.includes('?') ? '&' : '?'}_fresh=${bucket}`;
  const fresh = await fetch(`${API_URL}${path}${bust}`, { next: { revalidate: 60 } });
  if (!fresh.ok) throw new Error(`API GET ${path} failed: ${fresh.status}`);
  const data = (await fresh.json()) as unknown;
  // Перша гілка вище перевіряє Array.isArray, ця мусить теж: без цього
  // 200 з об'єктом замість масиву проходив би далі, `points.length`
  // ставав би undefined, порожня гілка в SolarPotentialMap не
  // спрацьовувала б — і об'єкт долітав би до leaflet.heat уже в
  // браузері (падіння замість акуратного повідомлення).
  return Array.isArray(data) ? (data as T[]) : [];
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

// Аудит 27.08.2026: тут було оголошено `sourceListing.priceUsd` і повний
// `vendor`. Бекенд справді їх віддавав — тобто закупівельна ціна кожного
// постачальника й уся його картка (телефон, контактна особа, статус
// договору) лежали у відповіді публічної картки товару. Жоден компонент
// їх не читав: `listings` у apps/web не використовується ніде, це був
// чистий витік. Тип приведено до того, що бекенд віддає ТЕПЕР, — щоб
// наступний, хто сюди зазирне, не відновив поле "бо в типі ж є".
export interface ProductListing {
  id: string;
  sourceListing: {
    id: string;
    inStock: boolean;
    isPromo: boolean;
    discountPercent: number | null;
    vendor: { id: string; name: string; warehouseCities: string[]; countryCode: string };
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
    // Аудит 27.08.2026: попередження про акумулятори зберігається сюди, а
    // не лише в відповіді start/refine. Сторінка результату читає
    // збережений estimate, тож транзитне поле відповіді до неї не
    // доходило б узагалі — саме так уже сталося з cableWarning, який
    // існує в типі, але на сторінці продубльований окремою перевіркою.
    batteryWarning?: string;
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
