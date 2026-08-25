import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

// Асинхронний Batch API xAI — за прямим запитом користувача
// ("используй grok batch job с ожиданием для экономии средств"). Batch API
// коштує на 20-50% дешевше за звичайні синхронні виклики
// (docs.x.ai/developers/pricing#batch-api-pricing), але обробка
// асинхронна (типово до 24 годин, best-effort, НЕ гарантовано) — тому не
// підходить для інтерактивних сценаріїв (калькулятор, дев-логін), але
// ідеально для фонового рерайту/перекладу статей (ArticlesService), де
// користувач і так не чекає результат синхронно.
//
// ⚠️ Точна форма ендпоінтів/полів нижче — НЕ здогад і не буквальне читання
// офіційної документації (яка сама місцями неоднозначна — приклади в
// docs.x.ai одночасно показують і "responses", і "chat_get_completion" як
// назву поля запиту без чіткого пояснення різниці). Це перенесено з коду
// проєкту RoadScout, де ці ендпоінти вже були звірені з РЕАЛЬНИМИ
// відповідями сервера (не тільки документацією):
// - GET /batches/{id} повертає ЛИШЕ вкладений `state.{num_requests,
//   num_pending, num_success, num_error}` — жодного плоского поля
//   "status" немає взагалі, готовність = num_pending === 0
// - Результати — на ендпоінті /results (не /requests — той віддає лише
//   метадані без фактичної відповіді AI)
// - Текст відповіді — `batch_result.response.chat_get_completion.
//   choices[0].message.content` (Chat Completions формат, не Responses
//   API формат, попри поле "responses" у прикладах додавання запитів)
@Injectable()
export class GrokBatchService {
  private readonly logger = new Logger(GrokBatchService.name);
  private readonly baseUrl = 'https://api.x.ai/v1';
  private readonly requestTimeoutMs = 20_000;

  constructor(private readonly config: ConfigService) {}

  private get apiKey(): string | undefined {
    return this.config.get<string>('GROK_API_KEY');
  }

  private headers() {
    return { 'Content-Type': 'application/json', Authorization: `Bearer ${this.apiKey}` };
  }

