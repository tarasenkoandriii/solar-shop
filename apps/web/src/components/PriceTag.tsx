'use client';

import { useCurrency, formatPrice } from './CurrencySwitcher';

export function PriceTag({ priceUsd, rateUah }: { priceUsd: string | number; rateUah: number }) {
  const [currency] = useCurrency();
  return <span>{formatPrice(priceUsd, currency, rateUah)}</span>;
}
