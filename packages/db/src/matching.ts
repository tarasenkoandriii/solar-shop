// Matching engine helpers (ТЗ п.13.2) — извлечение характеристик и
// нечёткое сравнение названий для сопоставления SourceListing <-> Product.
// Триграммное сходство реализовано в чистом JS (не через Postgres pg_trgm
// extension) — портативнее для Vercel Hobby/Supabase без лишних миграций
// расширений; при росте каталога на порядок стоит перейти на pg_trgm
// индекс в БД (см. AUDIT.md).

export interface ExtractedSpecs {
  powerW?: number;
  capacityAh?: number;
  capacityKwh?: number;
  maxCurrentA?: number;
  voltageV?: number;
}

// АУДИТ 27.08.2026 — дві помилки в цих регулярках, обидві мовчазні.
//
// 1. `\b` ПІСЛЯ КИРИЛИЦІ НЕ ПРАЦЮЄ. У JS межа слова визначається через
//    \w = [A-Za-z0-9_], кирилиця туди не входить, тож після "В" чи "Ач"
//    межі немає. Наслідок: із назви "Акумулятор гелевий 12В 100Ач" не
//    витягувалось НІЧОГО — порожній обʼєкт. Для українського магазину це
//    не край, а основний формат назв.
//
//    Той самий баг уже ловили в цьому проєкті в parsePriceText
//    (scrape-utils.ts) — там "48В" давало 48 як ціну. Лікується так само:
//    `(?![\p{L}])` під прапорцем `u` замість `\b`.
//
// 2. ДРОБОВІ ЗНАЧЕННЯ ОБРІЗАЛИСЬ ДО ХВОСТА. `(\d{1,3})` на "51.2V" ловив
//    не 51.2, а "2" — бо збіг шукався де завгодно в рядку. Літієві збірки
//    з номіналом 51.2В / 25.6В — це типовий LiFePO4, і замість 5.12 кВт·год
//    виходило 0.2. Значення проходило всі перевірки (> 0) і давало
//    рекомендацію на порядок більшої кількості банок.
//
// Обидві помилки стали критичними після 27.08.2026, коли на capacityAh і
// voltageV почав спиратися розрахунок кількості акумуляторів
// (packages/db/src/battery.ts). До того вони лише псували матчинг.
const NUM = String.raw`\d{1,4}(?:[.,]\d{1,2})?`;
// Кінець числа з одиницею: далі не має йти буква (щоб "12В" не
// зчитувалось із "12Внутрішній") — але саме через (?!\p{L}), а не \b.
const END = String.raw`(?![\p{L}\d])`;

