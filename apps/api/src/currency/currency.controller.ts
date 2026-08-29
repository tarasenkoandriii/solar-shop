import { Controller, Get, Logger, ServiceUnavailableException } from '@nestjs/common';
import { CurrencyService } from './currency.service';

// Ручной синк курса — теперь через единую точку CronModule (nbu_rate_sync,
// ТЗ п.27.3), как и остальные джобы. POST /currency/rate/sync из Фазы 1
// убран, чтобы не было двух разных путей вызвать одно и то же.
@Controller('currency')
export class CurrencyController {
  constructor(private readonly service: CurrencyService) {}

  private readonly logger = new Logger(CurrencyController.name);

  // Аудит 27.08.2026: раніше сервіс при порожній таблиці вигадував курс
  // 41.5 і віддавав його як справжній — тобто весь фронтенд рахував ціни
  // за неіснуючим числом і не мав жодного способу про це дізнатися.
  //
  // 503, а не 200 із порожнім тілом: для фронтенду це однозначний сигнал
  // "курсу немає", і він показує ціни в доларах замість гривні за
  // вигаданим курсом (див. apps/web/src/lib/currency-context.tsx).
  @Get('rate')
  async getRate() {
    const rate = await this.service.getLatestRate();
    if (!rate) {
      this.logger.error('Курс USD відсутній у базі — GET /currency/rate віддає 503. Запусти крон nbu_rate_sync (адмінка → Крони).');
      throw new ServiceUnavailableException('Курс валют тимчасово недоступний');
    }
    return rate;
  }
}
