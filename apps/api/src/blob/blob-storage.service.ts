import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

// Спільна обгортка над Vercel Blob REST API.
//
// Логіка PUT на blob.vercel-storage.com уже існувала в двох місцях —
// InvoiceService (PDF рахунків) і ArticlesService (обкладинки статей), у
// кожного своя копія з власним фолбеком. Третю копію для картинок товарів
// свідомо НЕ пишемо: замість цього тут одна реалізація транспорту, а
// РІШЕННЯ "що робити, коли не вийшло" лишається за викликачем — саме воно
// в цих трьох випадках і відрізняється (рахунок падає на data: URL, стаття
// й товар — на пряме посилання на джерело).
//
// SDK @vercel/blob навмисно не додаємо: у проєкті його немає в
// залежностях, а весь потрібний обсяг — це один PUT з Bearer-токеном.
//
// Наявні InvoiceService/ArticlesService НЕ чіпаємо в межах цієї задачі —
// вони працюють, і переписувати робочий код заради краси означало б
// ризикувати виставленням рахунків. Але коли до них дійдуть руки —
// переводити слід сюди.
@Injectable()
export class BlobStorageService {
  private readonly logger = new Logger(BlobStorageService.name);

  constructor(private readonly config: ConfigService) {}

  isConfigured(): boolean {
    return Boolean(this.config.get<string>('BLOB_READ_WRITE_TOKEN'));
  }

  // Чи вказує посилання вже на наше сховище. Треба і фронтенду (щоб знати,
  // чи можна проганяти картинку через next/image), і джобу дзеркалювання
  // (щоб не завантажувати на Blob те, що вже на Blob).
  static isBlobUrl(url: string): boolean {
    try {
      return new URL(url).hostname.endsWith('.public.blob.vercel-storage.com');
    } catch {
      return false;
    }
  }

  // Повертає публічний URL завантаженого файлу або null, якщо не вийшло.
  // Свідомо НЕ кидає: усі три виклики мають власний м'який фолбек, і
  // жоден із них не має падати через недоступність сховища картинок.
  async upload(pathname: string, contentType: string, body: Buffer, timeoutMs = 15_000): Promise<string | null> {
    const token = this.config.get<string>('BLOB_READ_WRITE_TOKEN');
    if (!token) return null;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(`https://blob.vercel-storage.com/${pathname}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': contentType,
          // Свідомо РІВНО той набір заголовків, який уже роками працює в
          // InvoiceService і ArticlesService. Спокуса додати
          // x-add-random-suffix / x-cache-control-max-age (реальні опції
          // SDK) відхилена: перевірити їх проти живого Blob неможливо, а
          // ціна помилки несиметрична — якщо Blob відповість 400 на
          // невідомий заголовок, поламається дзеркалювання ВСЬОГО каталогу.
          // Детермінованість шляху нам і не потрібна: від повторних
          // завантажень захищає перевірка в БД (resolveBlobUrl).
        },
        // new Uint8Array(...) — той самий виклик, що вже в
        // ArticlesService: Buffer напряму не підходить під тип BodyInit.
        body: new Uint8Array(body),
        signal: controller.signal,
      });
      if (!res.ok) {
        this.logger.warn(`Vercel Blob PUT ${pathname}: HTTP ${res.status}`);
        return null;
      }
      const data = (await res.json()) as { url?: string };
      return data.url ?? null;
    } catch (err) {
      this.logger.warn(`Vercel Blob PUT ${pathname} не вдався: ${err instanceof Error ? err.message : String(err)}`);
      return null;
    } finally {
      clearTimeout(timeout);
    }
  }
}
