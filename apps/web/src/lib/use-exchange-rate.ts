'use client';

import { useEffect, useState } from 'react';
import type { ExchangeRate } from './api';

export function useExchangeRate(): number {
  const [rateUah, setRateUah] = useState(41.5);

  useEffect(() => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
    fetch(`${apiUrl}/currency/rate`)
      .then((res) => res.json())
      .then((data: ExchangeRate) => setRateUah(parseFloat(data.rateUah)))
      .catch(() => {});
  }, []);

  return rateUah;
}
