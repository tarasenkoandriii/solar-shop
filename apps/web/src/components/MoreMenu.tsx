'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';

interface MoreMenuItem {
  href: string;
  label: string;
}

// Універсальний випадний список для навігації — використовується і для
// "Каталог" (категорії товарів, група росте з часом — нові категорії
// додаються в масив, не в окремий пункт шапки), і для "Ще" (другорядні
// сторінки). Раніше 8+ пунктів навігації тіснились в один ряд — на
// вузьких desktop-екранах переносилось некрасиво, на мобільному
// горизонтальний скрол обрізався без підказки прокрутити.
export function MoreMenu({ label, items }: { label: string; items: MoreMenuItem[] }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1 text-white/80 hover:text-white"
        aria-expanded={open}
      >
        {label}
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className={`h-3.5 w-3.5 transition-transform ${open ? 'rotate-180' : ''}`}>
          <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {open && (
        <div className="absolute left-0 top-full z-40 mt-2 w-56 rounded-xl border border-white/10 bg-leaf-900 py-2 shadow-xl">
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className="block px-4 py-2 text-sm text-white/80 hover:bg-white/5 hover:text-white"
            >
              {item.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
