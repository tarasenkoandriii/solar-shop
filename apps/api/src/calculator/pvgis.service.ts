import { Injectable, Logger } from '@nestjs/common';
import { fetchWithRetry } from '../common/fetch-with-retry';
import { PrismaService } from '../prisma/prisma.service';

// ТЗ п.31.10.2a — интеграция PVGIS (Photovoltaic Geographical Information
// System), бесплатный публичный API Объединённого исследовательского
// центра Еврокомиссии. Эндпоинт и структура ответа (outputs.totals.fixed.
// E_y) подтверждены через web_search документации JRC на этапе написания
// кода — не выдуманы (сеть песочницы не пускает на сам re.jrc.ec.europa.eu,
// поэтому реальный вызов в этой сессии не протестирован).
//
// v5_3, не v5_2 — за прямим запитом користувача ("качай 5.3 pvgis map"),
// підтверджено через web_search: PVGIS 5.3 (реліз-нотатки JRC) додав
// "Data availability has been extended to cover 25 km outside the
// coastline and inside the water areas" — саме те, що вирішує реальний
// прогін: точки (44.3, 31)/(44.3, 32) з логу користувача лежать у
// відкритому Чорному морі південніше материкової України, PVGIS 5.2 (що
// був тут раніше) цю акваторію не покривав узагалі, звідси стабільний
// HTTP 400 на тих самих 2 точках щоразу.
@Injectable()
export class PvgisService {
  private readonly logger = new Logger(PvgisService.name);
  private readonly apiUrl = 'https://re.jrc.ec.europa.eu/api/v5_3/PVcalc';

  constructor(private readonly prisma: PrismaService) {}

  // Кэш практически без срока годности (климатология не меняется год к
  // году) — новый вызов PVGIS только для координат, которых ещё нет в кэше.
  async getAnnualKwhPerKwp(lat: number, lng: number, tiltDegrees = 35, azimuthDegrees = 0): Promise<number | null> {
    const cached = await this.prisma.client.solarYieldEstimate.findUnique({
      where: { lat_lng_tiltDegrees_azimuthDegrees: { lat, lng, tiltDegrees, azimuthDegrees } },
    });
    if (cached) return Number(cached.annualKwhPerKwp);

    const result = await this.fetchFromPvgis(lat, lng, tiltDegrees, azimuthDegrees);
    return result.value;
  }

  // За прямим запитом користувача ("pvgis последние три прохода не
  // дотягивает данные" — стабільно 2 точки падають, прогони по ~1с, явно
  // без реального мережевого запиту з ретраями) — той самий принцип, що
  // вже застосований для financing-програм: реальна причина падіння
  // (HTTP-статус тіло відповіді, або текст винятку) повертається у
  // виклик, а не лише в this.logger.warn() (йде в логи api-контейнера,
  // не в JSON відповіді run-cron-job.js — треба окремо лізти в
  // `docker-compose logs api`, щоб побачити). Використовується
  // SolarMapService.computeRawGridChunk() для прогрес-джоба.
  //
  // permanent: true — підтверджено НАЖИВО на реальному прогоні (не
  // здогад): PVGIS повертає точний текст "Location over the sea. Please,
  // select another location" з HTTP 400 для координат, дійсно поза
  // покриттям джерела даних. Це НІКОЛИ не виправиться повторною
  // спробою — SolarMapService використовує цей прапорець, щоб коректно
  // рахувати isComplete/прогрес (не застрягати на 92% назавжди через
  // точки, що фізично не можуть отримати дані).
  async getAnnualKwhPerKwpWithDiagnostic(
    lat: number,
    lng: number,
    tiltDegrees = 35,
    azimuthDegrees = 0,
  ): Promise<{ value: number | null; diagnostic: string; permanent: boolean }> {
    const cached = await this.prisma.client.solarYieldEstimate.findUnique({
      where: { lat_lng_tiltDegrees_azimuthDegrees: { lat, lng, tiltDegrees, azimuthDegrees } },
    });
    if (cached) return { value: Number(cached.annualKwhPerKwp), diagnostic: 'cached', permanent: false };

    return this.fetchFromPvgis(lat, lng, tiltDegrees, azimuthDegrees);
  }

  private async fetchFromPvgis(
    lat: number,
    lng: number,
    tiltDegrees: number,
    azimuthDegrees: number,
  ): Promise<{ value: number | null; diagnostic: string; permanent: boolean }> {
    try {
      const url = `${this.apiUrl}?lat=${lat}&lon=${lng}&peakpower=1&loss=14&angle=${tiltDegrees}&aspect=${azimuthDegrees}&outputformat=json`;
      const res = await fetchWithRetry(url, { retries: 2, timeoutMs: 15_000 });
      if (!res.ok) {
        const detail = await res.text().catch(() => '');
        this.logger.warn(`PVGIS unavailable for (${lat}, ${lng}): HTTP ${res.status}`);
        // HTTP 4xx (клієнтська помилка) — координати фундаментально
        // невалідні/непокриті, повторна спроба нічого не змінить.
        // HTTP 5xx — сервер тимчасово недоступний, варто спробувати ще
        // раз пізніше.
        const permanent = res.status >= 400 && res.status < 500;
        return { value: null, diagnostic: `HTTP ${res.status}: ${detail.slice(0, 300)}`, permanent };
      }

      const data = (await res.json()) as { outputs?: { totals?: { fixed?: { E_y?: number } } }; message?: string };
      const annualKwhPerKwp = data.outputs?.totals?.fixed?.E_y;
      if (typeof annualKwhPerKwp !== 'number') {
        // PVGIS часто повертає HTTP 200 з JSON-полем "message" при
        // некоректних/непокритих координатах (не HTTP-помилка взагалі) —
        // саме тому найгірший випадок ловиться fetchWithRetry за ~15с*3
        // спроб, а ЦЕЙ конкретний випадок падає майже миттєво (валідна
        // відповідь без потреби ретраїв) — це й пояснює прогони по ~1с
        // для тих самих точок щоразу.
        const reason = data.message ?? 'outputs.totals.fixed.E_y відсутнє у відповіді';
        this.logger.warn(`PVGIS unavailable for (${lat}, ${lng}): ${reason}`);
        return { value: null, diagnostic: reason, permanent: true };
      }

      await this.prisma.client.solarYieldEstimate.create({
        data: { lat, lng, tiltDegrees, azimuthDegrees, annualKwhPerKwp },
      });

      return { value: annualKwhPerKwp, diagnostic: 'OK', permanent: false };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.warn(`PVGIS unavailable for (${lat}, ${lng}): ${message}`);
      return { value: null, diagnostic: message, permanent: false };
    }
  }

  // Ручное обновление кэша из админки (кнопка «Обновить») — TZ п.31.10.2a шаг 2
  async refresh(lat: number, lng: number, tiltDegrees = 35, azimuthDegrees = 0): Promise<number | null> {
    await this.prisma.client.solarYieldEstimate
      .delete({ where: { lat_lng_tiltDegrees_azimuthDegrees: { lat, lng, tiltDegrees, azimuthDegrees } } })
      .catch(() => undefined); // не страшно, если записи ещё не было
    return this.getAnnualKwhPerKwp(lat, lng, tiltDegrees, azimuthDegrees);
  }
}
