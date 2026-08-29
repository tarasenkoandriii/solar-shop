import { Fragment } from 'react';
import { notFound } from 'next/navigation';
import { isLocale, type Locale } from '../../../lib/i18n';
import { getDictionary } from '../../../lib/get-dictionary';
import { COMPANY, COMPANY_PHONE_HREF } from '../../../lib/company';
import { OfficeMap } from '../../../components/OfficeMap';
import { LeadForm } from '../../../components/LeadForm';

// За запитом користувача (27.08.2026): сторінку «Оплата» об'єднано з
// «Контактами», результат називається «Контакти», офіс один — київський,
// точка на карті показується одразу.
//
// Чому об'єднання виправдане, а не просто скорочення меню: обидві
// сторінки описували ОДНУ юридичну особу й дублювали половину полів —
// назва, адреса, телефон, e-mail були і там, і там, причому з різних
// джерел (контакти читали таблицю Office, оплата — константи). Розходження
// між ними було питанням часу.
//
// Стару /payment прибрано з навігації, а сам маршрут перенаправляє сюди
// (next.config.mjs) — посилання з листів і закладок не ламаються.
//
// Верстка приведена до колишньої сторінки оплати, як і просили:
// max-w-3xl, ті самі заголовки h2 і той самий список <dl> для реквізитів.

const PAYMENT_PURPOSE = 'Оплата за товар згідно рахунку №___';

// Рядки збираються так, щоб порожні реквізити просто не потрапляли у
// видачу. Раніше сторінка показувала покупцю "[IBAN]" і "[Назва банку]" —
// це гірше за відсутність рядка: виглядає як зламана сторінка й підриває
// довіру рівно в той момент, коли людина зібралася платити.
const PAYMENT_DETAILS: { label: string; value: string }[] = [
  { label: 'Отримувач', value: COMPANY.legalName },
  { label: 'ЄДРПОУ', value: COMPANY.edrpou },
  { label: 'Юридична адреса', value: COMPANY.address },
  { label: 'IBAN', value: COMPANY.iban },
  { label: 'Банк', value: COMPANY.bank },
  { label: 'Призначення платежу', value: PAYMENT_PURPOSE },
].filter((row) => row.value.length > 0);

export default function ContactsPage({ params }: { params: { locale: string } }) {
  if (!isLocale(params.locale)) notFound();
  const locale = params.locale as Locale;
  const dict = getDictionary(locale);

  const steps = [dict.payment.process1, dict.payment.process2, dict.payment.process3, dict.payment.process4, dict.payment.process5];

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="mb-8 text-2xl font-semibold text-leaf-900">{dict.contacts.title}</h1>

      {/* ---- Офіс ---- */}
      <div className="mb-6 rounded-2xl border border-leaf-800/10 p-5">
        <h2 className="font-semibold text-leaf-900">{COMPANY.legalName}</h2>
        <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
          <dt className="text-leaf-900/50">Адреса</dt>
          <dd className="font-medium text-leaf-900">{COMPANY.address}</dd>
          <dt className="text-leaf-900/50">Телефон</dt>
          <dd className="font-medium text-leaf-900">
            <a href={COMPANY_PHONE_HREF} className="underline underline-offset-2 hover:text-leaf-700">
              {COMPANY.phone}
            </a>
          </dd>
          <dt className="text-leaf-900/50">E-mail</dt>
          <dd className="font-medium text-leaf-900">
            <a href={`mailto:${COMPANY.email}`} className="underline underline-offset-2 hover:text-leaf-700">
              {COMPANY.email}
            </a>
          </dd>
          <dt className="text-leaf-900/50">Графік</dt>
          <dd className="font-medium text-leaf-900">{COMPANY.workHours}</dd>
        </dl>
      </div>

      <div className="mb-10">
        <OfficeMap title={`${dict.contacts.title} — ${COMPANY.address}`} />
      </div>

      {/* ---- Оплата (колишня окрема сторінка) ---- */}
      <h2 className="mb-2 text-xl font-semibold text-leaf-900">{dict.payment.title}</h2>
      <p className="mb-1 text-lg font-medium italic text-leaf-800">«{dict.payment.slogan}»</p>
      <p className="mb-6 text-sm text-leaf-900/60">{dict.payment.explanation}</p>

      <div className="mb-8 rounded-2xl border border-orange-300 bg-orange-50 p-4 text-sm text-orange-800">
        Тільки безготівковий розрахунок. Готівкова оплата та оплата карткою онлайн на цьому етапі не приймаються.
      </div>

      <h3 className="mb-3 font-semibold text-leaf-900">{dict.payment.processTitle}</h3>
      <ol className="mb-8 flex flex-col gap-2">
        {steps.map((step, i) => (
          <li key={i} className="flex items-center gap-3 text-sm text-leaf-900/80">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-sun-500 text-xs font-bold text-leaf-900">
              {i + 1}
            </span>
            {step}
          </li>
        ))}
      </ol>

      <h3 className="mb-3 font-semibold text-leaf-900">{dict.payment.detailsTitle}</h3>
      <dl className="mb-10 grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 rounded-2xl border border-leaf-800/10 p-5 text-sm">
        {PAYMENT_DETAILS.map((row) => (
          <Fragment key={row.label}>
            <dt className="text-leaf-900/50">{row.label}</dt>
            <dd className="font-medium text-leaf-900">{row.value}</dd>
          </Fragment>
        ))}
      </dl>

      {/* ---- Форма ---- */}
      <div className="rounded-2xl border border-leaf-800/10 p-6">
        <h2 className="mb-4 text-lg font-semibold text-leaf-900">{dict.contacts.formTitle}</h2>
        <LeadForm dict={dict} />
      </div>
    </div>
  );
}
