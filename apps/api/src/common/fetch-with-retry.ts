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
