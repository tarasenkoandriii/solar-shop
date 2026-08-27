// АУДИТ 27.08.2026 — визначення IP клієнта для лічильників rate limit.
//
// Історія цього файлу варта того, щоб її записати, бо перша спроба
// виправлення була НЕ КРАЩОЮ за початковий баг.
//
// Було: RateLimitGuard читав `request.headers['x-forwarded-for']` напряму.
// Заголовок надсилає клієнт, тож достатньо було ставити в кожен запит
// випадкове значення — і кожен запит отримував власне вікно лічильника.
// Ліміту фактично не існувало, а без захисту лишалися платні ручки: Grok,
// Нова Пошта, НБУ, розсилання кошторисів поштою.
//
// Перша спроба фіксу: `app.set('trust proxy', 1)` + `request.ip`. Виглядає
// канонічно, але не працює. `trust proxy: N` означає "відкинь N записів
// СПРАВА", а проксі ДОПИСУЄ реальний адрес клієнта в кінець списку. Тобто
// на `X-Forwarded-For: 9.9.9.9`, надісланий клієнтом, проксі зробить
// `9.9.9.9, <справжній>` — і Express, відкинувши один запис справа, візьме
// саме підроблений `9.9.9.9`. Перевірено запуском, а не за документацією.
//
// Що працює: заголовок, який виставляє САМА платформа й перезаписує, а не
// доповнює. У Vercel це `x-vercel-forwarded-for`. Клієнтське значення туди
// не потрапляє в принципі, тож підробити його з боку браузера неможливо.
//
// Для іншої платформи заголовок задається змінною TRUSTED_CLIENT_IP_HEADER
// (наприклад, `cf-connecting-ip` для Cloudflare). Якщо довіреного
// заголовка немає — падаємо на `request.ip`, який при `trust proxy: 0`
// дорівнює адресі сокета: це може згрупувати всіх користувачів за одним
// IP проксі (ліміт стане надто суворим), але НЕ дає його обійти. З двох
// способів помилитися це безпечніший.
const DEFAULT_TRUSTED_HEADER = 'x-vercel-forwarded-for';

interface IpRequest {
  headers: Record<string, string | string[] | undefined>;
  ip?: string;
}

export function resolveClientIp(request: IpRequest): string {
  const headerName = (process.env.TRUSTED_CLIENT_IP_HEADER ?? DEFAULT_TRUSTED_HEADER).toLowerCase();
  const raw = request.headers[headerName];
  const value = Array.isArray(raw) ? raw[0] : raw;

  if (typeof value === 'string') {
    // Навіть довірений заголовок буває списком — беремо перший запис.
    const first = value.split(',')[0]?.trim();
    if (first) return first;
  }

  return request.ip ?? 'unknown';
}
