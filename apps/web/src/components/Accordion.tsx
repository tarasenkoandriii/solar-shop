'use client';

import { useState } from 'react';

// За прямим запитом користувача — "при показе результатов показывать
// как аккордеон... перша вкладка квиз / друга специфікація / третя
// генерація пакета документації / четверта експорт результатів".
// Проста, одна відкрита секція за раз (не multi-expand) — послідовний
//, лінійний flow (квиз → специфікація → документи → експорт), що
// логічно відповідає порядку дій користувача, не довільний набір
// незалежних розділів.
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
          <div key={section.key} className="overflow-hidden rounded-2xl border border-leaf-800/10 bg-white">
            <button
              onClick={() => setOpenKey(isOpen ? null : section.key)}
              className="flex w-full items-center justify-between px-4 py-3 text-left"
              aria-expanded={isOpen}
            >
              <span className="flex items-center gap-2 font-medium text-leaf-900">
                {section.title}
                {section.badge && (
                  <span className="rounded-full bg-sun-500/15 px-2 py-0.5 text-xs font-medium text-sun-600">{section.badge}</span>
                )}
              </span>
              <span className={`text-leaf-900/40 transition-transform ${isOpen ? 'rotate-180' : ''}`}>▾</span>
            </button>
            {isOpen && <div className="border-t border-leaf-800/10 p-4">{section.content}</div>}
          </div>
        );
      })}
    </div>
  );
}
