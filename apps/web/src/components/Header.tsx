import Link from 'next/link';
import type { Locale } from '../lib/i18n';
import { getDictionary } from '../lib/get-dictionary';
import { apiGet } from '../lib/api';
import { CurrencySwitcher } from './CurrencySwitcher';
import { LocaleSwitcher } from './LocaleSwitcher';
import { TelegramLoginButton } from './TelegramLoginButton';
import { DevLoginButton } from './DevLoginButton';
import { AdminDevLoginLink } from './AdminDevLoginLink';
import { CartIcon } from './CartIcon';
import { MoreMenu } from './MoreMenu';
import { MobileMenu } from './MobileMenu';
import { ThemeToggle } from './ThemeToggle';

interface CategoryPublic {
  key: string;
  nameUk: string;
  nameRu: string;
  nameEn: string;
}

// Перероблено: раніше 8 окремих пунктів навігації + перемикачі валюти/
// мови + 4 іконки тіснились в один ряд. Тепер: категорії товарів
// згруповані в один випадний пункт "Каталог" (нові категорії в
// майбутньому — просто новий рядок у масиві catalogNav, не новий пункт
// шапки), "Калькулятор"/"Новини"/"Кредитування" лишаються окремими
// топ-рівневими пунктами (кредитування перенесено з "Ще" в основний ряд
// за окремим запитом — програми кредитування достатньо важливі для СЕС,
// щоб бути завжди на видноті), решта другорядних сторінок — у "Ще". На
// мобільному — повноцінне бургер-меню замість горизонтального скролу.
//
// За прямим запитом користувача — "показать в клиентском сайте все
// промодерированные категории из этой новой таблицы". 3 відомі категорії
// (SOLAR_PANEL/BATTERY/CONTROLLER) лишають власні виділені, SEO-friendly
// маршрути (не чіпались — dict-переклади, existing робочі сторінки), БУДЬ-
// ЯКА інша APPROVED категорія (з'явиться після модерації в адмінці)
// додається сюди динамічно, лінкує на generic /catalog/[categoryKey].
export async function Header({ locale }: { locale: Locale }) {
  const dict = getDictionary(locale);

  const KNOWN_CATEGORY_KEYS = new Set(['SOLAR_PANEL', 'BATTERY', 'CONTROLLER']);
  // За прямим запитом користувача ("не показывает не все категории")
  // — TTL зменшено з 300с (5 хвилин) до 60с — той самий, що вже
  // застосований для інших нечасто-змінюваних, але важливих для
  // коректності даних (виробники/офіси тощо). Категорії — рідкісна
  // адміністративна дія, не потребує revalidate: 0, але 5 хвилин
  // затримки після модерації занадто довго.
  const categories = await apiGet<CategoryPublic[]>('/categories', 60).catch(() => [] as CategoryPublic[]);
  const nameByLocale = (c: CategoryPublic) => ({ uk: c.nameUk, ru: c.nameRu, en: c.nameEn })[locale];

  // Категорії товарів — єдине джерело для десктопного "Каталог" і
  // мобільної згрупованої секції.
  const catalogNav = [
    { href: `/${locale}/solar-panels`, label: dict.nav.solarPanels },
    { href: `/${locale}/batteries`, label: dict.nav.batteries },
    { href: `/${locale}/controllers`, label: dict.nav.controllers },
    ...categories
      .filter((c) => !KNOWN_CATEGORY_KEYS.has(c.key))
      .map((c) => ({ href: `/${locale}/catalog/${c.key}`, label: nameByLocale(c) })),
  ];

  // За запитом користувача (27.08.2026): «Контакти» перенесено в головне
  // меню, випадний список «Ще» прибрано.
  //
  // Передісторія за два кроки. Спершу «Оплату» об'єднали з «Контактами» —
  // і в «Ще» лишився РІВНО ОДИН пункт. Випадний список заради одного
  // пункту гірший за сам пункт: зайвий клік, і ще треба здогадатися, що
  // контакти сховані саме за словом «Ще».
  //
  // Маршрут /payment не зник, а перенаправляє на /contacts
  // (див. next.config.mjs). Ключі dict.nav.payment і dict.nav.more у
  // словниках лишено: вони знадобляться, якщо сторінки колись розділять
  // назад, а чистити три словники заради двох невикористаних ключів сенсу
  // немає.
  const primaryNav = [
    { href: `/${locale}/calculator`, label: dict.nav.calculator },
    { href: `/${locale}/articles`, label: dict.nav.articles },
    { href: `/${locale}/financing`, label: dict.nav.financing },
    { href: `/${locale}/contacts`, label: dict.nav.contacts },
  ];

  return (
    // За прямим запитом користувача ("сделай по тз") — розділ 7 ТЗ:
    // sticky, background bg-1, border-bottom 1px, без важкої тіні.
    // bg-leaf-900/border-white вже автоматично отримують нову
    // палітру через глобальні CSS-правила (globals.css) — тут лишено
    // лише modern-специфічний backdrop-blur (не мапиться на жоден
    // classic-клас).
    <header className="sticky top-0 z-30 bg-leaf-900 text-white [[data-theme=modern]_&]:backdrop-blur-md">
      <div className="relative mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
        <div className="flex items-center gap-8">
          {/* Розділ 7 ТЗ: логотип компактний, 22-28px висота — font-
              display лише зовнішній штрих (modern-специфічний
              шрифт), сам розмір тексту вже відповідає вимозі. */}
          <Link href={`/${locale}`} className="shrink-0 text-lg font-bold text-sun-400 [[data-theme=modern]_&]:font-display [[data-theme=modern]_&]:text-modern-accent">
            ☀ Solar Shop
          </Link>
          <nav className="hidden items-center gap-6 text-sm font-medium md:flex">
            <MoreMenu label={dict.nav.catalogNav} items={catalogNav} />
            {/* Розділ 8 ТЗ — Navigation item: 14px/500, height 36-40px,
                padding 0 10-12px, radius 7-8px, hover: bg-3 +
                text-primary. Це modern-специфічний ПРОСТІР/фон, якого
                немає в classic (там навмисно прості текстові
                посилання без padding) — тому явні класи, не
                глобальне правило. */}
            {primaryNav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="text-white/80 hover:text-white [[data-theme=modern]_&]:flex [[data-theme=modern]_&]:h-9 [[data-theme=modern]_&]:items-center [[data-theme=modern]_&]:rounded-lg [[data-theme=modern]_&]:px-3 [[data-theme=modern]_&]:text-modern-textSecondary [[data-theme=modern]_&]:transition-colors [[data-theme=modern]_&]:hover:bg-modern-bg3 [[data-theme=modern]_&]:hover:text-modern-textPrimary"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden items-center gap-3 border-r border-white/15 pr-4 md:flex">
            <CurrencySwitcher />
            <LocaleSwitcher current={locale} />
            {/* За прямим запитом користувача — "добавить переключатель
                стилей... classic - как сейчас (default) / modern" */}
            <ThemeToggle />
          </div>
          <div className="flex items-center gap-3">
            <Link href={`/${locale}/account`} className="flex items-center text-white/80 hover:text-white" aria-label={dict.nav.account}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
                <circle cx="12" cy="8" r="3.5" />
                <path d="M4.5 20c1.4-3.6 4.4-5.5 7.5-5.5s6.1 1.9 7.5 5.5" />
              </svg>
            </Link>
            <CartIcon locale={locale} />
            <div className="hidden md:block">
              <TelegramLoginButton dict={dict} />
            </div>
            <div className="hidden md:block">
              <DevLoginButton />
            </div>
            <div className="hidden md:block">
              <AdminDevLoginLink />
            </div>
          </div>
          <MobileMenu
            locale={locale}
            dict={dict}
            menuLabel={dict.nav.menu}
            catalogLabel={dict.nav.catalogNav}
            catalogItems={catalogNav}
            primaryItems={primaryNav}
          />
        </div>
      </div>
    </header>
  );
}
