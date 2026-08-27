import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PDFDocument, PDFFont, PDFPage, rgb } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import * as fs from 'fs/promises';
import * as path from 'path';
import { PrismaService } from '../prisma/prisma.service';
import { companyInvoiceLines } from '../common/company';

// За прямим запитом користувача — "PDF без пагинации — кошторис
// проєкту и бізнес-план обрезают текст, если не влезает на одну A4
// страницу. Исправь". Реальний стан ДО цього фіксу був навіть гірший
// за очікуване: `generateProjectEstimatePdf()` НЕ мав ЖОДНОЇ перевірки
// меж взагалі — текст просто малювався за візуальними межами
// сторінки (не видно при перегляді, дані фізично існують у PDF, але
// невидимі). `generateBusinessPlanPdf()` мав `if (y < 60) return` —
// ЩЕ ГІРШЕ: `return` всередині `draw()`, викликаної багато разів,
// тихо ігнорував УВЕСЬ подальший текст НАЗАВЖДИ (не лише поточний
// виклик), щойно `y` вперше опускався нижче межі.
//
// Клас нижче — переюзаний ОБОМА PDF-генераторами (не дублювання
// логіки пагінації в кожному місці) — при досягненні нижньої межі
// СТВОРЮЄ нову сторінку (`doc.addPage()`), скидає `y` до верху, і
// ПРОДОВЖУЄ малювати на ній, замість тихого обрізання. Номер сторінки
// у футері — стандартна практика багатосторінкових документів, не
// довільне доповнення.
const PAGE_WIDTH = 595;
const PAGE_HEIGHT = 842;
const TOP_MARGIN = 800;
const BOTTOM_MARGIN = 60;
const LEFT_MARGIN = 50;

class PaginatedPdfWriter {
  private page: PDFPage;
  private y: number;
  private pageCount = 1;

  constructor(
    private readonly doc: PDFDocument,
    private readonly font: PDFFont,
  ) {
    this.page = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    this.y = TOP_MARGIN;
    this.drawPageNumber();
  }

  private drawPageNumber(): void {
    this.page.drawText(`${this.pageCount}`, {
      x: PAGE_WIDTH - 40,
      y: 30,
      size: 9,
      font: this.font,
      color: rgb(0.5, 0.5, 0.5),
    });
  }

  private newPage(): void {
    this.page = this.doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    this.y = TOP_MARGIN;
    this.pageCount++;
    this.drawPageNumber();
  }

  draw(text: string, size = 11, x = LEFT_MARGIN): void {
    const lines = wrapText(text, 90);
    for (const line of lines) {
      if (this.y < BOTTOM_MARGIN) {
        this.newPage();
      }
      this.page.drawText(line, { x, y: this.y, size, font: this.font, color: rgb(0, 0, 0) });
      this.y -= size + 6;
    }
  }

  moveDown(amount: number): void {
    this.y -= amount;
  }
}

