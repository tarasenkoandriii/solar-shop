export interface FetchWithRetryOptions extends RequestInit {
  retries?: number;
  backoffMs?: number;
  timeoutMs?: number;
  onRetry?: (attempt: number, error: unknown) => void;
}

// Единая точка ретраев/backoff для всех внешних вызовов (ТЗ п.28.5) —
// адаптеры парсера товаров, NovaPoshtaService, NbuRateService, GrokService,
// парсер статей. Экспоненциальный backoff: backoffMs * 2^attempt.
export async function fetchWithRetry(url: string, options: FetchWithRetryOptions = {}): Promise<Response> {
  const { retries = 3, backoffMs = 500, timeoutMs = 10_000, onRetry, ...fetchOptions } = options;

  let lastError: unknown;

  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const res = await fetch(url, { ...fetchOptions, signal: controller.signal });
      clearTimeout(timeout);

      // 429 повторюємо теж, з паузою від сервера.
      //
      // АУДИТ 25.08.2026: раніше умова була `status >= 500`, тож
      // rate-limit повертався викликачу миттєво як звичайна помилка, а
      // заголовок Retry-After ігнорувався. Для Grok це означало, що
      // короткий сплеск навантаження виглядав як повний збій: виклик
      // повертав null, і застосунок мовчки йшов гілкою "модель не
      // відповіла" — хоча треба було просто зачекати секунду.
      if (!res.ok && res.status === 429 && attempt < retries) {
        const wait = retryAfterMs(res);
        // Сервер попросив чекати довше, ніж ми готові — НЕ ретраїмо
        // взагалі, а віддаємо 429 викликачу.
        //
        // Обрізати таке очікування до ліміту було б гірше за обидва
        // варіанти: ми б зробили ще дві заздалегідь приречені спроби,
        // додали затримки і в деяких лімітерів ще й подовжили бан. А
        // мовчазне подовження прогону тут небезпечне окремо: сусідні
        // джоби рахують свій запас часу з формули "спроби × таймаут +
        // backoff", і зайві секунди сну ламають саме ці розрахунки.
        if (wait === null || wait <= MAX_RETRY_AFTER_MS) {
          lastError = new Error(`HTTP 429 at ${url}`);
          onRetry?.(attempt + 1, lastError);
          await sleep(wait ?? backoffMs * 2 ** attempt);
          continue;
        }
      }

      if (!res.ok && res.status >= 500 && attempt < retries) {
        lastError = new Error(`HTTP ${res.status} at ${url}`);
        onRetry?.(attempt + 1, lastError);
        await sleep(backoffMs * 2 ** attempt);
        continue;
      }

      return res;
    } catch (error) {
      clearTimeout(timeout);
      lastError = error;
      if (attempt < retries) {
        onRetry?.(attempt + 1, error);
        await sleep(backoffMs * 2 ** attempt);
        continue;
      }
    }
  }

  throw lastError instanceof Error ? lastError : new Error(`fetchWithRetry exhausted retries for ${url}`);
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Скільки ми готові чекати за проханням сервера. Більше — не чекаємо і
// не ретраїмо (див. гілку 429 вище).
const MAX_RETRY_AFTER_MS = 5_000;

// Retry-After буває у двох форматах: секунди або HTTP-дата. Повертає
// РЕАЛЬНО запитану паузу, без обрізання — рішення "чекати чи здатись"
// приймає викликач, і для цього йому потрібна справжня величина.
function retryAfterMs(res: Response): number | null {
  const header = res.headers.get('retry-after');
  if (!header) return null;

  const asSeconds = Number(header);
  if (Number.isFinite(asSeconds) && asSeconds >= 0) return asSeconds * 1000;

  const asDate = Date.parse(header);
  if (!Number.isNaN(asDate)) return Math.max(asDate - Date.now(), 0);

  return null;
}
