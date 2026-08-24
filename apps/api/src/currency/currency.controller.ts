import { Controller, Get } from '@nestjs/common';
import { CurrencyService } from './currency.service';

// Ручной синк курса — теперь через единую точку CronModule (nbu_rate_sync,
// ТЗ п.27.3), как и остальные джобы. POST /currency/rate/sync из Фазы 1
// убран, чтобы не было двух разных путей вызвать одно и то же.
@Controller('currency')
export class CurrencyController {
  constructor(private readonly service: CurrencyService) {}

  @Get('rate')
  getRate() {
    return this.service.getLatestRate();
  }
}
