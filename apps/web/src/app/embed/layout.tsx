import type { ReactNode } from 'react';

// ТЗ п.34.6.1/34.6.3 — облегчённая вёрстка без общего хедера/футера/навігації
// сайта, ніякої авторизації/персоналізації — тільки сама карта. html/body —
// вже задані в кореневому app/layout.tsx (єдиний на все дерево), тут просто
// прозора обгортка без Header/Footer/CartProvider з app/[locale]/layout.tsx.
export default function EmbedLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