  private async fetchWithTimeout(url: string, options: RequestInit): Promise<Response> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.requestTimeoutMs);
    try {
      return await fetch(url, { ...options, signal: controller.signal });
    } finally {
      clearTimeout(timeout);
    }
  }

  // Подає ОДНУ пачку запитів до xAI Batch API. Кожен запит — звичайний
  // /v1/chat/completions payload (model+messages+response_format), той
  // самий формат, що вже використовується в GrokService.chatJson — тому
  // існуючі промпти можна переносити без переписування.
  async submitBatch(
    name: string,
    items: {
      batchRequestId: string;
      model: string;
      messages: { role: string; content: string }[];
      // АУДИТ 25.08.2026: тип не мав цього поля, і коментар нижче
      // стверджував, що payload той самий, що в /v1/chat/completions
      // "model+messages+response_format" — але response_format нікуди не
      // передавався. Тобто найбільший за обсягом шлях (до 80 генерацій
      // статей за прогін) працював у вільнотекстовому режимі, хоча
      // синхронні виклики JSON-режим вмикають. Звідси й регулярні
      // невдачі розбору: модель віддавала преамбулу або огорожі.
      responseFormat?: { type: 'json_object' };
    }[],
  ): Promise<{ xaiBatchId: string } | { error: string }> {
    if (!this.apiKey) return { error: 'GROK_API_KEY не задано' };
    if (items.length === 0) return { error: 'Порожній список запитів для пачки' };

    this.logger.log(`[GrokBatch] Створюю пачку "${name}" (${items.length} запитів)...`);

    try {
      const createRes = await this.fetchWithTimeout(`${this.baseUrl}/batches`, {
        method: 'POST',
        headers: this.headers(),
        body: JSON.stringify({ name }),
      });
      if (!createRes.ok) {
        const detail = await createRes.text();
        return { error: `xAI повернув статус ${createRes.status} при створенні пачки: ${detail.slice(0, 300)}` };
      }
      const created = (await createRes.json()) as { id?: string; batch_id?: string };
      const xaiBatchId = created.id ?? created.batch_id;
      if (!xaiBatchId) {
        return { error: `Відповідь xAI не містить ні "id", ні "batch_id": ${JSON.stringify(created).slice(0, 300)}` };
      }

      this.logger.log(`[GrokBatch] Пачка створена: ${xaiBatchId}. Додаю ${items.length} запитів...`);

      const batchRequests = items.map((item) => ({
        batch_request_id: item.batchRequestId,
        batch_request: {
          chat_get_completion: {
            model: item.model,
            ...(item.responseFormat ? { response_format: item.responseFormat } : {}),
            messages: item.messages,
          },
        },
      }));

      const addRes = await this.fetchWithTimeout(`${this.baseUrl}/batches/${xaiBatchId}/requests`, {
        method: 'POST',
        headers: this.headers(),
        body: JSON.stringify({ batch_requests: batchRequests }),
      });
      if (!addRes.ok) {
        const detail = await addRes.text();
        return { error: `xAI повернув статус ${addRes.status} при додаванні запитів: ${detail.slice(0, 300)}` };
      }

      this.logger.log(`[GrokBatch] Пачка ${xaiBatchId} подана повністю (${items.length} запитів). Обробка на боці xAI — типово до 24 годин, перевірка статусу за розкладом.`);
      return { xaiBatchId };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.warn(`Не вдалося подати batch "${name}": ${message}`);
      return { error: message };
    }
  }

  // Опитування статусу — готовність визначається через num_pending === 0
  // (більше нічого не очікує обробки), НЕ через num_success === num_requests
  // (частина запитів могла завершитись помилкою — num_error — і тоді
  // num_success ніколи не дорівнюватиме num_requests, попри те, що batch
  // уже дійсно готовий).
  async getBatchStatus(
    xaiBatchId: string,
  ): Promise<{ totalCount: number; completedCount: number; pendingCount: number; errorCount: number } | null> {
    if (!this.apiKey) return null;

    try {
      const res = await this.fetchWithTimeout(`${this.baseUrl}/batches/${xaiBatchId}`, {
        method: 'GET',
        headers: this.headers(),
      });
      if (!res.ok) {
        this.logger.warn(`getBatchStatus(${xaiBatchId}): HTTP ${res.status}`);
        return null;
      }
      const data = (await res.json()) as { state?: Record<string, number> };
      const state = data.state ?? {};
      return {
        totalCount: state.num_requests ?? 0,
        completedCount: state.num_success ?? 0,
        pendingCount: state.num_pending ?? 0,
        errorCount: state.num_error ?? 0,
      };
    } catch (err) {
      this.logger.warn(`Не вдалося отримати статус batch ${xaiBatchId}: ${err instanceof Error ? err.message : String(err)}`);
      return null;
    }
  }

  // Забирає результати завершеної пачки, розкладені по batch_request_id.
  // Повертає СИРИЙ текст відповіді моделі (не розпарсений) — розбір JSON
  // лишається на відповідальність викликача (ArticlesService), той самий
  // поділ відповідальності, що вже застосований у GrokService.chatJson.
  async getBatchResults(xaiBatchId: string): Promise<Record<string, string>> {
    const resultsByRequestId: Record<string, string> = {};
    if (!this.apiKey) return resultsByRequestId;

    this.logger.log(`[GrokBatch] Забираю результати пачки ${xaiBatchId}...`);

    try {
      let paginationToken: string | undefined;
      let totalItemsSeen = 0;

      // Захист від нескінченного циклу, якщо API поверне некоректний/
      // зациклений pagination_token — краще зупинитись із частковим
      // результатом, ніж зависнути.
      for (let page = 0; page < 50; page++) {
        const url = new URL(`${this.baseUrl}/batches/${xaiBatchId}/results`);
        url.searchParams.set('limit', '100');
        if (paginationToken) url.searchParams.set('pagination_token', paginationToken);

        const res = await this.fetchWithTimeout(url.toString(), { method: 'GET', headers: this.headers() });
        if (!res.ok) {
          this.logger.warn(`getBatchResults(${xaiBatchId}): HTTP ${res.status} на сторінці ${page}`);
          break;
        }
        const data = (await res.json()) as { results?: unknown[]; pagination_token?: string };
        const items = data.results ?? [];
        totalItemsSeen += items.length;

        for (const item of items) {
          const record = item as Record<string, unknown>;
          const batchRequestId = (record.batch_request_id ?? record.custom_id ?? record.id) as string | undefined;
          if (!batchRequestId) continue;

          const text = this.extractBatchResultText(record);
          if (text) resultsByRequestId[batchRequestId] = text;
        }

        paginationToken = data.pagination_token;
        if (!paginationToken) break;
      }

      this.logger.log(`[GrokBatch] Отримано ${Object.keys(resultsByRequestId).length} результатів з ${totalItemsSeen} елементів пачки ${xaiBatchId}.`);
    } catch (err) {
      this.logger.warn(`Не вдалося отримати результати batch ${xaiBatchId}: ${err instanceof Error ? err.message : String(err)}`);
    }

    return resultsByRequestId;
  }

  private extractBatchResultText(item: Record<string, unknown>): string | null {
    const batchResult = item.batch_result as { response?: { chat_get_completion?: { choices?: { message?: { content?: string } }[] } } } | undefined;
    const content = batchResult?.response?.chat_get_completion?.choices?.[0]?.message?.content;
    return typeof content === 'string' ? content : null;
  }
}
