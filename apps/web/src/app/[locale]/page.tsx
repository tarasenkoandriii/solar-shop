import Link from 'next/link';
import Image from 'next/image';
import nextDynamic from 'next/dynamic';
import { isLocale, type Locale } from '../../lib/i18n';
import { getDictionary } from '../../lib/get-dictionary';
import { apiGet } from '../../lib/api';
import type { Manufacturer } from '../../lib/api';
import { notFound } from 'next/navigation';
import { categoryIconFor } from '../../components/icons';
import { ManufacturerAvatar } from '../../components/ManufacturerAvatar';
import { loadSolarGridPoints } from '../../lib/solar-grid';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// За прямим запитом користувача ("не показывает не все категории из
// админки") — той самий тип, що вже локально в Header.tsx (не
// винесено у спільний lib/api.ts — обидва місця незалежно
// потребували лише 4 поля, дублювання невеликого interface тут
// прийнятне, не обов'язково рефакторити спільний файл заради цього).
interface CategoryPublic {
  key: string;
  nameUk: string;
  nameRu: string;
  nameEn: string;
}

const SolarPotentialMap = nextDynamic(
  () => import('../../components/SolarPotentialMap').then((m) => m.SolarPotentialMap),
  { ssr: false },
);

export default async function HomePage({ params }: { params: { locale: string } }) {
  if (!isLocale(params.locale)) notFound();
  const locale = params.locale as Locale;
  const dict = getDictionary(locale);

  const [manufacturers, solarMapPoints, allCategories] = await Promise.all([
    apiGet<Manufacturer[]>('/manufacturers', 3600).catch(() => [] as Manufacturer[]),
    loadSolarGridPoints(),
    apiGet<CategoryPublic[]>('/categories', 60).catch(() => [] as CategoryPublic[]),
  ]);

  const nameByLocale = (c: CategoryPublic) => ({ uk: c.nameUk, ru: c.nameRu, en: c.nameEn })[locale];

  // За прямим запитом користувача — знайдено реальний баг: цей масив
  // раніше був ЖОРСТКО закодований лише на 3 елементи, НІКОЛИ не
  // підключений до API — нові APPROVED категорії (CABLE/CONNECTOR
  // тощо) НІКОЛИ не з'являлись тут, хоча Header ЦЕ вже робив коректно
  // (той самий підхід тепер тут теж). 3 відомі типи лишають власні,
  // SEO-friendly маршрути й іконки (не чіпались), БУДЬ-ЯКА інша
  // APPROVED категорія додається сюди динамічно з generic-іконкою,
  // лінкує на /catalog/[categoryKey].
  //
  // Іконки більше не перелічуються тут поштучно — беруться з
  // categoryIconFor() (components/icons/index.ts). До цього три
  // «відомі» категорії мали свої іконки прямо в цьому масиві, а всі
  // інші отримували GenericCategoryIcon, тож Кабель, Конектори та
  // Інвертори стояли в сітці трьома однаковими кубиками поспіль.
  const KNOWN_CATEGORY_KEYS = new Set(['SOLAR_PANEL', 'BATTERY', 'CONTROLLER']);
  const categories = [
    { href: `/${locale}/solar-panels`, label: dict.nav.solarPanels, Icon: categoryIconFor('SOLAR_PANEL') },
    { href: `/${locale}/batteries`, label: dict.nav.batteries, Icon: categoryIconFor('BATTERY') },
    { href: `/${locale}/controllers`, label: dict.nav.controllers, Icon: categoryIconFor('CONTROLLER') },
    ...allCategories
      .filter((c) => !KNOWN_CATEGORY_KEYS.has(c.key))
      .map((c) => ({ href: `/${locale}/catalog/${c.key}`, label: nameByLocale(c), Icon: categoryIconFor(c.key) })),
  ];

  return (
    <>
      {/* Hero — фото дому з сонячними панелями (imagegen-спека, doc/solar-hero-i18n.json).
          Дві версії зображення (desktop 16:9 / mobile 3:4 crop), текст —
          окремий HTML/CSS-шар поверх градієнта, не вшитий у саму картинку —
          єдине зображення обслуговує всі 3 локалі без перегенерації. */}
      <section className="relative isolate overflow-hidden bg-leaf-900 text-white">
        <div className="relative h-[560px] w-full sm:h-[620px] md:h-[680px]">
          {/* Desktop/tablet зображення (16:9, ширший кадр) */}
          <Image
            src="/hero/solar-roof.webp"
            alt={dict.hero.alt}
            fill
            priority
            sizes="100vw"
            className="hidden object-cover md:block"
          />
          {/* Мобільна версія — окремий портретний crop (не object-cover
              обрізка десктопної), дім лишається в кадрі на вузькому екрані */}
          <Image
            src="/hero/solar-roof-mobile.webp"
            alt={dict.hero.alt}
            fill
            priority
            sizes="100vw"
            className="block object-cover md:hidden"
          />

          {/* Градієнт-оверлей — окремий шар, не частина зображення */}
          <div
            className="absolute inset-0 hidden md:block"
            style={{
              background:
                'linear-gradient(90deg, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.30) 38%, rgba(0,0,0,0.05) 72%, rgba(0,0,0,0) 100%)',
            }}
          />
          <div
            className="absolute inset-0 block md:hidden"
            style={{ background: 'linear-gradient(135deg, rgba(0,0,0,0.60) 0%, rgba(0,0,0,0.35) 45%, rgba(0,0,0,0.10) 100%)' }}
          />

          {/* Текстовий блок — desktop: позиціонування за safe_zone зі спеки
              (left 5%, top 22%, width 40%, height 60%), fluid-типографіка
              через clamp(), базові розміри задані "at 2560px" у спеці. */}
          <div
            className="absolute hidden flex-col items-start justify-center md:flex"
            style={{ left: '5%', top: '22%', width: '35%', height: '60%' }}
          >
            <h1
              className="font-bold"
              style={{ fontSize: 'clamp(28px, 2.8125vw, 72px)', lineHeight: 1.08, color: '#FFFFFF' }}
            >
              {dict.hero.title}
            </h1>
            <p
              className="mt-5"
              style={{ fontSize: 'clamp(16px, 1.09375vw, 28px)', lineHeight: 1.35, color: '#E8EEF2', maxWidth: '94%' }}
            >
              {dict.hero.subtitle}
            </p>
            <div className="mt-9 flex flex-wrap items-center gap-4">
              <Link
                href={`/${locale}/solar-panels`}
                className="rounded-full font-semibold text-white"
                style={{
                  fontSize: 'clamp(14px, 0.9375vw, 24px)',
                  backgroundColor: '#FF8A00',
                  padding: 'clamp(12px, 1.125vw, 22px) clamp(20px, 1.875vw, 36px)',
                }}
              >
                {dict.hero.ctaCatalog}
              </Link>
              <Link
                href={`/${locale}/calculator`}
                className="rounded-full border font-semibold text-white"
                style={{
                  fontSize: 'clamp(14px, 0.9375vw, 24px)',
                  borderColor: '#FFFFFF',
                  padding: 'clamp(12px, 1.125vw, 22px) clamp(20px, 1.875vw, 36px)',
                }}
              >
                {dict.hero.ctaCalculate}
              </Link>
            </div>
          </div>

          {/* Мобільний текстовий блок — своя safe_zone (top 12%, left 7%,
              width 86%), простіша фіксована шкала розмірів замість повної
              clamp-формули з desktop (мобільних розмірів шрифту спека не
              задає окремо, тільки zone) */}
          <div className="absolute flex flex-col items-start justify-start px-[7%] pt-[12%] md:hidden" style={{ width: '86%' }}>
            <h1 className="text-3xl font-bold leading-tight text-white">{dict.hero.title}</h1>
            <p className="mt-3 text-base text-[#E8EEF2]">{dict.hero.subtitle}</p>
            <div className="mt-6 flex w-full flex-col gap-3">
              <Link
                href={`/${locale}/solar-panels`}
                className="rounded-full px-6 py-3 text-center text-sm font-semibold text-white"
                style={{ backgroundColor: '#FF8A00' }}
              >
                {dict.hero.ctaCatalog}
              </Link>
              <Link
                href={`/${locale}/calculator`}
                className="rounded-full border border-white px-6 py-3 text-center text-sm font-semibold text-white"
              >
                {dict.hero.ctaCalculate}
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* За прямим запитом користувача ("сделай по тз") — розділ 6/46
          ТЗ: ambient-glow як єдиний штрих modern-режиму, ІЄРАРХІЯ
          поверхонь (--bg-0 → --bg-2 → картка) вже приходить
          автоматично через глобальні CSS-правила (globals.css) для
          text-leaf-900/bg-leaf-50/border-leaf-800 — тут лишено лише
          те, чого НЕМАЄ в classic взагалі: шрифт заголовків,
          анімації, live-індикатор. */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 -z-10 hidden [[data-theme=modern]_&]:block"
        style={{
          background: 'radial-gradient(600px 400px at 15% 20%, rgba(232,155,31,0.08), transparent 70%)',
        }}
      >
        <div className="absolute left-[10%] top-[15%] h-96 w-96 animate-ambient-drift rounded-full bg-modern-accent/[0.06] blur-3xl" />
      </div>

      <section className="relative mx-auto max-w-6xl px-4 py-16">
        <h2 className="mb-4 text-2xl font-semibold text-leaf-900 [[data-theme=modern]_&]:font-display">{dict.about.title}</h2>
        <p className="max-w-3xl text-leaf-900/70">{dict.about.text}</p>
      </section>

      <section className="relative mx-auto max-w-6xl px-4 pb-16">
        <h2 className="mb-6 text-2xl font-semibold text-leaf-900 [[data-theme=modern]_&]:font-display">{dict.categories.title}</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          {categories.map((cat, i) => (
            <Link
              key={cat.href}
              href={cat.href}
              // За прямим запитом користувача ("make same animated
              // styles") — staggered fade-up при завантаженні (один
              // orchestrated момент для сітки категорій, не розкидані
              // ефекти). Hover-glow на border/shadow — modern-
              // специфічний штрих, якого немає в classic
              // (hover:shadow-lg вже нейтральний в обох темах).
              className="group flex animate-fade-up flex-col items-center gap-3 rounded-2xl border border-leaf-800/10 bg-leaf-50 p-8 text-center transition hover:shadow-lg [[data-theme=modern]_&]:hover:border-modern-accent/40 [[data-theme=modern]_&]:hover:shadow-[0_0_24px_-4px_rgba(232,155,31,0.25)]"
              style={{ animationDelay: `${i * 80}ms` }}
            >
              <cat.Icon className="h-10 w-10 text-leaf-900 transition-colors group-hover:text-sun-500 [[data-theme=modern]_&]:group-hover:text-modern-accent" aria-hidden="true" />
              <span className="font-medium text-leaf-900">{cat.label}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* Карта сонячного потенціалу — раніше статична заглушка placehold.co
          (Фаза 1, ТЗ п.34.1), тепер справжня інтерактивна карта (Фаза 4,
          той самий компонент, що на /solar-map) — не залежить від
          доступності стороннього сервісу-заглушки і одразу дає реальну
          користь на головній, не просто ілюстрацію. */}
      <section className="relative mx-auto max-w-6xl px-4 pb-16">
        {/* За прямим запитом користувача ("modern - like
            trafficvision.live") — сигнатурний елемент: пульсуючий
            "live"-індикатор, змістовна паралель "живих камер"
            референсу → "живі дані генерації" сонця з PVGIS. Колір —
            --success (розділ 5.5 ТЗ: семантичний колір для "активно/
            працює", не акцентний — акцент лишається для CTA). */}
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-2xl font-semibold text-leaf-900 [[data-theme=modern]_&]:font-display">{dict.solarMap.title}</h2>
          <span className="hidden items-center gap-2 rounded-full border border-modern-success/30 bg-modern-success/10 px-3 py-1 text-xs font-medium text-modern-success [[data-theme=modern]_&]:flex">
            <span className="h-1.5 w-1.5 animate-live-pulse rounded-full bg-modern-success" />
            Дані оновлюються
          </span>
        </div>
        <div className="overflow-hidden rounded-2xl border border-leaf-800/10">
          <SolarPotentialMap points={solarMapPoints} height={400} />
          <div className="flex flex-wrap items-center justify-between gap-3 bg-leaf-50 px-4 py-3">
            <p className="text-xs text-leaf-900/60">
              {dict.solarMap.caption} ·{' '}
              <a
                href="https://re.jrc.ec.europa.eu/pvg_tools/en/"
                target="_blank"
                rel="noopener noreferrer"
                className="underline"
              >
                {dict.solarMap.source}
              </a>
            </p>
            <Link href={`/${locale}/solar-map`} className="text-xs font-medium text-leaf-700 underline [[data-theme=modern]_&]:text-modern-accent">
              {dict.solarMap.title} →
            </Link>
          </div>
        </div>
      </section>

      {manufacturers.length > 0 && (
        <section className="relative mx-auto max-w-6xl px-4 pb-16">
          <h2 className="mb-6 text-2xl font-semibold text-leaf-900 [[data-theme=modern]_&]:font-display">{dict.manufacturers.title}</h2>
          <div className="flex flex-wrap gap-6">
            {manufacturers.map((m) => (
              <div
                key={m.id}
                className="flex h-16 items-center gap-3 rounded-xl border border-leaf-800/10 px-5 text-sm font-medium text-leaf-900/70"
              >
                <ManufacturerAvatar name={m.name} logoUrl={m.logoUrl} />
                <span>{m.name}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* За запитом користувача (27.08.2026) блок «Наші офіси» з головної
          прибрано. Він показував сітку на чотири колонки з таблиці Office,
          а офіс насправді один — київський, і його адреса, карта й графік
          тепер живуть на сторінці «Контакти». Дублювати один офіс на
          головній сіткою, розрахованою на чотири, немає сенсу.

          Разом із блоком прибрано й запит /offices із Promise.all вище —
          сторінка більше не ходить в API за даними, яких не показує. */}
    </>
  );
}
