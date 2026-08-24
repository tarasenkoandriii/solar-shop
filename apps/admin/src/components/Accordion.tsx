'use client';

import { useState } from 'react';

// За прямим запитом користувача — "в том же дизайне (аккордеон)".
// Дублює apps/web/src/components/Accordion.tsx — два незалежні
// Next.js застосунки без спільного UI-пакета, дублювання тут
// прийнятне (той самий підхід, що вже для інших компонентів,
// продубльованих між apps/web і apps/admin раніше в проєкті).
interface AccordionSection {
  key: string;
  title: string;
  badge?: string;
  content: React.ReactNode;
}

export function Accordion({ sections, defaultOpenKey }: { sections: AccordionSection[]; defaultOpenKey?: string }) {
  const [openKey, setOpenKey] = useState<string | null>(defaultOpenKey ?? sections[0]?.key ?? null);

  return (
    <div className="flex flex-col gap-3">
      {sections.map((section) => {
        const isOpen = openKey === section.key;
        return (
          <div key={section.key} className="overflow-hidden rounded-2xl border border-leaf-800/10 bg-white dark:border-white/10 dark:bg-white/5">
            <button
              onClick={() => setOpenKey(isOpen ? null : section.key)}
              className="flex w-full items-center justify-between px-4 py-3 text-left"
              aria-expanded={isOpen}
            >
              <span className="flex items-center gap-2 font-medium text-leaf-900 dark:text-white">
                {section.title}
                {section.badge && (
                  <span className="rounded-full bg-sun-500/15 px-2 py-0.5 text-xs font-medium text-sun-600">{section.badge}</span>
                )}
              </span>
              <span className={`text-leaf-900/40 transition-transform dark:text-white/40 ${isOpen ? 'rotate-180' : ''}`}>▾</span>
            </button>
            {isOpen && <div className="border-t border-leaf-800/10 p-4 dark:border-white/10">{section.content}</div>}
          </div>
        );
      })}
    </div>
  );
}
