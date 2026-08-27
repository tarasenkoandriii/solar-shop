import { Fragment } from 'react';
import { notFound } from 'next/navigation';
import { isLocale, type Locale } from '../../../lib/i18n';
import { getDictionary } from '../../../lib/get-dictionary';

import { COMPANY } from '../../../lib/company';

// Реквізити більше не плейсхолдери — див. lib/company.ts.
const PAYMENT_PURPOSE = 'Оплата за товар згідно рахунку №___';

// Рядки таблиці збираються так, щоб порожні реквізити просто не
// потрапляли у видачу. Раніше сторінка показувала покупцю "[IBAN]" і
// "[Назва банку]" — це гірше за відсутність рядка: виглядає як зламана
// сторінка й підриває довіру рівно в той момент, коли людина зібралася
// платити.
const DETAILS: { label: string; value: string }[] = [
  { label: 'Отримувач', value: COMPANY.legalName },
  { label: 'ЄДРПОУ', value: COMPANY.edrpou },
  { label: 'Юридична адреса', value: COMPANY.address },
  { label: 'IBAN', value: COMPANY.iban },
  { label: 'Банк', value: COMPANY.bank },
  { label: 'Телефон', value: COMPANY.phone },
  { label: 'E-mail', value: COMPANY.email },
  { label: 'Призначення платежу', value: PAYMENT_PURPOSE },
].filter((row) => row.value.length > 0);

export default function PaymentPage({ params }: { params: { locale: string } }) {
  if (!isLocale(params.locale)) notFound();
  const locale = params.locale as Locale;
  const dict = getDictionary(locale);

  const steps = [dict.payment.process1, dict.payment.process2, dict.payment.process3, dict.payment.process4, dict.payment.process5];

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="mb-2 text-2xl font-semibold text-leaf-900">{dict.payment.title}</h1>
      <p className="mb-1 text-lg font-medium italic text-leaf-800">«{dict.payment.slogan}»</p>
      <p className="mb-8 text-sm text-leaf-900/60">{dict.payment.explanation}</p>

      <div className="mb-8 rounded-2xl border border-orange-300 bg-orange-50 p-4 text-sm text-orange-800">
        Тільки безготівковий розрахунок. Готівкова оплата та оплата карткою онлайн на цьому етапі не приймаються.
      </div>

      <h2 className="mb-3 font-semibold text-leaf-900">{dict.payment.processTitle}</h2>
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

      <h2 className="mb-3 font-semibold text-leaf-900">{dict.payment.detailsTitle}</h2>
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 rounded-2xl border border-leaf-800/10 p-5 text-sm">
        {DETAILS.map((row) => (
          <Fragment key={row.label}>
            <dt className="text-leaf-900/50">{row.label}</dt>
            <dd className="font-medium text-leaf-900">{row.value}</dd>
          </Fragment>
        ))}
      </dl>
    </div>
  );
}
