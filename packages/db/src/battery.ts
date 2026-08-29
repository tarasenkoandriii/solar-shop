// Розрахунок кількості акумуляторів.
//
// АУДИТ 27.08.2026 — одна з найдорожчих знахідок другого проходу.
//
// Було так (calculator.service.ts):
//
//   const capacityKwh = Number(specs.capacityKwh ?? 3.5);
//   const quantity = Math.max(1, Math.ceil(target / capacityKwh));
//
// Три помилки в двох рядках, і всі три зміщують результат в один бік —
// клієнт отримує МЕНШЕ батарей, ніж треба.
//
// 1. Поля capacityKwh у товарів парсера НЕМАЄ. extractSpecsFromTitle()
//    (matching.ts) витягує з назви лише capacityAh — ампер-години. Формули
//    Ач × В ÷ 1000 у проєкті не було ніде, тож для КОЖНОГО спарсеного
//    акумулятора спрацьовував фолбек 3.5.
//
// 2. Глибина розряду не враховувалась. У свинцевих (AGM/GEL) безпечно
//    використовувати близько половини номіналу — розряд глибше різко
//    скорочує ресурс. Літій витримує 80%. Різниця між хіміями — майже
//    вдвічі, і саме вона визначає, скільки банок треба купити.
//
// 3. ККД інвертора не враховувався. Постійний струм із батареї
//    перетворюється на 220В із втратами близько 10%.
//
// Разом на реальному прикладі: мета 10 кВт·год, підібрано гелевий 165 Ач.
// Старий код: 10 / 3.5 = 3 штуки. Насправді 165 × 12 ÷ 1000 = 1.98 кВт·год
// номіналу, з них корисних 1.98 × 0.5 × 0.9 ≈ 0.89 → потрібно 12 штук.
// Занижено вчетверо. Система сідає посеред першої ж ночі — і це вже
// гарантійна розмова, а не незадоволення.

export type BatteryChemistry = 'LIFEPO4' | 'GEL' | 'AGM' | null | undefined;

// Частка номінальної ємності, яку можна реально використати, не вбиваючи
// ресурс. Значення свідомо консервативні: помилка в цей бік коштує
// клієнту зайвої банки, помилка в інший — севшої вночі системи й
// передчасної заміни всього блоку.
export const DEPTH_OF_DISCHARGE: Record<'LIFEPO4' | 'GEL' | 'AGM' | 'UNKNOWN', number> = {
  LIFEPO4: 0.8,
  GEL: 0.5,
  AGM: 0.5,
  // Хімія невідома — рахуємо як свинець. Для літію це дасть запас, для
  // свинцю буде правильно; протилежний дефолт недорахував би вдвічі.
  UNKNOWN: 0.5,
};

// ККД перетворення постійного струму в 220В. Типове значення для
// синусоїдного інвертора під навантаженням.
export const INVERTER_EFFICIENCY = 0.9;

export function depthOfDischargeFor(chemistry: BatteryChemistry): number {
  if (chemistry === 'LIFEPO4' || chemistry === 'GEL' || chemistry === 'AGM') return DEPTH_OF_DISCHARGE[chemistry];
  return DEPTH_OF_DISCHARGE.UNKNOWN;
}

// Скільки кВт·год НОМІНАЛУ в одній банці.
//
// Повертає null, якщо порахувати чесно неможливо. Саме null, а не
// підставлена константа: викликач має або взяти інший товар, або сказати
// користувачу, що ємність невідома. Мовчазний дефолт — рівно те, з чого
// цей баг і почався.
export function batteryCapacityKwh(specs: unknown): number | null {
  if (typeof specs !== 'object' || specs === null) return null;
  const s = specs as Record<string, unknown>;

  // Якщо ємність указана в кВт·год прямо (ручне заведення товару в
  // адмінці, деякі готові блоки) — беремо як є.
  const direct = Number(s.capacityKwh);
  if (Number.isFinite(direct) && direct > 0) return direct;

  // Інакше рахуємо з ампер-годин, які й витягує парсер із назви.
  const ah = Number(s.capacityAh);
  const v = Number(s.voltageV);
  if (!Number.isFinite(ah) || ah <= 0) return null;
  if (!Number.isFinite(v) || v <= 0) return null;

  return (ah * v) / 1000;
}

export interface BatteryCountResult {
  quantity: number;
  // Скільки корисної енергії дає ОДНА банка після знижок на глибину
  // розряду й ККД інвертора. Потрібне для тексту обґрунтування — щоб у
  // кошторисі було видно, звідки взялася кількість.
  usableKwhPerUnit: number;
  nominalKwhPerUnit: number;
  depthOfDischarge: number;
}

// targetUsableKwh — скільки енергії клієнт реально хоче знімати з батарей
// (саме те, що людина має на увазі, кажучи "10 кВт·год на ніч"), а не
// номінал блоку.
export function batteryCountFor(targetUsableKwh: number, nominalKwhPerUnit: number, chemistry: BatteryChemistry): BatteryCountResult | null {
  if (!Number.isFinite(targetUsableKwh) || targetUsableKwh <= 0) return null;
  if (!Number.isFinite(nominalKwhPerUnit) || nominalKwhPerUnit <= 0) return null;

  const dod = depthOfDischargeFor(chemistry);
  const usableKwhPerUnit = nominalKwhPerUnit * dod * INVERTER_EFFICIENCY;
  if (usableKwhPerUnit <= 0) return null;

  return {
    quantity: Math.max(1, Math.ceil(targetUsableKwh / usableKwhPerUnit)),
    usableKwhPerUnit: Math.round(usableKwhPerUnit * 100) / 100,
    nominalKwhPerUnit: Math.round(nominalKwhPerUnit * 100) / 100,
    depthOfDischarge: dod,
  };
}
