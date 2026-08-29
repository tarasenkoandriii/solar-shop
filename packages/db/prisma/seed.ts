import { PrismaClient, ManufacturerRegion } from '@prisma/client';
import { buildSchemaTemplateSvg } from '../src/schema-diagram-templates';

const prisma = new PrismaClient();

async function main() {
  // Знайдено 18.08.2026: попередня версія мала ОДИН глобальний guard на
  // початку (перевірка кількості виробників) — якщо виробники вже
  // існували (напр. від попереднього ПЕРЕРВАНОГО запуску seed, що встиг
  // створити виробників, але впав до того, як дійшов до ProjectGoal), цей
  // guard викликав ранній `return` — і скрипт НІКОЛИ не доходив до пізніх
  // секцій (цілей проєкту, схем, тарифів), навіть якщо ТІ секції самі по
  // собі цілком ідемпотентні (`skipDuplicates`/`upsert`). Саме так
  // виникла ситуація "виробники є, а ProjectGoal — порожній". Виправлення
  // — прибрати єдиний глобальний guard, натомість точкові перевірки лише
  // там, де вони справді потрібні (виробники/постачальники/товари/офіси/
  // тарифи лояльності — розділи нижче, що використовують сирий `.create()`
  // без `skipDuplicates`/`upsert`) — решта секцій уже безпечні як є.
  async function findOrCreateManufacturer(data: { name: string; region: ManufacturerRegion; country: string }) {
    const existing = await prisma.manufacturer.findFirst({ where: { name: data.name } });
    return existing ?? prisma.manufacturer.create({ data });
  }

  async function findOrCreateVendor(data: { name: string; website: string; warehouseCities: string[]; contractStatus: string; excludeFromMatching?: boolean }) {
    const existing = await prisma.vendor.findFirst({ where: { name: data.name } });
    return existing ?? prisma.vendor.create({ data: data as never });
  }

  // За запитом користувача — підготовка до мультикраїнності (розділ
  // README). Country — довідкова таблиця, наразі лише 'UA' заповнена,
  // жодної Польщо-специфічної логіки. skipDuplicates — ідемпотентно, як
  // і решта seed.ts.
  console.log('Seeding countries...');
  await prisma.country.createMany({
    data: [{ code: 'UA', name: 'Україна', currencyCode: 'UAH', isActive: true }],
    skipDuplicates: true,
  });

  // За прямим запитом користувача — "три существующие категории
  // перевести в сиды". Раніше жорсткий Postgres-enum ProductCategory,
  // тепер таблиця — 3 наявні категорії засіяні тут зі статусом APPROVED
  // (найважливіше: articleNumberPrefix, раніше захардкоджений
  // Record<ProductCategory,string> у products.service.ts, тепер тут).
  console.log('Seeding categories...');
  await prisma.category.createMany({
    data: [
      { key: 'SOLAR_PANEL', nameUk: 'Сонячні панелі', nameRu: 'Солнечные панели', nameEn: 'Solar panels', articleNumberPrefix: 'SP', status: 'APPROVED' },
      { key: 'BATTERY', nameUk: 'Акумулятори', nameRu: 'Аккумуляторы', nameEn: 'Batteries', articleNumberPrefix: 'BAT', status: 'APPROVED' },
      { key: 'CONTROLLER', nameUk: 'Контролери заряду', nameRu: 'Контроллеры заряда', nameEn: 'Charge controllers', articleNumberPrefix: 'CTRL', status: 'APPROVED' },
      // За прямим запитом користувача ("явно упущен раздел кабели и
      // соединители") — дві нові категорії. CABLE продається "за
      // погонний метр" (Product.cachedPriceUsd = ціна за 1 метр,
      // Product.specs.crossSectionMm2 — переріз, Product.specs.
      // cableType — 'DC_SOLAR' | 'AC_POWER') — це єдиний виняток із
      // загального правила "1 товар = 1 фізична одиниця" в каталозі,
      // задокументовано в calculator.service.ts, де це реально
      // використовується. CONNECTOR — комплект/пара роз'ємів (MC4 для
      // сонячних панелей), Product.specs.connectorType.
      { key: 'CABLE', nameUk: 'Кабель', nameRu: 'Кабель', nameEn: 'Cable', articleNumberPrefix: 'CBL', status: 'APPROVED' },
      { key: 'CONNECTOR', nameUk: 'Конектори', nameRu: 'Коннекторы', nameEn: 'Connectors', articleNumberPrefix: 'CON', status: 'APPROVED' },
      // За прямим запитом користувача — "исправь добавлением
      // категории" (закриває структурний пробіл, знайдений в аудиті
      // розділу README про кабель/переріз: "система вважається такою,
      // що видає 220В до споживача — в каталозі поки немає окремої
      // категорії 'інвертор'"). Product.specs.outputPowerW —
      // безперервна вихідна потужність (Вт), Product.specs.
      // inverterType — 'PURE_SINE' | 'MODIFIED_SINE'.
      { key: 'INVERTER', nameUk: 'Інвертори', nameRu: 'Инверторы', nameEn: 'Inverters', articleNumberPrefix: 'INV', status: 'APPROVED' },
    ],
    skipDuplicates: true,
  });

  console.log('Seeding manufacturers...');
  await findOrCreateManufacturer({ name: 'SolarEdge', region: ManufacturerRegion.EUROPE, country: 'Israel/Europe' });
  await findOrCreateManufacturer({ name: 'Longi Solar', region: ManufacturerRegion.CHINA, country: 'China' });
  await findOrCreateManufacturer({ name: 'Pylontech', region: ManufacturerRegion.CHINA, country: 'China' });
  await findOrCreateManufacturer({ name: 'Victron Energy', region: ManufacturerRegion.EUROPE, country: 'Netherlands' });

  // За запитом користувача (27.08.2026) — офіс ОДИН, київський.
  //
  // Тут було чотири демо-записи з вигаданими адресами й телефонами:
  // «вул. Хрещатик, 1 / +380 44 000 00 01», Харків, Одеса, Львів. Вони
  // потрапляли на живий сайт — і на головну (блок «Наші офіси»), і на
  // сторінку контактів. Обидва місця тепер їх не показують, але лишати
  // фальшиві адреси в базі однаково не варто: таблицю редагує адмінка, і
  // рано чи пізно вони б звідти виринули.
  //
  // Дані збігаються з реквізитами компанії (apps/web/src/lib/company.ts і
  // apps/api/src/common/company.ts). Координати не вигадані — знайдені
  // геокодером OpenStreetMap за цією адресою, відповідь містила будинок 12
  // по Караїмському провулку з індексом 03110.
  console.log('Seeding office...');
  if ((await prisma.office.count()) === 0) {
    await prisma.office.create({
      data: {
        city: 'Київ',
        address: 'пров. Караїмський, буд. 12',
        phone: '+380 75 365 75 86',
        email: 'heyslor@ukr.net',
        workHours: 'Пн–Пт 9:00–18:00',
        lat: 50.4168785,
        lng: 30.4808074,
        sortOrder: 0,
      },
    });
  } else {
    console.log('Офіс уже засіяний — пропускаю.');
  }

  // Поставщики (ТЗ п.12) — топ-3 по приоритету парсинга, партнёрка не блокер (п.5.4)
  console.log('Seeding vendors...');
  // Реальні записи Vendor — щоб парсер при живому запуску зарезолвив
  // постачальника по імені, а не створював дубль. Самі листинги сюди не
  // засіваються: демо-товари прибрано (27.08.2026), каталог наповнює
  // парсер.
  await findOrCreateVendor({
    name: 'sunshop.com.ua',
    website: 'https://sunshop.com.ua',
    warehouseCities: ['Київ', 'Дніпро', 'Харків', 'Львів', 'Кривий Ріг', 'Одеса', 'Хмельницький', 'Вінниця'],
    contractStatus: 'NOT_CONTACTED',
  });
  await findOrCreateVendor({
    name: 'akumulyator.center',
    website: 'https://akumulyator.center',
    warehouseCities: ['Львів', 'Київ', 'Дніпро', 'Одеса', 'Харків', 'Рівне'],
    contractStatus: 'NOT_CONTACTED',
  });
  await findOrCreateVendor({
    name: 'voltmarket.ua',
    website: 'https://voltmarket.ua',
    warehouseCities: ['Україна'],
    contractStatus: 'NOT_CONTACTED',
  });
  await findOrCreateVendor({
    name: 'vencon.ua',
    website: 'https://vencon.ua',
    warehouseCities: ['Київ', 'Львів'],
    contractStatus: 'NOT_CONTACTED',
  });

  // Постачальника «Демо-дані (seed)» більше не створюємо: він існував
  // рівно для того, щоб демо-листинги не маскувалися під реальні бренди,
  // а демо-товарів більше немає. Механізм excludeFromMatching лишається в
  // коді (SiblingsService.getCandidates, ProductsService.isSeedData) — він
  // не залежав від цього запису.
  //
  // На вже наповнених базах сам рядок Vendor нікуди не подінеться: сид
  // нічого не видаляє. Якщо він там є і заважає — прибрати вручну разом
  // із його листингами.

  // За запитом користувача (27.08.2026) демо-товари з сида ПРИБРАНО.
  //
  // Тут була секція на 200+ рядків: 20 вигаданих товарів із цінами,
  // картинками-заглушками, чотирма «постачальниками», що насправді всі
  // вказували на один seedVendor, і ручним перерахунком кешу цін. Сенс
  // вона мала рівно доти, доки каталог наповнювався вручну; зараз товари
  // приходять із парсера, і демо-дані лише засмічували б живий каталог.
  //
  // Категорії, виробники, країни та решта довідників лишаються — без них
  // парсеру нема куди складати знайдене (Category.articleNumberPrefix
  // потрібен для генерації артикулів, Manufacturer — для фільтра в
  // каталозі).
  //
  // RATE_UAH лишено: він потрібен нижче для засіву ExchangeRate.
  const RATE_UAH = 41.5;


  console.log('Seeding promo settings (default threshold)...');
  // АУДИТ 27.08.2026 (знайдено живим деплоєм, після того як db-bootstrap
  // нарешті почав виконуватись на Vercel).
  //
  // Було: upsert({ where: { category: null } }) — і Prisma відмовляла з
  // "Argument `category` must not be null". Причина не в Prisma, а в SQL:
  // `category` — nullable, а @@unique([category]) на nullable-колонці не
  // ідентифікує рядок однозначно (NULL != NULL), тож null не можна
  // використати як unique-lookup.
  //
  // Найприкріше, що ЦЕЙ САМИЙ випадок у проєкті вже був вирішений і
  // задокументований — у PromoService.update() (apps/api/src/promo/
  // promo.service.ts) стоїть рівно та сама find-or-create логіка з тим
  // самим поясненням. Сид просто ніколи не доходив до цього рядка
  // успішно, бо взагалі не виконувався на Vercel, а локально помилку
  // ковтав db-bootstrap. Той самий клас помилки описаний і в
  // CartService.mergeGuestCartIntoUser — теж через nullable-поле у
  // складеному унікальному ключі.
  //
  // Ціна цього рядка була висока: сид падав тут і НЕ доходив до всього,
  // що нижче — тарифів лояльності, курсу валют, цілей проєктів, шаблонів
  // схем, координат НП, програм фінансування. А без курсу валют
  // OrdersService тепер (свідомо) відмовляє в оформленні замовлення.
  const existingPromo = await prisma.promoSettings.findFirst({ where: { category: null } });
  if (!existingPromo) {
    await prisma.promoSettings.create({ data: { category: null, thresholdPercent: 5 } });
  }

  console.log('Seeding loyalty tiers...');
  if ((await prisma.loyaltyTier.count()) === 0) {
    await prisma.loyaltyTier.createMany({
      data: [
        { minSpendUah: 10000, discountPercent: 3 },
        { minSpendUah: 50000, discountPercent: 5 },
        { minSpendUah: 150000, discountPercent: 8 },
      ],
    });
  } else {
    console.log('Тарифи лояльності вже засіяні — пропускаю.');
  }

  console.log('Seeding exchange rate...');
  // АУДИТ 27.08.2026. Тут стояв ключ `currency_rateDate`, а складений
  // унікальний у схемі — `@@unique([countryCode, currency, rateDate])`,
  // тобто називається `countryCode_currency_rateDate` (саме так, як у
  // currency.service.ts:37). Сид виконується через `ts-node
  // --transpile-only`, тож типи не перевіряються — і цей рядок ПАДАВ у
  // рантаймі. А scripts/db-bootstrap.js помилку сида ковтає (console.warn,
  // не exit), тому падіння було невидиме.
  //
  // Наслідки ширші за один курс: усе, що сіється ПІСЛЯ цього рядка —
  // цілі проєктів, шаблони схем, координати НП для PVGIS, тарифи,
  // програми фінансування — не засівалося взагалі на жодному чистому
  // оточенні.
  //
  // Окремо важливо саме зараз: доти OrdersService мовчки падав на фолбек
  // 41.5 при порожній таблиці, і баг ніяк не проявлявся. Тепер курс
  // обовʼязковий — тож без цього виправлення кожен чекаут на свіжо
  // піднятому магазині повертав би "Курс валют тимчасово недоступний".
  const rateDate = new Date(new Date().toDateString());
  await prisma.exchangeRate.upsert({
    where: { countryCode_currency_rateDate: { countryCode: 'UA', currency: 'USD', rateDate } },
    create: { countryCode: 'UA', currency: 'USD', rateUah: RATE_UAH, rateDate },
    update: {},
  });

  // ---------- Фаза 3: ИИ-калькулятор проекта ----------

  console.log('Seeding project goals (ТЗ п.31.1.1)...');
  await prisma.projectGoal.createMany({
    data: [
      {
        key: 'BACKUP_POWER',
        label: 'Резервне живлення (захист від відключень світла)',
        description: 'Основной сценарий на фоне блэкаутов — важна скорость автопереключения, не глубокая автономность',
        defaultTopology: 'BACKUP_UPS',
      },
      {
        key: 'FULL_AUTONOMY',
        label: 'Повна автономність (будинок/дача без підключення до мережі)',
        description: 'Упор на ёмкость АКБ и суммарную мощность панелей — сеть отсутствует физически или не рассматривается',
        defaultTopology: 'OFF_GRID',
      },
      {
        key: 'GREEN_TARIFF',
        label: 'Продаж надлишків електроенергії за зеленим тарифом',
        description: 'Инвестиционная мотивация — окупаемость через продажу, важна максимальная мощность панелей в рамках бюджета',
        defaultTopology: 'GRID_TIE',
      },
      {
        key: 'BILL_REDUCTION',
        label: 'Зниження власних витрат на електроенергію (без продажу)',
        description: 'Та сама топологія, що й GREEN_TARIFF, але інша мотивація клієнта — економія, не заробіток',
        defaultTopology: 'GRID_TIE',
      },
      {
        key: 'CRITICAL_LOAD_PROTECTION',
        label: 'Захист критичного обладнання (сервери, медтехніка, холодильне обладнання)',
        description: 'Схоже на BACKUP_POWER, але з акцентом на конкретну чутливу навантагу',
        defaultTopology: 'BACKUP_UPS',
      },
      {
        key: 'COMMERCIAL_OBJECT',
        label: "Комерційний/виробничий об'єкт (бізнес, склад, цех)",
        description: 'Інші порядки потужності, часто потребує кредитування/бізнес-плану',
        defaultTopology: 'COMMERCIAL',
      },
      {
        key: 'EV_CHARGING',
        label: 'Заряджання електротранспорту',
        description: 'Не топологієутворююча ціль, а модифікатор навантаги — збільшує вимоги до потужності/ємності',
        defaultTopology: null,
      },
    ],
    skipDuplicates: true,
  });

  console.log('Seeding schema templates (ТЗ п.31.10.1 — детермінований генератор, не ІІ)...');
  const topologies = ['OFF_GRID', 'BACKUP_UPS', 'GRID_TIE', 'COMMERCIAL'] as const;
  for (const topology of topologies) {
    await prisma.schemaTemplate.upsert({
      where: { topology_diagramType: { topology, diagramType: 'BLOCK' } },
      create: {
        topology,
        diagramType: 'BLOCK',
        svgTemplate: buildSchemaTemplateSvg(topology, false),
        notes: 'Спрощена схема для клієнта — тільки блоки та напрямок потоку енергії.',
      },
      update: {},
    });
    await prisma.schemaTemplate.upsert({
      where: { topology_diagramType: { topology, diagramType: 'PRINCIPAL' } },
      create: {
        topology,
        diagramType: 'PRINCIPAL',
        svgTemplate: buildSchemaTemplateSvg(topology, true),
        notes: 'Детальна схема для монтажника — з позначенням полярності DC-ліній.',
      },
      update: {},
    });
  }

  console.log('Seeding Nova Poshta city coordinates for PVGIS (демо-набір, реальний sync — окремий крон-джоб)...');
  await prisma.novaPoshtaCity.createMany({
    data: [
      { ref: 'seed-kyiv', name: 'Київ', region: 'Київська обл.', lat: 50.4501, lng: 30.5234 },
      { ref: 'seed-kharkiv', name: 'Харків', region: 'Харківська обл.', lat: 49.9935, lng: 36.2304 },
      { ref: 'seed-odesa', name: 'Одеса', region: 'Одеська обл.', lat: 46.4825, lng: 30.7233 },
      { ref: 'seed-lviv', name: 'Львів', region: 'Львівська обл.', lat: 49.8397, lng: 24.0297 },
      { ref: 'seed-dnipro', name: 'Дніпро', region: 'Дніпропетровська обл.', lat: 48.4647, lng: 35.0462 },
    ],
    skipDuplicates: true,
  });

  // ---------- Фаза 4: бизнес-план, финансирование ----------

  console.log('Seeding tariff rates (ТЗ п.31.11.1a — актуальність перевірити перед запуском)...');
  await prisma.tariffRate.createMany({
    data: [
      { key: 'GREEN_TARIFF', label: 'Зелений тариф', rateUahPerKwh: 6.03, sourceUrl: null },
      { key: 'RETAIL_AVERAGE', label: 'Середній роздрібний тариф (економія на самоспоживанні)', rateUahPerKwh: 4.32, sourceUrl: null },
    ],
    skipDuplicates: true,
  });

  console.log('Seeding financing programs (ТЗ п.31.11.2 — реальні програми на момент підготовки ТЗ, перевірити актуальність)...');
  await prisma.financingProgram.createMany({
    data: [
      {
        name: 'Ощадбанк — «Енергонезалежність»',
        eligibility: 'Фізичні особи, бізнес усіх розмірів',
        description: 'Кредит 50 000–400 000 ₴ без застави та поручителів, до 60 місяців, на СЕС/панелі/генератори/зарядні станції',
        url: 'https://www.oschadbank.ua/credit/green-energy',
        minLoanUsd: 1200,
        maxLoanUsd: 9700,
        status: 'PUBLISHED',
        lastVerifiedAt: new Date(),
      },
      {
        name: '«Моя енергонезалежність» (держпрограма)',
        eligibility: 'Фізичні особи',
        description: 'Кредит під 0% (держава компенсує ставку) до 480 000 ₴ на 10 років, банки-партнери: ПриватБанк, Ощадбанк, Укргазбанк, Сенс Банк, банк «Глобус»',
        url: 'https://oschadbank.ua/',
        minLoanUsd: null,
        maxLoanUsd: 11600,
        status: 'PUBLISHED',
        lastVerifiedAt: new Date(),
      },
      {
        name: 'Держпрограма «Доступні кредити 5-7-9%» на СЕС/генератори/теплонасоси',
        eligibility: 'ОСББ, ЖБК',
        description: 'До 3 млн ₴, ставка 0% перший рік / 5% другий / 7% третій, + держкомпенсація тіла кредиту до 30%',
        url: 'https://5-7-9.gov.ua/',
        minLoanUsd: null,
        maxLoanUsd: 72500,
        status: 'PUBLISHED',
        lastVerifiedAt: new Date(),
      },
      {
        name: 'Укргазбанк — кредит на СЕС/теплонасоси',
        eligibility: 'Фізичні особи, ОСББ',
        description: 'До 1 млн ₴ під заставу придбаного/іншого майна',
        url: 'https://www.ukrgasbank.com/',
        minLoanUsd: null,
        maxLoanUsd: 24200,
        status: 'PUBLISHED',
        lastVerifiedAt: new Date(),
      },
      {
        name: '«ГрінДІМ» (Фонд енергоефективності)',
        eligibility: 'ОСББ, ЖБК',
        description: 'Грант (безповоротний) до 70% вартості СЕС і накопичувачів, до 1-2 млн ₴ залежно від площі будинку',
        url: 'https://eefund.org.ua/',
        minLoanUsd: null,
        maxLoanUsd: 48000,
        status: 'PUBLISHED',
        lastVerifiedAt: new Date(),
      },
    ],
    skipDuplicates: true,
  });

  console.log('Seeding universal fallback business plan manifest (ТЗ п.31.11.5 — має існувати завжди)...');
  const existingUniversalManifest = await prisma.businessPlanManifest.findFirst({
    where: { goalTags: { isEmpty: true }, powerRangeTag: null, isActive: true },
  });
  if (!existingUniversalManifest) {
    await prisma.businessPlanManifest.create({
    data: {
      version: 1,
      goalTags: [],
      powerRangeTag: null,
      content: `# Бізнес-план проєкту сонячної електростанції

## Розділи документа
1. **Резюме проєкту** — коротко: мета, локація, орієнтовна потужність, сума
2. **Технічний опис системи** — топологія, склад обладнання (з реальної специфікації проєкту)
3. **Кошторис** — специфікація з цінами (USD + UAH за курсом НБУ на дату розрахунку)
4. **Прогноз окупності** — за даними PVGIS та поточним тарифом, діапазоном (не точною цифрою)
5. **Рекомендації щодо кредитування** — відфільтрований список актуальних програм

## Інструкції для генерації тексту
Використовуй ЛИШЕ дані, що передані в описі проєкту нижче — не вигадуй цифри, бренди чи характеристики понад надані.
Тон — діловий, нейтральний, без завищених обіцянок щодо окупності чи економії.

## Обов'язкові застереження
- Прогноз окупності — орієнтовна оцінка, не гарантія
- Умови кредитування уточнювати безпосередньо в банку/операторі програми`,
      generatedBy: 'manual',
      isActive: true,
    },
  });
  }

  console.log('Seed complete.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
