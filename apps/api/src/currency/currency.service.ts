import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

// НБУ курс (ТЗ п.24.2). В Фазе 1 обновление ручное/по запросу (кнопка в
// админке или разовый вызов), полноценный суточный pg_cron-раннер — Фаза 2
// (см. ТЗ п.16/27), но модель ExchangeRate уже финальная, чтобы не мигрировать.
@Injectable()
export class CurrencyService {
  private readonly logger = new Logger(CurrencyService.name);

  constructor(private readonly prisma: PrismaService) {}

  // АУДИТ + запит користувача (27.08.2026). Було так:
  //
  //   return rate ?? { currency, rateUah: 41.5, rateDate: new Date(), ... };
  //
  // Тобто при порожній таблиці метод вигадував курс — і, що гірше,
  // повертав його з СЬОГОДНІШНЬОЮ датою, тобто як абсолютно свіжий. Цей
  // самий метод обслуговує публічний GET /currency/rate, з якого
  // фронтенд бере курс для всіх цін.
  //
  // Поки гривню обирала меншість, це був прихований дефект. Після
  // переходу на гривню за замовчуванням він став критичним: увесь
  // каталог показував би ціни за вигаданим числом, і жоден захист на
  // боці фронтенду не спрацював би — з погляду клієнта курс же прийшов.
  //
  // Тепер null. Викликач зобов'язаний вирішити, що робити: контролер
  // віддає 503, фронтенд показує ціни в доларах (див. formatPrice).
  async getLatestRate(currency = 'USD') {
    return this.prisma.client.exchangeRate.findFirst({
      where: { currency },
      orderBy: { rateDate: 'desc' },
    });
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
  // Перевірка на наявність обох курсів тепер природна: getLatestRate()
  // більше не вигадує фолбек і повертає null, якщо запису немає. Раніше
  // тут стояла окрема перевірка `'id' in cnyRate` — саме тому, що для
  // CNY підставлений курс ДОЛАРА (41.5) дав би конвертацію завищеною
  // разів у шість. Тепер цей клас помилки неможливий у принципі, для
  // будь-якої валюти.
  async convertCnyToUsd(amountCny: number): Promise<number | null> {
    const [cnyRate, usdRate] = await Promise.all([this.getLatestRate('CNY'), this.getLatestRate('USD')]);
    if (!cnyRate || !usdRate) return null;
    const usdRateUah = Number(usdRate.rateUah);
    const cnyRateUah = Number(cnyRate.rateUah);
    if (!Number.isFinite(usdRateUah) || usdRateUah <= 0) return null;
    return Math.round(((amountCny * cnyRateUah) / usdRateUah) * 100) / 100;
  }
}
