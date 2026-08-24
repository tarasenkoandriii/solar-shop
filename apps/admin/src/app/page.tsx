'use client';

import Link from 'next/link';
import { useAdminLocale } from '../lib/locale-context';

export default function AdminHomePage() {
  const { dict } = useAdminLocale();
  const d = dict.pages.dashboard;
  return (
    <div>
      <h1 className="mb-4 text-xl font-semibold text-leaf-900 dark:text-white">{d.title}</h1>
      <p className="text-leaf-900/60 dark:text-white/60">
        {d.introPrefix}
        <Link href="/products" className="underline">
          {d.products}
        </Link>
        {d.separator}
        <Link href="/manufacturers" className="underline">
          {d.manufacturers}
        </Link>
        {d.separator}
        <Link href="/offices" className="underline">
          {d.offices}
        </Link>
        {d.lastSeparator}
        <Link href="/leads" className="underline">
          {d.leads}
        </Link>
        .
      </p>
    </div>
  );
}
