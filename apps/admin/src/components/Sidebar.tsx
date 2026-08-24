'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAdminLocale } from '../lib/locale-context';

// За прямим запитом користувача — "Сделай пожалуйста мультиязычность
// в админке и тот же переключатель темы что на клиентском сайте
// (отдельно)". Двухуровневое меню — 5 груп, тексти тепер з
// AdminDictionary (uk/ru/en), не хардкод — той самий набір href/груп,
// що раніше, лише джерело лейблів змінилось.
//
// За прямим запитом користувача — "назву проекта - лого - вибір мови
// і теми перенести в заголовок такий як на клієнтському сайті" —
// бренд/LocaleSwitcher/ThemeToggle переїхали до нового Header.tsx
// (окрема горизонтальна панель зверху, як на клієнтському сайті), тут
// лишається ЛИШЕ навігаційне меню.
const GROUP_KEYS = ['catalog', 'sales', 'calculator', 'content', 'system'] as const;

const GROUP_ITEMS: Record<(typeof GROUP_KEYS)[number], string[]> = {
  catalog: ['/products', '/categories', '/listings', '/siblings', '/vendors', '/manufacturers', '/imported-reviews'],
  sales: ['/orders', '/orders-profit', '/import-scout', '/leads', '/promo', '/loyalty'],
  calculator: [
    '/calculator-estimates',
    '/calculator-deliveries',
    '/project-goals',
    '/schema-templates',
    '/business-plan-manifests',
    '/calculator-config',
  ],
  content: ['/articles', '/offices', '/financing-programs', '/solar-map-admin'],
  system: ['/cron', '/expenses'],
};

export function Sidebar() {
  const pathname = usePathname();
  const { dict } = useAdminLocale();

  return (
    <aside className="w-60 shrink-0 overflow-y-auto border-r border-leaf-800/10 bg-leaf-50/40 p-4 dark:border-white/10 dark:bg-white/5">
      <nav className="flex flex-col gap-4">
        {GROUP_KEYS.map((groupKey) => (
          <div key={groupKey}>
            <p className="mb-1 px-3 text-xs font-semibold uppercase tracking-wide text-leaf-900/40 dark:text-white/40">
              {dict.sidebar.groups[groupKey]}
            </p>
            <div className="flex flex-col gap-0.5">
              {GROUP_ITEMS[groupKey].map((href) => (
                <Link
                  key={href}
                  href={href}
                  className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
                    pathname.startsWith(href)
                      ? 'bg-sun-500/20 text-leaf-900 dark:text-white'
                      : 'text-leaf-900/60 hover:bg-leaf-800/5 dark:text-white/60 dark:hover:bg-white/5'
                  }`}
                >
                  {dict.sidebar.items[href] ?? href}
                </Link>
              ))}
            </div>
          </div>
        ))}
      </nav>
    </aside>
  );
}
