import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { fetchWithRetry } from '../common/fetch-with-retry';
import { PrismaService } from '../prisma/prisma.service';

// Nova Poshta API v2.0 client — портировано из проверенного в проде адаптера
// (SilverFinance/sibionics-ai lineage, silverfinance-main/src/lib/server/
// nova-poshta.ts), а не написано с нуля. Ключевые вещи, взятые как есть,
// потому что уже отработали на живом трафике:
// - `Address.searchSettlements` для поиска городов (не `getSettlements` —
//   последний для полного дампа справочника, первый — именно под
//   автокомплит по запросу пользователя и отдаёт нужный `DeliveryCity` ref)
// - двойной фолбэк CityRef → SettlementRef при получении отделений (не
//   у всех населённых пунктов совпадает)
// - точная структура полей `InternetDocument/save`, нормализация телефона
//   в формат 380XXXXXXXXX
@Injectable()
export class NovaPoshtaService {
  private readonly logger = new Logger(NovaPoshtaService.name);
  private readonly apiUrl: string;

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    this.apiUrl = this.config.get<string>('NOVA_POSHTA_API_URL') ?? 'https://api.novaposhta.ua/v2.0/json/';
  }

  private env(key: string, fallback = ''): string {
    return this.config.get<string>(key) ?? fallback;
  }

  // АУДИТ 27.08.2026 — параметр `retries` тут зʼявився не просто так.
  //
  // Було: `retries: 2` для ВСІХ викликів без розбору. Але API Нової Пошти —
  // це один URL і один POST на будь-яку дію, тож той самий ретрай діяв і на
  // читання довідників (безпечно), і на InternetDocument/save — створення
  // накладної. fetchWithRetry повторює запит і при таймауті (10 с), і при
  // 5xx; НП під навантаженням відповідає довше 10 с, УЖЕ створивши
  // документ. Ми цієї відповіді не дочікувалися й слали запит ще раз — до
  // трьох фізичних наклейок на одне замовлення, три оплати доставки і
  // ручне скасування зайвих.
  //
  // Ідемпотентного ключа НП не підтримує, тому єдиний правильний варіант —
  // не повторювати те, що змінює стан. Виклики, які створюють або
  // видаляють документи, тепер передають retries: 0 явно.
  private async npRequest(
    modelName: string,
    calledMethod: string,
    methodProperties: Record<string, unknown>,
    retries = 2,
    timeoutMs = 10_000,
  ): Promise<{ data: unknown[] }> {
    const apiKey = this.env('NOVA_POSHTA_API_KEY');
    if (!apiKey) throw new Error('NOVA_POSHTA_API_KEY not set');

    const res = await fetchWithRetry(this.apiUrl, {
      method: 'POST',
      retries,
      timeoutMs,
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify({ apiKey, modelName, calledMethod, methodProperties }),
    });

    const text = await res.text();
    let payload: {
      success?: boolean;
      data?: unknown[];
      errors?: string[];
      warnings?: string[];
      errorCodes?: string[];
    };
    try {
      payload = JSON.parse(text);
    } catch {
      throw new Error(`Nova Poshta non-JSON response: ${text.slice(0, 300)}`);
    }

    if (!res.ok || payload.success === false) {
      const details = [...(payload.errors ?? []), ...(payload.warnings ?? []), ...(payload.errorCodes ?? [])].filter(
        Boolean,
      );
      throw new Error(details.length ? details.join('; ') : `Nova Poshta HTTP ${res.status}`);
    }

    return { data: payload.data ?? [] };
  }

  private normalizePhone(phone: string): string {
    const d = phone.replace(/\D/g, '');
    if (d.startsWith('380')) return d;
    if (d.startsWith('0')) return `38${d}`;
    return d;
  }

  private npDate(date = new Date()): string {
    return new Intl.DateTimeFormat('uk-UA', {
      timeZone: 'Europe/Kyiv',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
      .format(date)
      .replace(/\//g, '.');
  }

  // Автокомплит города при чекауті (ТЗ п.22.1) — живий пошук через
  // searchSettlements (не з локального кешу), той самий метод, що вже
  // перевірений у SilverFinance.
  async searchCities(query: string): Promise<{ ref: string; name: string; area: string }[]> {
    if (!query || query.trim().length < 2) return [];
    const { data } = await this.npRequest('Address', 'searchSettlements', { CityName: query.trim(), Limit: '15' });
    const addresses = ((data[0] as { Addresses?: unknown[] })?.Addresses ?? []) as Array<{
      DeliveryCity?: string;
      Ref?: string;
      MainDescription?: string;
      Present?: string;
      Area?: string;
      ParentRegionTypes?: string;
    }>;
    return addresses
      .map((a) => ({
        ref: a.DeliveryCity || a.Ref || '',
        name: a.MainDescription || a.Present || '',
        area: a.Area || a.ParentRegionTypes || '',
      }))
      .filter((c) => c.ref);
  }

  async getWarehouses(cityRef: string, query = ''): Promise<{ ref: string; name: string; number: string }[]> {
    if (!cityRef) return [];
    const map = (data: unknown[]) =>
      (data as Array<{ Ref?: string; Description?: string; Number?: string | number }>)
        .map((w) => ({ ref: w.Ref ?? '', name: w.Description ?? '', number: String(w.Number ?? '') }))
        .filter((w) => w.ref);

    const find = query.trim() ? { FindByString: query.trim() } : {};

    let { data } = await this.npRequest('Address', 'getWarehouses', { CityRef: cityRef, Limit: '500', ...find });
    let rows = map(data);

    if (rows.length === 0) {
      ({ data } = await this.npRequest('Address', 'getWarehouses', { SettlementRef: cityRef, Limit: '500', ...find }));
      rows = map(data);
    }
    return rows;
  }

  // ТЗ п.22.2 — создаётся сразу при сабмите заказа, до оплаты. Ошибка НЕ
  // бросается наружу — возвращается { status: 'failed' }, вызывающий код
  // (OrdersService) решает, что делать (как в SilverFinance: заказ создаётся
  // в любом случае, TTN можно досоздать вручную).
  async createTtn(input: {
    recipientName: string;
    recipientPhone: string;
    cityName: string;
    warehouseRef?: string;
    branchName: string;
    description: string;
    costUah: number;
  }): Promise<{ status: 'created' | 'failed'; ttn?: string; uuid?: string; error?: string }> {
    try {
      const weight = Number(this.env('NOVA_POSHTA_DEFAULT_WEIGHT_KG', '0.5')) || 0.5;
      const props: Record<string, unknown> = {
        PayerType: this.env('NOVA_POSHTA_PAYER_TYPE', 'Recipient'),
        PaymentMethod: this.env('NOVA_POSHTA_PAYMENT_METHOD', 'Cash'),
        CargoType: this.env('NOVA_POSHTA_CARGO_TYPE', 'Parcel'),
        VolumeGeneral: this.env('NOVA_POSHTA_DEFAULT_VOLUME', '0.002'),
        Weight: String(weight),
        ServiceType: 'WarehouseWarehouse',
        SeatsAmount: '1',
        Description: input.description.slice(0, 100),
        Cost: String(Math.max(1, Math.round(input.costUah))),
        CitySender: this.env('NOVA_POSHTA_CITY_SENDER_REF'),
        Sender: this.env('NOVA_POSHTA_SENDER_REF'),
        SenderAddress: this.env('NOVA_POSHTA_SENDER_ADDRESS_REF'),
        ContactSender: this.env('NOVA_POSHTA_CONTACT_SENDER_REF'),
        SendersPhone: this.normalizePhone(this.env('NOVA_POSHTA_SENDER_PHONE')),
        RecipientCityName: input.cityName,
        RecipientName: input.recipientName,
        RecipientType: 'PrivatePerson',
        RecipientsPhone: this.normalizePhone(input.recipientPhone),
        DateTime: this.npDate(),
        NewAddress: '1',
      };

      if (input.warehouseRef) {
        props.RecipientAddress = input.warehouseRef;
      } else {
        props.RecipientAddressName = input.branchName.replace(/\D/g, '') || input.branchName;
      }

      // retries: 0 — створення накладної неідемпотентне, повтор друкує
      // зайву наклейку. Див. коментар до npRequest().
      //
      // timeoutMs піднято до 30 с саме тому, що ретраїв більше немає:
      // з дефолтними 10 с повільна, але УСПІШНА відповідь НП тепер
      // поверталася б як { status: 'failed' }, менеджер створював би ТТН
      // руками — і дублікат просто переїхав би з автоматичного в ручний.
      const { data } = await this.npRequest('InternetDocument', 'save', props, 0, 30_000);
      const first = (data[0] ?? {}) as { IntDocNumber?: string; Number?: string; Ref?: string };
      const ttn = first.IntDocNumber || first.Number;
      if (!ttn) return { status: 'failed', error: 'No TTN returned' };
      return { status: 'created', ttn, uuid: first.Ref };
    } catch (e) {
      this.logger.warn(`createTtn failed: ${e instanceof Error ? e.message : e}`);
      return { status: 'failed', error: e instanceof Error ? e.message : 'TTN error' };
    }
  }

  // АУДИТ 27.08.2026. Було: публічний getPrintLabelUrl(), який вклеював
  // NOVA_POSHTA_API_KEY прямо в URL, — і цей URL повертався в браузер
  // адміна як тіло відповіді ТА записувався в Order.ttnLabelUrl. Тобто
  // ключ, яким створюються й видаляються накладні, осідав в історії
  // браузера, у devtools і назавжди в базі. (Окремо: кнопка "Друк
  // накладної" в адмінці цей URL просто відкидала — фіча й не працювала.)
  //
  // Тепер ключ не залишає сервера: ми самі забираємо PDF і віддаємо байти.
  private buildPrintLabelUrl(ttnRefs: string[]): string {
    const apiKey = this.env('NOVA_POSHTA_API_KEY');
    const refsParam = ttnRefs.join(',');
    return `https://my.novaposhta.ua/orders/printMarking60x100/orders[]/${refsParam}/type/pdf/apiKey/${apiKey}`;
  }

  async fetchPrintLabelPdf(ttnRefs: string[]): Promise<Buffer> {
    if (ttnRefs.length === 0) throw new Error('Не передано жодного ТТН для друку');
    // retries: 2 тут доречні — це GET, читання, повтор нічого не створює.
    const res = await fetchWithRetry(this.buildPrintLabelUrl(ttnRefs), { retries: 2, timeoutMs: 20_000 });
    if (!res.ok) {
      // Свідомо НЕ додаємо в текст помилки сам URL — у ньому ключ.
      throw new Error(`Нова Пошта віддала HTTP ${res.status} на друк накладної`);
    }

    // my.novaposhta.ua — це кабінет, а не API: при неправильному або
    // простроченому ключі він віддає HTML-сторінку логіна з кодом 200.
    // Без цієї перевірки ми б загорнули HTML у Content-Type: application/pdf
    // і адмін отримав би порожню вкладку без жодного натяку на причину.
    const contentType = (res.headers.get('content-type') ?? '').toLowerCase();
    if (!contentType.includes('pdf')) {
      throw new Error(`Нова Пошта повернула не PDF (${contentType || 'без типу'}) — найімовірніше, NOVA_POSHTA_API_KEY недійсний або прострочений.`);
    }

    return Buffer.from(await res.arrayBuffer());
  }

  async deleteTtn(ttnRef: string): Promise<void> {
    // На відміну від createTtn, ретраї тут ЗАЛИШАЮТЬСЯ. Спершу я їх теж
    // прибрав "за симетрією" — і це було б погіршенням: видалення за
    // конкретним DocumentRef ідемпотентне за своєю природою (повтор у
    // найгіршому разі дасть "документа не існує" на вже видаленому), тож
    // ретрай нічого не псує, а без нього будь-який мережевий збій
    // перетворюється на 500 в адмінці без другої спроби.
    await this.npRequest('InternetDocument', 'delete', { DocumentRefs: ttnRef });
  }

  // Суточный крон nova_poshta_directory_sync (ТЗ п.16/27.1) — не используется
  // для самого автокомплита (тот теперь живой, см. searchCities выше), но
  // держим локальный кэш для сопоставления Vercel geo-заголовка города при
  // чекауте (ТЗ п.29.3) без лишнего вызова API на каждый визит.
  async syncDirectory(): Promise<{ cities: number; warehouses: number }> {
    const { data: citiesRaw } = await this.npRequest('Address', 'getSettlements', { Limit: 5000 });
    const cities = citiesRaw as Array<{ Ref: string; Description: string; AreaDescription?: string }>;

    for (const city of cities) {
      await this.prisma.client.novaPoshtaCity.upsert({
        where: { ref: city.Ref },
        create: { ref: city.Ref, name: city.Description, region: city.AreaDescription },
        update: { name: city.Description, region: city.AreaDescription },
      });
    }

    let warehouseCount = 0;
    const majorCities = await this.prisma.client.novaPoshtaCity.findMany({
      where: { name: { in: ['Київ', 'Харків', 'Одеса', 'Львів', 'Дніпро'] } },
    });

    for (const city of majorCities) {
      const warehouses = await this.getWarehouses(city.ref);
      for (const wh of warehouses) {
        await this.prisma.client.novaPoshtaWarehouse.upsert({
          where: { ref: wh.ref },
          create: { ref: wh.ref, cityRef: city.ref, name: wh.name },
          update: { name: wh.name },
        });
        warehouseCount++;
      }
    }

    return { cities: cities.length, warehouses: warehouseCount };
  }
}
