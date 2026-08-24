import { notFound } from 'next/navigation';
import { isLocale, type Locale } from '../../../lib/i18n';
import { getDictionary } from '../../../lib/get-dictionary';
import { apiGet } from '../../../lib/api';
import type { Office } from '../../../lib/api';
import { LeadForm } from '../../../components/LeadForm';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function ContactsPage({ params }: { params: { locale: string } }) {
  if (!isLocale(params.locale)) notFound();
  const locale = params.locale as Locale;
  const dict = getDictionary(locale);

  const offices = await apiGet<Office[]>('/offices', 3600).catch(() => [] as Office[]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="mb-8 text-2xl font-semibold text-leaf-900">{dict.contacts.title}</h1>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {offices.map((office) => (
          <div key={office.id} className="rounded-2xl border border-leaf-800/10 p-5">
            <h2 className="font-semibold text-leaf-900">{office.city}</h2>
            <p className="mt-2 text-sm text-leaf-900/70">{office.address}</p>
            <p className="mt-1 text-sm text-leaf-900/70">{office.phone}</p>
            <p className="mt-1 text-sm text-leaf-900/70">{office.email}</p>
            <p className="mt-1 text-sm text-leaf-900/50">{office.workHours}</p>
            {office.lat && office.lng && (
              <a
                href={`https://www.google.com/maps?q=${office.lat},${office.lng}`}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-block text-sm font-medium text-leaf-700 underline"
              >
                Google Maps →
              </a>
            )}
          </div>
        ))}
      </div>

      <div className="mt-12 max-w-md rounded-2xl border border-leaf-800/10 p-6">
        <h2 className="mb-4 text-lg font-semibold text-leaf-900">{dict.contacts.formTitle}</h2>
        <LeadForm dict={dict} />
      </div>
    </div>
  );
}
