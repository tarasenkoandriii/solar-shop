import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { fetchWithRetry } from '../common/fetch-with-retry';

// ТЗ п.28.1 — уведомления менеджеру через того же бота, что и TMA/Login
// Widget (не отдельный). Триггеры вызываются точечно из OrdersService/
// CronModule в нужных местах (см. вызовы notifyNewOrder/notifyOrderPaid/...).
@Injectable()
export class NotifyService {
  private readonly logger = new Logger(NotifyService.name);

  constructor(private readonly config: ConfigService) {}

  async notifyNewOrder(order: { id: string; contactName: string; contactPhone: string; totalUah: number; itemsSummary: string }) {
    await this.send(
      `🆕 Нове замовлення #${order.id.slice(-8)}\n` +
        `${order.contactName}, ${order.contactPhone}\n` +
        `${order.itemsSummary}\n` +
        `Сума: ${order.totalUah.toLocaleString('uk-UA')} ₴`,
    );
  }

  async notifyOrderPaid(orderId: string) {
    await this.send(`✅ Замовлення #${orderId.slice(-8)} оплачено — можна передавати перевізнику`);
  }

  async notifyTtnCreationFailed(orderId: string, reason: string) {
    await this.send(`⚠️ Не вдалось автоматично створити ТТН для замовлення #${orderId.slice(-8)}: ${reason}\nСтворіть вручну в адмінці.`);
  }

  async notifyCronFailed(jobKey: string, errorMessage: string) {
    await this.send(`❌ Крон-джоб "${jobKey}" завершився з помилкою:\n${errorMessage}`);
  }

  async notifyLead(lead: { name: string; phone: string; comment?: string | null }) {
    await this.send(`📩 Нове звернення з сайту\n${lead.name}, ${lead.phone}${lead.comment ? `\n"${lead.comment}"` : ''}`);
  }

  // ТЗ п.31.8 — новый расчёт калькулятора тоже тёплый лид, даже если ещё не Order
  async notifyCalculatorLead(estimate: { id: string; city: string | null; totalUsd: number; goals: string[] }) {
    await this.send(
      `🧮 Новий розрахунок калькулятора #${estimate.id.slice(-8)}\n` +
        `Місто: ${estimate.city ?? '—'}\n` +
        `Цілі: ${estimate.goals.join(', ') || '—'}\n` +
        `Орієнтовна сума: $${estimate.totalUsd.toFixed(2)}`,
    );
  }

  // ТЗ п.31.6 — отправка PDF конкретному пользователю в его личный чат с
  // ботом (не менеджеру) — используется калькулятором для канала Telegram.
  // Требует, чтобы пользователь хотя бы раз открыл диалог с ботом (typично
  // выполняется автоматически при Telegram Login/TMA), иначе Telegram
  // вернёт 403 "bot was blocked by the user" / "chat not found" — тогда
  // отправка молча логируется как неудачная, не бросает исключение наружу
  // (сам PDF всё равно доступен по ссылке в личном кабинете).
  async sendDocumentToUser(telegramId: string, documentUrl: string, caption: string): Promise<boolean> {
    const botToken = this.config.get<string>('TELEGRAM_BOT_TOKEN');
    if (!botToken) {
      this.logger.warn('TELEGRAM_BOT_TOKEN not configured — skipping document send');
      return false;
    }
    // data: URL (фолбэк без Vercel Blob) нельзя передать в sendDocument как document — Telegram
    // ожидает реальный http(s) URL или multipart-заливку файла.
    if (documentUrl.startsWith('data:')) {
      this.logger.warn('Cannot send data: URL document via Telegram sendDocument — needs a real https URL (BLOB_READ_WRITE_TOKEN not configured?)');
      return false;
    }

    try {
      const res = await fetchWithRetry(`https://api.telegram.org/bot${botToken}/sendDocument`, {
        method: 'POST',
        retries: 2,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: telegramId, document: documentUrl, caption }),
      });
      return res.ok;
    } catch (err) {
      this.logger.error(`Failed to send document to user ${telegramId}`, err as Error);
      return false;
    }
  }

  private async send(text: string): Promise<void> {
    const botToken = this.config.get<string>('TELEGRAM_BOT_TOKEN');
    const chatId = this.config.get<string>('TELEGRAM_MANAGER_CHAT_ID');
    if (!botToken || !chatId) {
      this.logger.warn('TELEGRAM_BOT_TOKEN/TELEGRAM_MANAGER_CHAT_ID not configured — skipping notification');
      return;
    }

    try {
      await fetchWithRetry(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST',
        retries: 2,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, text }),
      });
    } catch (err) {
      this.logger.error('Failed to send Telegram notification', err as Error);
    }
  }
}
