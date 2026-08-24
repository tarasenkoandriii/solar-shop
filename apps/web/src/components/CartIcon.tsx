'use client';

import Link from 'next/link';
import { useCart } from '../lib/cart-context';
import type { Locale } from '../lib/i18n';

export function CartIcon({ locale }: { locale: Locale }) {
  const { itemCount } = useCart();

  return (
    <Link href={`/${locale}/cart`} className="relative flex items-center text-white/80 hover:text-white" aria-label="Кошик">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
        <path d="M3 4h2l2.4 12.4a2 2 0 0 0 2 1.6h7.2a2 2 0 0 0 2-1.6L20 8H6" />
        <circle cx="9" cy="20" r="1.4" fill="currentColor" stroke="none" />
        <circle cx="17" cy="20" r="1.4" fill="currentColor" stroke="none" />
      </svg>
      {itemCount > 0 && (
        <span className="absolute -right-2 -top-2 flex h-4 w-4 items-center justify-center rounded-full bg-sun-500 text-[10px] font-bold text-leaf-900">
          {itemCount}
        </span>
      )}
    </Link>
  );
}