function num(raw: string | undefined): number | undefined {
  if (raw === undefined) return undefined;
  const n = Number(raw.replace(',', '.'));
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

// Обязательный жёсткий фильтр (ТЗ п.13.2): панель 410 Вт никогда не
// матчится с 550 Вт, даже при похожем названии — числовые характеристики
// извлекаются регуляркой и сравниваются точно (без размытия), а не через
// строковое сходство.
export function extractSpecsFromTitle(rawTitle: string): ExtractedSpecs {
  const specs: ExtractedSpecs = {};

  // кВт·год ПЕРЕД Вт: інакше "5.12kWh" зловилося б як потужність.
  // Це найнадійніше джерело ємності, коли воно є в назві.
  const kwhMatch = rawTitle.match(new RegExp(String.raw`(${NUM})\s*(?:кВт[·\s]?год|кВтг|kWh|kwh)${END}`, 'iu'));
  const kwh = num(kwhMatch?.[1]);
  if (kwh !== undefined) specs.capacityKwh = kwh;

  const wattMatch = rawTitle.match(new RegExp(String.raw`(${NUM})\s*(?:Вт|W)${END}`, 'iu'));
  const watt = num(wattMatch?.[1]);
  if (watt !== undefined) specs.powerW = watt;

  const ahMatch = rawTitle.match(new RegExp(String.raw`(${NUM})\s*(?:Ач|А·год|Ah)${END}`, 'iu'));
  const ah = num(ahMatch?.[1]);
  if (ah !== undefined) specs.capacityAh = ah;

  // Струм — ТІЛЬКИ якщо далі не "ч" (щоб "100Ач" не зчиталось як 100А).
  // Кирилична "А" і латинська "A" виглядають однаково, тому перелічені
  // обидві явно.
  const currentMatch = rawTitle.match(new RegExp(String.raw`(${NUM})\s*[АA](?![чh])${END}`, 'iu'));
  const current = num(currentMatch?.[1]);
  if (current !== undefined) specs.maxCurrentA = current;

  const voltMatch = rawTitle.match(new RegExp(String.raw`(${NUM})\s*[ВV](?![т])${END}`, 'iu'));
  const volt = num(voltMatch?.[1]);
  if (volt !== undefined) specs.voltageV = volt;

  return specs;
}

// АУДИТ 27.08.2026. Евристика "найдовший токен із літерами й цифрами" сама
// по собі непогана, але вона не відрізняє артикул від назви хімії чи
// одиниці виміру. Реальні наслідки:
//
//   'Акумулятор LiFePO4 12V 100Ah'  ->  'LiFePO4'
//   'Кабель сонячний 2x4mm2 чорний' ->  '2x4mm2'
//   'Акумулятор 12V 100Ah'          ->  '100Ah'
//
// А далі в matching.service.ts збіг за цим "артикулом" давав привʼязку з
// впевненістю 1.0 В ОБХІД модерації. Тобто всі літієві акумулятори
// категорії зливались в ОДИН товар — а публічна ціна рахується по
// листингах товару, тож акумулятор за $800 починав продаватися за ціною
// найдешевшого зі злитих. Той самий механізм, що вже дав $33 300 у
// каталозі, лише з іншого боку.
//
// Лікуємо двома фільтрами. Обидва — точні переліки, а не здогадки: краще
// пропустити рідкісний справжній артикул (тоді спрацює звичайний
// нечіткий матчинг із модерацією), ніж злити різні товари мовчки.

// 1. Токен — це просто вимір: "100Ah", "12V", "410W", "4mm2", "2x4mm2".
const MEASUREMENT_TOKEN = new RegExp(
  String.raw`^\d+(?:[.,]\d+)?(?:x\d+(?:[.,]\d+)?)*\s*(?:V|В|Ah|Ач|A|А|W|Вт|kWh|кВт|Wh|Втг|mm2?|мм2?|Hz|Гц|kg|кг|°?C)$`,
  'iu',
);

// 2. Токен — загальновживана назва хімії, стандарту чи форм-фактора, а не
// код моделі. Перелік закритий і короткий: це не евристика, кожен запис
// сюди потрапляє тому, що реально зустрічається в назвах.
const GENERIC_TOKENS = new Set(
  [
    'lifepo4', 'lifepo', 'lifeypo4', 'life-po4',
    'li-ion', 'liion', 'li-pol', 'lipo4', 'lipol',
    'nimh', 'nicd', 'nife', 'pb-ca', 'pbca',
    // Форм-фактори комірок і роз'ємів.
    'mc4', '18650', '21700', '26650', '32700',
    // Інтерфейси та стандарти захисту.
    'rs485', 'rs232', 'can2.0', 'usb2.0', 'usb3.0', 'ip65', 'ip67', 'ip20', 'ip54',
    // Мережеві номінали, що трапляються в назвах інверторів.
    'ac220', 'dc12', 'dc24', 'dc48', '220v', '380v',
  ].map((t) => t.toLowerCase()),
);

function looksLikeModelCode(token: string): boolean {
  if (token.length < 5) return false;
  if (!/[A-Za-z]/.test(token) || !/\d/.test(token)) return false;
  if (GENERIC_TOKENS.has(token.toLowerCase())) return false;
  if (MEASUREMENT_TOKEN.test(token)) return false;
  return true;
}

// Пытается вытащить код модели производителя из "сырого" заголовка — грубая
// эвристика: самый длинный токен, содержащий и буквы, и цифры (типично для
// MPN вроде "LR5-54HTH-410M", "JKM-410M-54HL4"). Кандидат сверяется/
// сохраняется как Product.manufacturerSku при точном совпадении (ТЗ п.26.5).
export function extractManufacturerSkuCandidate(rawTitle: string): string | null {
  // Розділяємо не лише по пробілах: у назвах трапляється "LiFePO4,100Ah".
  const tokens = rawTitle.split(/[\s,;()[\]]+/).filter(looksLikeModelCode);
  if (tokens.length === 0) return null;
  return tokens.reduce((longest, t) => (t.length > longest.length ? t : longest));
}

export function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function bigrams(text: string): Set<string> {
  const normalized = normalizeTitle(text).replace(/\s/g, '');
  const grams = new Set<string>();
  for (let i = 0; i < normalized.length - 1; i++) {
    grams.add(normalized.slice(i, i + 2));
  }
  return grams;
}

// Триграммное (здесь — биграммное, устойчивее для коротких названий)
// сходство Жаккара, 0..1. Заменяет `pg_trgm` similarity() для портативности.
export function titleSimilarity(a: string, b: string): number {
  const setA = bigrams(a);
  const setB = bigrams(b);
  if (setA.size === 0 || setB.size === 0) return 0;

  let intersection = 0;
  for (const gram of setA) {
    if (setB.has(gram)) intersection++;
  }
  const union = setA.size + setB.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

// Жёсткий фильтр (ТЗ п.13.2) — специфицированные числовые характеристики
// должны совпадать точно там, где они извлеклись у обеих сторон; отсутствие
// значения с одной из сторон не блокирует (не все источники дают все поля).
export function specsCompatible(a: ExtractedSpecs, b: ExtractedSpecs): boolean {
  if (a.powerW !== undefined && b.powerW !== undefined && a.powerW !== b.powerW) return false;
  if (a.capacityAh !== undefined && b.capacityAh !== undefined && a.capacityAh !== b.capacityAh) return false;
  if (a.maxCurrentA !== undefined && b.maxCurrentA !== undefined && a.maxCurrentA !== b.maxCurrentA) return false;
  // Аудит 27.08.2026: напруга витягувалась, зберігалась — і в жорсткий
  // фільтр не входила. "LiFePO4 12В 100Ач" і "LiFePO4 24В 100Ач" — різні
  // товари вдвічі різної ціни — проходили як сумісні, і на довгих назвах
  // добивали поріг автоприв'язки 0.85.
  //
  // Раніше додати цю перевірку було б марно: через зламану регулярку
  // (`\b` після кирилиці) voltageV для українських назв не витягувався
  // взагалі. Тепер витягується — і перевірка почала мати сенс.
  if (a.voltageV !== undefined && b.voltageV !== undefined && a.voltageV !== b.voltageV) return false;
  if (a.capacityKwh !== undefined && b.capacityKwh !== undefined && a.capacityKwh !== b.capacityKwh) return false;
  return true;
}

export const MATCH_AUTO_THRESHOLD = 0.85;
export const MATCH_GREY_ZONE_MIN = 0.5;
