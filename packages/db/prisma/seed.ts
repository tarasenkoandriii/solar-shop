import { PrismaClient, ManufacturerRegion, MatchType } from '@prisma/client';
import { computeProductPricing } from '../src/pricing';
import { buildSchemaTemplateSvg } from '../src/schema-diagram-templates';

const prisma = new PrismaClient();

// За запитом користувача (категорії тепер таблиця, не жорсткий enum) —
// той самий Category.articleNumberPrefix, що вже застосований у
// products.service.ts/matching.service.ts, замість захардкодженого
// Record<ProductCategory,string>. Категорії вже засіяні (Seeding
// categories... вище) до виклику цієї функції — findFirst безпечний.
async function nextArticleNumber(category: string): Promise<string> {
  const seq = await prisma.articleNumberSequence.upsert({
    where: { category },
    create: { category, lastSeq: 1 },
    update: { lastSeq: { increment: 1 } },
  });
  const categoryRow = await prisma.category.findUnique({ where: { key: category } });
  const prefix = categoryRow?.articleNumberPrefix ?? 'XX';
  return `${prefix}-${String(seq.lastSeq).padStart(6, '0')}`;
}

function slugify(name: string, suffix: string): string {
  return (
    name
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '') +
    '-' +
    suffix.toLowerCase()
  );
}

