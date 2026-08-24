import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PvgisService } from '../calculator/pvgis.service';

export interface PaybackEstimate {
  annualKwh: number;
  rateUahPerKwh: number;
  tariffLabel: string;
  annualSavingsOrIncomeUah: number;
  paybackYearsCentral: number;
  paybackYearsMin: number;
  paybackYearsMax: number;
}

// ТЗ п.31.11.1a — расчёт окупаемости: чистая арифметика над уже
// закэшированными SolarYieldEstimate+TariffRate, Grok здесь не вызывается
// вообще (в отличие от текстовой аннотации) — не создаёт нагрузки на
// бюджет ИИ-вызовов.
@Injectable()
export class PaybackService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly pvgis: PvgisService,
  ) {}

  async compute(estimateId: string): Promise<PaybackEstimate | null> {
    const estimate = await this.prisma.client.projectEstimate.findUnique({ where: { id: estimateId } });
    if (!estimate || !estimate.cityRef) return null;

    const city = await this.prisma.client.novaPoshtaCity.findUnique({ where: { ref: estimate.cityRef } });
    if (!city?.lat || !city?.lng) return null;

    const spec = estimate.recommendedSpec as unknown as { productId: string; category: string; quantity: number }[];
    let panelsWattTotal = 0;
    for (const item of spec.filter((i) => i.category === 'SOLAR_PANEL')) {
      const product = await this.prisma.client.product.findUnique({ where: { id: item.productId } });
      if (product) {
        const powerW = Number((product.specs as Record<string, unknown>).powerW ?? 0);
        panelsWattTotal += powerW * item.quantity;
      }
    }
    if (panelsWattTotal === 0) return null;

    // За прямим запитом користувача — "для бизнес плана перепроверяем
    // данные конкретной локации". На відміну від калькулятора
    // (попередня швидка оцінка, де кешоване значення прийнятне — юзер
    // може міняти вхідні дані десятки разів, кожен PVGIS-запит коштує
    // мережевого часу), бізнес-план — рідкісна, дорога фінальна дія,
    // де точність важливіша за економію на запитах. refresh() замість
    // getAnnualKwhPerKwp() — примусово перезапитує PVGIS щоразу, не
    // покладається на потенційно застаріле кешоване значення (особливо
    // актуально одразу після переходу v5_2 → v5_3, розділ README —
    // старе кешоване значення з версії 5.2 інакше лишилось би "заморожене"
    // назавжди для цього проєкту).
    const perKwp = await this.pvgis.refresh(city.lat, city.lng);
    if (!perKwp) return null;
    const annualKwh = perKwp * (panelsWattTotal / 1000);

    // ТЗ п.31.11.1a шаг 2 — GREEN_TARIFF если цель есть среди выбранных,
    // иначе RETAIL_AVERAGE как приближение экономии на самопотреблении.
    const tariffKey = estimate.goals.includes('GREEN_TARIFF') ? 'GREEN_TARIFF' : 'RETAIL_AVERAGE';
    const tariff = await this.prisma.client.tariffRate.findUnique({
      // Підготовка до мультикраїнності (розділ README) — складений
      // унікальний ключ (countryCode, key), явний "UA" тут, поки вся
      // бізнес-логіка розрахунку окупності однаково національна.
      where: { countryCode_key: { countryCode: 'UA', key: tariffKey } },
    });
    if (!tariff) return null;

    const rateUahPerKwh = Number(tariff.rateUahPerKwh);
    const annualSavingsOrIncomeUah = annualKwh * rateUahPerKwh;
    const totalUah = Number(estimate.totalUah ?? Number(estimate.totalUsd) * (estimate.exchangeRateUah ? Number(estimate.exchangeRateUah) : 41.5));
    const paybackYearsCentral = annualSavingsOrIncomeUah > 0 ? totalUah / annualSavingsOrIncomeUah : Infinity;

    // ТЗ п.31.11.1a шаг 5 — несимметричный диапазон, не точная цифра
    return {
      annualKwh,
      rateUahPerKwh,
      tariffLabel: tariff.label,
      annualSavingsOrIncomeUah,
      paybackYearsCentral,
      paybackYearsMin: paybackYearsCentral * 0.8,
      paybackYearsMax: paybackYearsCentral * 1.25,
    };
  }
}
