// Matching engine helpers (ТЗ п.13.2) — извлечение характеристик и
// нечёткое сравнение названий для сопоставления SourceListing <-> Product.
// Триграммное сходство реализовано в чистом JS (не через Postgres pg_trgm
// extension) — портативнее для Vercel Hobby/Supabase без лишних миграций
// расширений; при росте каталога на порядок стоит перейти на pg_trgm
// индекс в БД (см. AUDIT.md).

export interface ExtractedSpecs {
  powerW?: number;
  capacityAh?: number;
  maxCurrentA?: number;
  voltageV?: number;
}

// Обязательный жёсткий фильтр (ТЗ п.13.2): панель 410 Вт никогда не
// матчится с 550 Вт, даже при похожем названии — числовые характеристики
// извлекаются регуляркой и сравниваются точно (без размытия), а не через
// строковое сходство.
export function extractSpecsFromTitle(rawTitle: string): ExtractedSpecs {
  const specs: ExtractedSpecs = {};

  const wattMatch = rawTitle.match(/(\d{2,4})\s*(?:Вт|W|вт)\b/i);
  if (wattMatch) specs.powerW = Number(wattMatch[1]);

  const ahMatch = rawTitle.match(/(\d{2,4})\s*(?:Ач|Ah|ah)\b/i);
  if (ahMatch) specs.capacityAh = Number(ahMatch[1]);

  const currentMatch = rawTitle.match(/(\d{1,3})\s*(?:А|A)\b(?!ч)/);
  if (currentMatch) specs.maxCurrentA = Number(currentMatch[1]);

  const voltMatch = rawTitle.match(/(\d{1,3})\s*(?:В|V)\b/i);
  if (voltMatch) specs.voltageV = Number(voltMatch[1]);

  return specs;
}

// Пытается вытащить код модели производителя из "сырого" заголовка — грубая
// эвристика: самый длинный токен, содержащий и буквы, и цифры (типично для
// MPN вроде "LR5-54HTH-410M", "JKM-410M-54HL4"). Кандидат сверяется/
// сохраняется как Product.manufacturerSku при точном совпадении (ТЗ п.26.5).
export function extractManufacturerSkuCandidate(rawTitle: string): string | null {
  const tokens = rawTitle.split(/\s+/).filter((t) => /[A-Za-z]/.test(t) && /\d/.test(t) && t.length >= 5);
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
  return true;
}

export const MATCH_AUTO_THRESHOLD = 0.85;
export const MATCH_GREY_ZONE_MIN = 0.5;