const placeholderImages = [
  'https://placehold.co/800x600/1a2e1a/ffffff?text=Product+1',
  'https://placehold.co/800x600/1a2e1a/ffffff?text=Product+2',
  'https://placehold.co/800x600/1a2e1a/ffffff?text=Product+3',
];

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
  const solarEdge = await findOrCreateManufacturer({ name: 'SolarEdge', region: ManufacturerRegion.EUROPE, country: 'Israel/Europe' });
  const longi = await findOrCreateManufacturer({ name: 'Longi Solar', region: ManufacturerRegion.CHINA, country: 'China' });
  const pylontech = await findOrCreateManufacturer({ name: 'Pylontech', region: ManufacturerRegion.CHINA, country: 'China' });
  const victron = await findOrCreateManufacturer({ name: 'Victron Energy', region: ManufacturerRegion.EUROPE, country: 'Netherlands' });

  console.log('Seeding offices...');
  if ((await prisma.office.count()) === 0) {
    await prisma.office.createMany({
      data: [
        { city: 'Київ', address: 'вул. Хрещатик, 1', phone: '+380 44 000 00 01', email: 'kyiv@solarshop.ua', workHours: 'Пн-Пт 9:00-18:00', lat: 50.4501, lng: 30.5234, sortOrder: 0 },
        { city: 'Харків', address: 'вул. Сумська, 10', phone: '+380 57 000 00 02', email: 'kharkiv@solarshop.ua', workHours: 'Пн-Пт 9:00-18:00', lat: 49.9935, lng: 36.2304, sortOrder: 1 },
        { city: 'Одеса', address: 'вул. Дерибасівська, 5', phone: '+380 48 000 00 03', email: 'odesa@solarshop.ua', workHours: 'Пн-Пт 9:00-18:00', lat: 46.4825, lng: 30.7233, sortOrder: 2 },
        { city: 'Львів', address: 'просп. Свободи, 15', phone: '+380 32 000 00 04', email: 'lviv@solarshop.ua', workHours: 'Пн-Пт 9:00-18:00', lat: 49.8397, lng: 24.0297, sortOrder: 3 },
      ],
    });
  } else {
    console.log('Офіси вже засіяні — пропускаю.');
  }

  // Поставщики (ТЗ п.12) — топ-3 по приоритету парсинга, партнёрка не блокер (п.5.4)
  console.log('Seeding vendors...');
  // Реальні записи Vendor створюються (для майбутнього реального парсера,
  // що резолвитиме постачальника по імені при живому запуску), але
  // повертані об'єкти більше НЕ використовуються нижче для demo-листингів
  // — усі demo-ціни тепер атрибутовані seedVendor (детальніше нижче), не
  // замасковані під ці реальні бренди.
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

  // За запитом користувача — seed-дані як окремий "постачальник", не
  // замаскований під один із реальних (sunshop/akumulyator/voltmarket/
  // vencon вище). excludeFromMatching: true — SiblingsService.
  // getCandidates() фільтрує його листинги з черги модерації (навіть
  // попри те, що вони й так одразу матчаться нижче через MANUAL, це
  // явний, а не випадковий захист на майбутнє).
  const seedVendor = await findOrCreateVendor({
    name: 'Демо-дані (seed)',
    website: 'internal-seed.local',
    warehouseCities: ['Україна'],
    contractStatus: 'NOT_CONTACTED',
    excludeFromMatching: true,
  });

  console.log('Seeding products + sibling listings...');
  const RATE_UAH = 41.5; // курс — потрібен і тут, і пізніше для ExchangeRate, тому оголошено ДО if/else, не всередині (інакше недоступний за межами блоку)
  if ((await prisma.product.count()) > 0) {
    console.log('Товари вже засіяні — пропускаю (без перевірки кожного окремо, вся секція атомарна за задумом).');
  } else {

  type Seed = {
    name: string;
    manufacturerId: string;
    specs: Record<string, unknown>;
    isNew?: boolean;
    // цены у разных поставщиков (UAH) — для демонстрации siblings/promo;
    // второй листинг опционален (не у всех товаров есть 2 sibling)
    listingsUah: { vendor: 'sunshop' | 'akumulyator' | 'voltmarket' | 'vencon'; priceUah: number; inStock?: boolean }[];
  };

  const panels: Seed[] = [
    { name: 'Longi LR5-54HTH 410W', manufacturerId: longi.id, specs: { powerW: 410, type: 'MONO' }, listingsUah: [{ vendor: 'sunshop', priceUah: 3695 }, { vendor: 'voltmarket', priceUah: 3450 }, { vendor: 'vencon', priceUah: 3599 }] },
    { name: 'Longi LR5-72HTH 550W', manufacturerId: longi.id, specs: { powerW: 550, type: 'MONO' }, isNew: true, listingsUah: [{ vendor: 'sunshop', priceUah: 4897 }] },
    { name: 'Longi LR4-60HPH 365W', manufacturerId: longi.id, specs: { powerW: 365, type: 'MONO' }, listingsUah: [{ vendor: 'sunshop', priceUah: 3154 }, { vendor: 'akumulyator', priceUah: 3050 }] },
    { name: 'SolarEdge SE440-P 440W', manufacturerId: solarEdge.id, specs: { powerW: 440, type: 'MONO' }, listingsUah: [{ vendor: 'sunshop', priceUah: 5478 }] },
    { name: 'SolarEdge Flex 200W', manufacturerId: solarEdge.id, specs: { powerW: 200, type: 'FLEXIBLE' }, isNew: true, listingsUah: [{ vendor: 'voltmarket', priceUah: 8715 }] },
    { name: 'Victron BlueSolar Poly 175W', manufacturerId: victron.id, specs: { powerW: 175, type: 'POLY' }, listingsUah: [{ vendor: 'akumulyator', priceUah: 3943 }] },
    { name: 'Victron BlueSolar Poly 115W', manufacturerId: victron.id, specs: { powerW: 115, type: 'POLY' }, listingsUah: [{ vendor: 'akumulyator', priceUah: 2822 }, { vendor: 'sunshop', priceUah: 2350 }] },
  ];

  const batteries: Seed[] = [
    { name: 'Pylontech US3000C 3.5kWh', manufacturerId: pylontech.id, specs: { capacityAh: 74, capacityKwh: 3.5, chemistry: 'LIFEPO4' }, listingsUah: [{ vendor: 'akumulyator', priceUah: 32370 }, { vendor: 'sunshop', priceUah: 30500 }, { vendor: 'vencon', priceUah: 31200 }] },
    { name: 'Pylontech US5000 4.8kWh', manufacturerId: pylontech.id, specs: { capacityAh: 100, capacityKwh: 4.8, chemistry: 'LIFEPO4' }, isNew: true, listingsUah: [{ vendor: 'akumulyator', priceUah: 43575 }] },
    { name: 'Pylontech Force H2 7.1kWh', manufacturerId: pylontech.id, specs: { capacityAh: 148, capacityKwh: 7.1, chemistry: 'LIFEPO4' }, listingsUah: [{ vendor: 'sunshop', priceUah: 63910 }] },
    { name: 'Victron Lithium Smart 200Ah', manufacturerId: victron.id, specs: { capacityAh: 200, chemistry: 'LIFEPO4' }, listingsUah: [{ vendor: 'akumulyator', priceUah: 53535 }] },
    { name: 'Victron AGM Deep Cycle 220Ah', manufacturerId: victron.id, specs: { capacityAh: 220, chemistry: 'AGM' }, listingsUah: [{ vendor: 'akumulyator', priceUah: 17015 }, { vendor: 'voltmarket', priceUah: 14800 }] },
    { name: 'Victron Gel Deep Cycle 165Ah', manufacturerId: victron.id, specs: { capacityAh: 165, chemistry: 'GEL' }, listingsUah: [{ vendor: 'akumulyator', priceUah: 13280 }] },
  ];

  const controllers: Seed[] = [
    { name: 'Victron SmartSolar MPPT 100/30', manufacturerId: victron.id, specs: { controllerType: 'MPPT', maxCurrentA: 30 }, listingsUah: [{ vendor: 'sunshop', priceUah: 6848 }] },
    { name: 'Victron SmartSolar MPPT 150/60', manufacturerId: victron.id, specs: { controllerType: 'MPPT', maxCurrentA: 60 }, isNew: true, listingsUah: [{ vendor: 'sunshop', priceUah: 14110 }, { vendor: 'voltmarket', priceUah: 13200 }] },
    { name: 'Victron BlueSolar PWM 20A', manufacturerId: victron.id, specs: { controllerType: 'PWM', maxCurrentA: 20 }, listingsUah: [{ vendor: 'voltmarket', priceUah: 1743 }] },
    { name: 'SolarEdge Home Charge Controller 45A', manufacturerId: solarEdge.id, specs: { controllerType: 'MPPT', maxCurrentA: 45 }, listingsUah: [{ vendor: 'sunshop', priceUah: 9130 }] },
    { name: 'SolarEdge Compact PWM 10A', manufacturerId: solarEdge.id, specs: { controllerType: 'PWM', maxCurrentA: 10 }, listingsUah: [{ vendor: 'sunshop', priceUah: 1162 }, { vendor: 'akumulyator', priceUah: 980 }] },
    { name: 'SolarEdge Pro MPPT 80A', manufacturerId: solarEdge.id, specs: { controllerType: 'MPPT', maxCurrentA: 80 }, isNew: true, listingsUah: [{ vendor: 'sunshop', priceUah: 17015 }] },
  ];

  // За прямим запитом користувача ("явно упущен раздел кабели и
  // соединители") — демо-позиції для нового розрахунку кабельної
  // траси (calculator.service.ts). priceUah тут — ЦІНА ЗА 1 МЕТР
  // (не за одиницю товару, як для решти категорій) — задокументовано
  // в Category-коментарі вище й у самій логіці резолвінгу. Ряд
  // перерізів (1.5/2.5/4/6/10 мм²) — стандартний ряд за ПУЕ, не
  // довільний набір. DC-кабель (сонячний, для комутації панелей) і
  // AC-кабель (силовий, "кабель зниження" до споживача) — окремі
  // товари, бо мають різне призначення й ціну.
  const cables: Seed[] = [
    { name: 'Сонячний DC-кабель 4мм² (чорний, 1 метр)', manufacturerId: victron.id, specs: { crossSectionMm2: 4, cableType: 'DC_SOLAR' }, listingsUah: [{ vendor: 'sunshop', priceUah: 22 }, { vendor: 'voltmarket', priceUah: 19 }] },
    { name: 'Сонячний DC-кабель 6мм² (чорний, 1 метр)', manufacturerId: victron.id, specs: { crossSectionMm2: 6, cableType: 'DC_SOLAR' }, listingsUah: [{ vendor: 'sunshop', priceUah: 31 }] },
    { name: 'ВВГнг-LS 3×2.5мм² (силовий, 1 метр)', manufacturerId: solarEdge.id, specs: { crossSectionMm2: 2.5, cableType: 'AC_POWER' }, listingsUah: [{ vendor: 'akumulyator', priceUah: 52 }, { vendor: 'vencon', priceUah: 48 }] },
    { name: 'ВВГнг-LS 3×4мм² (силовий, 1 метр)', manufacturerId: solarEdge.id, specs: { crossSectionMm2: 4, cableType: 'AC_POWER' }, listingsUah: [{ vendor: 'akumulyator', priceUah: 74 }] },
    { name: 'ВВГнг-LS 3×6мм² (силовий, 1 метр)', manufacturerId: solarEdge.id, specs: { crossSectionMm2: 6, cableType: 'AC_POWER' }, isNew: true, listingsUah: [{ vendor: 'akumulyator', priceUah: 112 }, { vendor: 'sunshop', priceUah: 105 }] },
    { name: 'ВВГнг-LS 3×10мм² (силовий, 1 метр)', manufacturerId: solarEdge.id, specs: { crossSectionMm2: 10, cableType: 'AC_POWER' }, listingsUah: [{ vendor: 'akumulyator', priceUah: 178 }] },
  ];

  // Ціна — за 1 ПАРУ (тато+мама), не за штуку. quantity в резолвінгу
  // рахується як кількість строк панелей, не кількість самих панелей.
  const connectors: Seed[] = [
    { name: 'MC4 конектор, пара (тато+мама)', manufacturerId: victron.id, specs: { connectorType: 'MC4' }, listingsUah: [{ vendor: 'sunshop', priceUah: 65 }, { vendor: 'voltmarket', priceUah: 58 }] },
    { name: 'MC4 подовжувач 1.5м, пара кабелів з конекторами', manufacturerId: victron.id, specs: { connectorType: 'MC4_EXTENSION' }, isNew: true, listingsUah: [{ vendor: 'sunshop', priceUah: 245 }] },
  ];

  // За прямим запитом користувача — "исправь добавлением категории".
  // Реальні моделі Victron Phoenix/MultiPlus (той самий виробник, що
  // вже панелі/акумулятори в seed — Victron реально виробляє
  // інвертори, не вигаданий асортимент). outputPowerW — безперервна
  // вихідна потужність, не пікова (та сама консервативна логіка, що
  // вже для перерізу кабелю за ампасіті).
  const inverters: Seed[] = [
    { name: 'Victron Phoenix Inverter 12/500', manufacturerId: victron.id, specs: { outputPowerW: 500, inverterType: 'PURE_SINE' }, listingsUah: [{ vendor: 'sunshop', priceUah: 9850 }, { vendor: 'voltmarket', priceUah: 9200 }] },
    { name: 'Victron Phoenix Inverter 12/800', manufacturerId: victron.id, specs: { outputPowerW: 800, inverterType: 'PURE_SINE' }, listingsUah: [{ vendor: 'sunshop', priceUah: 13400 }] },
    { name: 'Victron Phoenix Inverter 24/1200', manufacturerId: victron.id, specs: { outputPowerW: 1200, inverterType: 'PURE_SINE' }, listingsUah: [{ vendor: 'akumulyator', priceUah: 18900 }, { vendor: 'sunshop', priceUah: 17650 }] },
    { name: 'Victron MultiPlus 24/2000', manufacturerId: victron.id, specs: { outputPowerW: 2000, inverterType: 'PURE_SINE' }, isNew: true, listingsUah: [{ vendor: 'akumulyator', priceUah: 32500 }] },
    { name: 'Victron MultiPlus 48/3000', manufacturerId: victron.id, specs: { outputPowerW: 3000, inverterType: 'PURE_SINE' }, listingsUah: [{ vendor: 'vencon', priceUah: 46800 }, { vendor: 'akumulyator', priceUah: 44200 }] },
  ];

  // Усі чотири "бренди" тут — те саме демо-джерело seedVendor, не окремі
  // реальні постачальники (навмисно, за запитом користувача, детальніше
  // вище) — ключі лишені для різноманітності sourceSku/sourceUrl у
  // демо-даних (виглядає як кілька цінових пропозицій), не для
  // прив'язки до різних реальних Vendor-рядків.
  const vendorById = { sunshop: seedVendor, akumulyator: seedVendor, voltmarket: seedVendor, vencon: seedVendor };
  const allByCategory: [string, Seed[]][] = [
    ['SOLAR_PANEL', panels],
    ['BATTERY', batteries],
    ['CONTROLLER', controllers],
    ['CABLE', cables],
    ['CONNECTOR', connectors],
    ['INVERTER', inverters],
  ];

  for (const [category, items] of allByCategory) {
    for (const item of items) {
      // За прямим запитом користувача ("почему не показывает дефолтный
      // манифест который должен быть всегда") — знайдено РЕАЛЬНУ
      // причину: db-bootstrap.js запускає `prisma db seed` на КОЖЕН
      // старт контейнера (не лише перший), а весь цей блок створення
      // товарів раніше НЕ мав жодного захисту від повторного запуску —
      // при другому й наступних запусках `product.create()` падав на
      // порушенні унікальності `slug`, і ВЕСЬ КОД ПІСЛЯ цієї точки у
      // файлі (включно з universal-manifest блоком значно нижче) НІКОЛИ
      // реально не виконувався. Перевірка по імені+виробнику — той
      // самий "натуральний ключ" демо-даних, ДО виклику
      // nextArticleNumber() — щоб не витрачати позиції нумерації
      // марно на товар, що однаково буде пропущено.
      const existingProduct = await prisma.product.findFirst({ where: { name: item.name, manufacturerId: item.manufacturerId } });
      if (existingProduct) continue;

      const articleNumber = await nextArticleNumber(category);
      const slug = slugify(item.name, articleNumber);

      const product = await prisma.product.create({
        data: {
          slug,
          articleNumber,
          category,
          name: item.name,
          manufacturerId: item.manufacturerId,
          shortDescription: `${item.name} — надійне обладнання для сонячної енергетики.`,
          description: `## ${item.name}\n\nЯкісне обладнання для домашніх та комерційних сонячних систем. Детальні характеристики наведені в таблиці нижче. Підходить для монтажу як в приватних будинках, так і на комерційних об'єктах.\n\n**Гарантія**: уточнюйте у менеджера.`,
          specs: item.specs,
          status: 'PUBLISHED',
          images: {
            create: placeholderImages.map((url, i) => ({ url, sortOrder: i })),
          },
        },
      });

      // Siblings: seed-время эмулирует то, что в реальности сделал бы
      // matching engine (ТЗ п.13.2) — здесь всё заведомо "один и тот же
      // товар", поэтому matchType: MANUAL, без confidence.
      const createdListings: { priceUsd: number; inStock: boolean; vendorWarehouseCities: string[] }[] = [];
      for (const l of item.listingsUah) {
        const vendor = vendorById[l.vendor];
        const priceUsd = Math.round((l.priceUah / RATE_UAH) * 100) / 100;
        const inStock = l.inStock ?? true;
        const listing = await prisma.sourceListing.create({
          data: {
            vendorId: vendor.id,
            sourceUrl: `https://${vendor.website.replace('https://', '')}/product/${slug}`,
            sourceSku: `${l.vendor.toUpperCase()}-${articleNumber}`,
            rawTitle: item.name,
            rawCategory: category,
            rawPrice: l.priceUah,
            rawCurrency: 'UAH',
            priceUsd,
            priceRateDate: new Date(new Date().toDateString()),
            inStock,
            images: placeholderImages,
          },
        });
        await prisma.productListing.create({
          data: {
            productId: product.id,
            sourceListingId: listing.id,
            matchType: MatchType.MANUAL,
            isPrimary: item.listingsUah[0] === l,
          },
        });
        createdListings.push({ priceUsd, inStock, vendorWarehouseCities: vendor.warehouseCities });
      }

      const pricing = computeProductPricing(createdListings, 5);
      await prisma.product.update({
        where: { id: product.id },
        data: {
          cachedCostPriceUsd: pricing.cachedCostPriceUsd,
          cachedPriceUsd: pricing.cachedPriceUsd,
          cachedInStock: pricing.cachedInStock,
          cachedWarehouseCities: pricing.cachedWarehouseCities,
          cachedIsPromo: pricing.cachedIsPromo,
          cachedDiscountPercent: pricing.cachedDiscountPercent,
          cachedIsNew: item.isNew ?? false,
          pricingUpdatedAt: new Date(),
        },
      });
    }
  }
  } // кінець `else` для секції товарів (guard на початку блоку)

  console.log('Seeding promo settings (default threshold)...');
  await prisma.promoSettings.upsert({
    where: { category: null },
    create: { category: null, thresholdPercent: 5 },
    update: {},
  });

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
