import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

// НБУ курс (ТЗ п.24.2). В Фазе 1 обновление ручное/по запросу (кнопка в
// админке или разовый вызов), полноценный суточный pg_cron-раннер — Фаза 2
// (см. ТЗ п.16/27), но модель ExchangeRate уже финальная, чтобы не мигрировать.
@Injectable()
export class CurrencyService {
  private readonly logger = new Logger(CurrencyService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getLatestRate(currency = 'USD') {
    const rate = await this.prisma.client.exchangeRate.findFirst({
      where: { currency },
      orderBy: { rateDate: 'desc' },
    });
    return rate ?? { currency, rateUah: 41.5, rateDate: new Date(), fetchedAt: new Date() };
  }

  // Дёргает публичный API НБУ, ключ не нужен (ТЗ п.24.2). НБУ — центробанк
  // саме України, тому цей метод завжди пише countryCode: 'UA' явно —
  // підготовка до мультикраїнності не означає, що кожен окремий парсер
  // одразу стає мультикраїнним, лише що модель БД це витримає пізніше.
  async syncFromNbu(currency = 'USD') {
    const url = `https://bank.gov.ua/NBUStatService/v1/statdirectory/exchange?valcode=${currency}&json`;
    try {
      const res = await fetch(url);
      const data = (await res.json()) as Array<{ rate: number; exchangedate: string }>;
      const entry = data[0];
      if (!entry) throw new Error('Empty NBU response');

      const [day, month, year] = entry.exchangedate.split('.');
      const rateDate = new Date(`${year}-${month}-${day}`);

      return this.prisma.client.exchangeRate.upsert({
        where: { countryCode_currency_rateDate: { countryCode: 'UA', currency, rateDate } },
        create: { currency, rateUah: entry.rate, rateDate, countryCode: 'UA' },
        update: { rateUah: entry.rate },
      });
    } catch (err) {
      this.logger.error('Failed to sync NBU rate', err as Error);
      throw err;
    }
  }

  // За прямим запитом користувача — реалізація doc/TZ_ImportScout.md
  // розділ 2.4/4: "1688 дає ціни в юанях... конвертація — детермінований
  // крок бекенду, не LLM". НБУ публікує курс ВСІХ валют (включно з CNY)
  // через ТОЙ САМИЙ публічний API, що вже syncFromNbu() вище — не
  // потрібен новий зовнішній сервіс. Крос-курс CNY→USD = (CNY→UAH) /
  // (USD→UAH), обидва вже доступні через getLatestRate().
  //
  // ⚠️ getLatestRate() повертає fallback-об'єкт (без `id`, rateUah:
  // 41.5) якщо курс ще не синхронізовано — для USD цей фолбек
  // прийнятний (41.5 — розумний дефолт USD/UAH, вже так у решті
  // проєкту). Для CNY той самий фолбек був би АБСУРДНИМ (41.5 — курс
  // ДОЛАРА, не юаня, дав би курс конвертації у ~6 разів завищеним) —
  // тому перевірка на реальний запис (`'id' in`) ОБОВ'ЯЗКОВА саме тут,
  // не косметична.
  async convertCnyToUsd(amountCny: number): Promise<number | null> {
    const [cnyRate, usdRate] = await Promise.all([this.getLatestRate('CNY'), this.getLatestRate('USD')]);
    if (!('id' in cnyRate)) return null; // курс CNY ще не синхронізовано — виклик має явно обробити null, не отримати абсурдне число
    const usdRateUah = Number(usdRate.rateUah); // fallback тут безпечний, той самий дефолт, що вже в решті проєкту
    const cnyRateUah = Number(cnyRate.rateUah);
    return Math.round(((amountCny * cnyRateUah) / usdRateUah) * 100) / 100;
  }
}
