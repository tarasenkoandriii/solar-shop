export interface ListingForPricing {
  priceUsd: number;
  inStock: boolean;
  vendorWarehouseCities: string[];
}

export interface ComputedProductPricing {
  // За прямим запитом користувача — "показывать цену товара по
  // второму из самых дешёвых вариантов, и считать заказ комплекта по
  // самому дешевому (внутренняя цена) и по этому второму варианту
  // (публичная цена)". cachedCostPriceUsd — внутрішня собівартість
  // (найдешевший listing), НІКОЛИ не показується публічно.
  // cachedPriceUsd — те, що бачить покупець, ТЕПЕР другий за
  // дешевизною (не найдешевший, як раніше) — семантика поля для
  // споживачів (каталог/калькулятор/рахунки) НЕ змінюється, змінився
  // лише спосіб обчислення значення.
  cachedCostPriceUsd: number | null;
  cachedPriceUsd: number | null;
  cachedInStock: boolean;
  cachedWarehouseCities: string[];
  cachedIsPromo: boolean;
  cachedDiscountPercent: number | null;
}

// ТЗ п.13.3 (оновлено за прямим запитом користувача): "внутрішня"
// собівартість — найдешевший listing в наявності. Публічна ціна (те,
// що бачить покупець, використовує калькулятор, потрапляє в рахунки)
// — ДРУГИЙ за дешевизною listing. Якщо listing лише ОДИН — публічна
// ціна дорівнює собівартості (немає з чого формувати націнку, прибуток
// на цій позиції нульовий — саме такі позиції стають кандидатами на
// делегування іншим постачальникам, розділ README).
//
// Акція (ТЗ п.18.2) — тепер порівнюється ПУБЛІЧНА ціна (не
// собівартість, яку покупець і так не бачить) із середнім серед
// РЕШТИ listings, окрім двох уже використаних (собівартість +
// публічна) — потребує щонайменше 3 listings в наявності, інакше
// "ринку" для порівняння просто немає.
export function computeProductPricing(
  listings: ListingForPricing[],
  promoThresholdPercent: number,
): ComputedProductPricing {
  const inStockListings = listings.filter((l) => l.inStock);

  if (inStockListings.length === 0) {
    return {
      cachedCostPriceUsd: null,
      cachedPriceUsd: null,
      cachedInStock: false,
      cachedWarehouseCities: [],
      cachedIsPromo: false,
      cachedDiscountPercent: null,
    };
  }

  const sorted = [...inStockListings].sort((a, b) => a.priceUsd - b.priceUsd);
  const cheapest = sorted[0];
  const publicListing = sorted.length >= 2 ? sorted[1] : sorted[0];
  const cachedWarehouseCities = Array.from(new Set(inStockListings.flatMap((l) => l.vendorWarehouseCities)));

  let cachedIsPromo = false;
  let cachedDiscountPercent: number | null = null;

  if (sorted.length >= 3) {
    const others = sorted.slice(2);
    const baseline = others.reduce((sum, l) => sum + l.priceUsd, 0) / others.length;
    const discountPercent = ((baseline - publicListing.priceUsd) / baseline) * 100;
    if (discountPercent >= promoThresholdPercent) {
      cachedIsPromo = true;
      cachedDiscountPercent = Math.round(discountPercent * 10) / 10;
    }
  }

  return {
    cachedCostPriceUsd: cheapest.priceUsd,
    cachedPriceUsd: publicListing.priceUsd,
    cachedInStock: true,
    cachedWarehouseCities,
    cachedIsPromo,
    cachedDiscountPercent,
  };
}