// ТЗ п.21 — PDF-счёт заказа, ТЗ п.31.6 — "переиспользуем InvoiceService, тот
// же генератор, только другой шаблон («Смета проекта» вместо «Счёт»)".
// pdf-lib выбран вместо puppeteer (избыточен для serverless-лимитов Vercel
// Hobby). Кириллица требует embed TTF-шрифта — см. assets/fonts/README.md.
@Injectable()
export class InvoiceService {
  private readonly logger = new Logger(InvoiceService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  // ---- Общая PDF-инфраструктура (шрифт, Blob-загрузка) ----

  private async createDocWithFont(): Promise<{ doc: PDFDocument; font: PDFFont }> {
    const doc = await PDFDocument.create();
    doc.registerFontkit(fontkit);

    const fontPath = path.join(__dirname, '../../assets/fonts/NotoSans-Regular.ttf');
    let fontBytes: Buffer;
    try {
      fontBytes = await fs.readFile(fontPath);
    } catch {
      throw new Error(
        `Cyrillic font not found at ${fontPath} — see assets/fonts/README.md. ` +
          `PDF з українською мовою потребує embed TTF-шрифта.`,
      );
    }
    const font = await doc.embedFont(fontBytes, { subset: true });
    return { doc, font };
  }

  private async uploadToBlob(buffer: Buffer, filename: string): Promise<string> {
    const blobToken = this.config.get<string>('BLOB_READ_WRITE_TOKEN');
    if (!blobToken) {
      this.logger.warn(`BLOB_READ_WRITE_TOKEN not configured — ${filename} generated but not persisted to storage`);
      return `data:application/pdf;base64,${buffer.toString('base64')}`;
    }
    const res = await fetch(`https://blob.vercel-storage.com/${filename}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${blobToken}`, 'Content-Type': 'application/pdf' },
      body: new Uint8Array(buffer),
    });
    if (!res.ok) throw new Error(`Failed to upload ${filename} to Vercel Blob: ${res.status}`);
    const data = (await res.json()) as { url: string };
    return data.url;
  }

  // ---- Счёт заказа (ТЗ п.21) ----

  async generatePdf(orderId: string): Promise<Buffer> {
    const order = await this.prisma.client.order.findUniqueOrThrow({
      where: { id: orderId },
      include: { items: { include: { product: true } } },
    });

    const { doc, font } = await this.createDocWithFont();
    const w = new PaginatedPdfWriter(doc, font);

    w.draw('РАХУНОК-ФАКТУРА', 18);
    w.draw(`№ ${order.id.slice(-8).toUpperCase()} від ${order.createdAt.toLocaleDateString('uk-UA')}`, 11);
    w.moveDown(10);

    // Реквізити (27.08.2026) — раніше тут були три рядки-заглушки
    // ("ФОП [ПІБ] (заповнити перед запуском)", "IBAN: [IBAN]"), і саме
    // такий документ їхав покупцю. Джерело одне: common/company.ts.
    for (const line of companyInvoiceLines()) {
      w.draw(line, 10);
    }
    w.moveDown(10);

    w.draw(`Отримувач: ${order.contactName}, ${order.contactPhone}`, 10);
    w.moveDown(10);

    w.draw('Найменування товару', 10);
    w.moveDown(4);
    for (const item of order.items) {
      w.draw(
        `${item.product.articleNumber} · ${item.product.name} × ${item.quantity} = ${(Number(item.priceUsd) * item.quantity).toFixed(2)} USD`,
        10,
      );
    }
    w.moveDown(10);

    w.draw(`Разом до сплати (USD): ${Number(order.totalUsd).toFixed(2)}`, 12);
    w.draw(`Курс НБУ на момент замовлення: ${Number(order.exchangeRateUah).toFixed(4)} грн/USD`, 10);
    w.draw(`Разом до сплати (UAH): ${Number(order.totalUah).toFixed(2)} ₴`, 14);
    if (order.loyaltyDiscountPercent > 0) {
      w.draw(`(враховано знижку постійного клієнта: ${order.loyaltyDiscountPercent}%)`, 9);
    }
    w.moveDown(10);
    w.draw('Ничто так не вселяет уверенность в покупке, как стопроцентная предоплата.', 9);
    w.draw('Відправлення відбувається строго після підтвердження 100% оплати.', 9);

    const pdfBytes = await doc.save();
    return Buffer.from(pdfBytes);
  }

  async generateAndStore(orderId: string): Promise<string> {
    const pdfBuffer = await this.generatePdf(orderId);
    return this.uploadToBlob(pdfBuffer, `invoices/${orderId}.pdf`);
  }

  // ---- Смета проекта калькулятора (ТЗ п.31.6/31.10.3) ----
  // Многостраничный пакет: спецификация → аннотация → блочная схема →
  // принципиальная схема, одним файлом. Схемы вставляются как встроенный
  // SVG-текст не поддерживается pdf-lib напрямую — упрощаем до текстового
  // описания схемы (список блоков и связей) на PDF-странице; сам SVG
  // остаётся доступен пользователю отдельным файлом на экране результата
  // (ТЗ п.31.10.3: "каждый артефакт также доступен для отдельного скачивания").
  async generateProjectEstimatePdf(estimateId: string): Promise<Buffer> {
    const estimate = await this.prisma.client.projectEstimate.findUniqueOrThrow({
      where: { id: estimateId },
    });
    const recommendedSpec = estimate.recommendedSpec as unknown as {
      productId: string;
      articleNumber: string;
      name: string;
      quantity: number;
      priceUsd: number;
    }[];

    const { doc, font } = await this.createDocWithFont();
    const w = new PaginatedPdfWriter(doc, font);

    w.draw('КОШТОРИС ПРОЄКТУ', 18);
    w.draw(`№ ${estimate.id.slice(-8).toUpperCase()} від ${estimate.createdAt.toLocaleDateString('uk-UA')}`, 11);
    if (estimate.city) w.draw(`Місто: ${estimate.city}`, 10);
    w.moveDown(10);

    w.draw('Специфікація', 13);
    for (const item of recommendedSpec) {
      w.draw(`${item.articleNumber} · ${item.name} × ${item.quantity} = ${(item.priceUsd * item.quantity).toFixed(2)} USD`, 10);
    }
    w.moveDown(6);
    w.draw(`Разом (USD): ${Number(estimate.totalUsd).toFixed(2)}`, 12);
    if (estimate.exchangeRateUah) {
      w.draw(`Курс НБУ на дату розрахунку (${estimate.exchangeRateDate?.toLocaleDateString('uk-UA')}): ${Number(estimate.exchangeRateUah).toFixed(4)} грн/USD`, 10);
    }
    if (estimate.totalUah) {
      w.draw(`Разом (UAH): ${Number(estimate.totalUah).toFixed(2)} ₴`, 14);
    }
    w.moveDown(10);

    if (estimate.annotationText) {
      w.draw('Анотація проєкту', 13);
      w.draw(estimate.annotationText, 10);
      w.moveDown(10);
    }

    if (estimate.schemaTopology) {
      w.draw(`Топологія системи: ${estimate.schemaTopology}`, 10);
    }

    w.moveDown(10);
    w.draw(
      'Схема носить ознайомчий характер, не замінює проєкт від сертифікованого електрика; фінальний монтаж має відповідати чинним нормам (ДБН/ПУЕ).',
      9,
    );

    const pdfBytes = await doc.save();
    return Buffer.from(pdfBytes);
  }

  async generateAndStoreProjectEstimatePdf(estimateId: string): Promise<string> {
    const pdfBuffer = await this.generateProjectEstimatePdf(estimateId);
    return this.uploadToBlob(pdfBuffer, `project-estimates/${estimateId}.pdf`);
  }

  // ---- Бізнес-план (ТЗ п.31.11.3) — той самий генератор, шаблон "Бізнес-план" ----

  async generateBusinessPlanPdf(
    estimateId: string,
    content: string | null,
    payback: { paybackYearsMin: number; paybackYearsMax: number; annualKwh: number } | null,
  ): Promise<Buffer> {
    const estimate = await this.prisma.client.projectEstimate.findUniqueOrThrow({ where: { id: estimateId } });

    const { doc, font } = await this.createDocWithFont();
    const w = new PaginatedPdfWriter(doc, font);

    w.draw('БІЗНЕС-ПЛАН ПРОЄКТУ', 18);
    w.draw(`№ ${estimate.id.slice(-8).toUpperCase()} від ${estimate.createdAt.toLocaleDateString('uk-UA')}`, 11);
    w.moveDown(10);

    if (payback) {
      w.draw('Прогноз окупності', 13);
      w.draw(
        `Орієнтовно ${payback.paybackYearsMin.toFixed(1)}–${payback.paybackYearsMax.toFixed(1)} років (річна генерація ~${Math.round(payback.annualKwh)} кВт·год, за даними PVGIS)`,
        10,
      );
      w.draw(
        'Розрахунок базується на кліматологічних даних PVGIS та поточному тарифі, не враховує можливу зміну тарифів, реальний кут встановлення, затінення та якість монтажу. Це орієнтовна оцінка, не гарантія.',
        9,
      );
      w.moveDown(10);
    }

    if (content) {
      w.draw('Опис проєкту', 13);
      w.draw(content, 10);
      w.moveDown(10);
    }

    w.draw('Це не є фінансовою консультацією. Умови кредитування, ставки та вимоги до позичальника уточнюйте безпосередньо в банку/операторі програми на дату звернення.', 9);

    const pdfBytes = await doc.save();
    return Buffer.from(pdfBytes);
  }

  async generateAndStoreBusinessPlanPdf(
    estimateId: string,
    content: string | null,
    payback: { paybackYearsMin: number; paybackYearsMax: number; annualKwh: number } | null,
  ): Promise<string> {
    const pdfBuffer = await this.generateBusinessPlanPdf(estimateId, content, payback);
    return this.uploadToBlob(pdfBuffer, `business-plans/${estimateId}.pdf`);
  }
}

function wrapText(text: string, maxChars: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    if ((current + ' ' + word).trim().length > maxChars) {
      if (current) lines.push(current.trim());
      current = word;
    } else {
      current = `${current} ${word}`.trim();
    }
  }
  if (current) lines.push(current.trim());
  return lines;
}
