import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { fetchWithRetry } from '../common/fetch-with-retry';

export interface SendEmailInput {
  to: string;
  subject: string;
  text: string;
  attachmentUrl?: string; // либо реальная https-ссылка (Vercel Blob), либо data:application/pdf;base64,... фолбэк
}

interface ResolvedAttachment {
  kind: 'link' | 'inline';
  url?: string; // для kind: 'link'
  base64?: string; // для kind: 'inline'
  filename: string;
}

// Найдено при аудите фичи отправки (см. AUDIT-PHASE-3.md): раньше data: URL
// (PDF без настроенного BLOB_READ_WRITE_TOKEN) просто дописывался текстом в
// тело письма — это могло быть несколько мегабайт base64 прямо в тексте
// письма: не рендерится как ссылка, раздувает размер письма, часть
// SMTP-серверов режет такие строки или отклоняет письмо целиком. Теперь
// data: URL распознаётся и прикрепляется как настоящее MIME-вложение.
function resolveAttachment(attachmentUrl: string | undefined): ResolvedAttachment | null {
  if (!attachmentUrl) return null;
  if (attachmentUrl.startsWith('data:application/pdf;base64,')) {
    return { kind: 'inline', base64: attachmentUrl.slice('data:application/pdf;base64,'.length), filename: 'document.pdf' };
  }
  return { kind: 'link', url: attachmentUrl, filename: 'document.pdf' };
}

interface IEmailAdapter {
  send(input: SendEmailInput): Promise<void>;
}

// ТЗ п.31.6 — Resend основной, самописный SMTP-фолбэк (nodemailer), если
// Resend недоступен. Логика переключения — тот же принцип, что у
// fetchWithRetry (п.28.5): ошибка основного пути не роняет всю отправку.
class ResendAdapter implements IEmailAdapter {
  constructor(private readonly apiKey: string) {}

  async send(input: SendEmailInput): Promise<void> {
    const attachment = resolveAttachment(input.attachmentUrl);
    const body: Record<string, unknown> = {
      from: 'Solar Shop <noreply@solarshop.ua>',
      to: [input.to],
      subject: input.subject,
      text: attachment?.kind === 'link' ? `${input.text}\n\nPDF: ${attachment.url}` : input.text,
    };
    // Resend API поддерживает вложения через base64 content — https://resend.com/docs/api-reference/emails/send-email
    if (attachment?.kind === 'inline') {
      body.attachments = [{ filename: attachment.filename, content: attachment.base64 }];
    }

    const res = await fetchWithRetry('https://api.resend.com/emails', {
      method: 'POST',
      retries: 2,
      headers: { Authorization: `Bearer ${this.apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`Resend API error: ${res.status}`);
  }
}

class SmtpAdapter implements IEmailAdapter {
  constructor(
    private readonly host: string,
    private readonly port: number,
    private readonly user: string,
    private readonly password: string,
  ) {}

  async send(input: SendEmailInput): Promise<void> {
    const attachment = resolveAttachment(input.attachmentUrl);
    const transporter = nodemailer.createTransport({
      host: this.host,
      port: this.port,
      secure: this.port === 465,
      auth: { user: this.user, pass: this.password },
    });

    await transporter.sendMail({
      from: this.user,
      to: input.to,
      subject: input.subject,
      text: attachment?.kind === 'link' ? `${input.text}\n\nPDF: ${attachment.url}` : input.text,
      attachments:
        attachment?.kind === 'inline'
          ? [{ filename: attachment.filename, content: attachment.base64, encoding: 'base64' }]
          : undefined,
    });
  }
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  constructor(private readonly config: ConfigService) {}

  async send(input: SendEmailInput): Promise<{ sent: boolean; via: 'resend' | 'smtp' | null; error?: string }> {
    const resendKey = this.config.get<string>('EMAIL_API_KEY');
    if (resendKey) {
      try {
        await new ResendAdapter(resendKey).send(input);
        return { sent: true, via: 'resend' };
      } catch (err) {
        this.logger.warn(`Resend failed, falling back to SMTP: ${err}`);
      }
    }

    const smtpHost = this.config.get<string>('SMTP_HOST');
    const smtpPort = Number(this.config.get<string>('SMTP_PORT') ?? 587);
    const smtpUser = this.config.get<string>('SMTP_USER');
    const smtpPassword = this.config.get<string>('SMTP_PASSWORD');

    if (smtpHost && smtpUser && smtpPassword) {
      try {
        await new SmtpAdapter(smtpHost, smtpPort, smtpUser, smtpPassword).send(input);
        return { sent: true, via: 'smtp' };
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        this.logger.error(`SMTP fallback also failed: ${message}`);
        return { sent: false, via: null, error: message };
      }
    }

    return { sent: false, via: null, error: 'Neither EMAIL_API_KEY (Resend) nor SMTP_* configured' };
  }
}
