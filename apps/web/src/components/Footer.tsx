import Link from 'next/link';
import type { Locale } from '../lib/i18n';
import { getDictionary } from '../lib/get-dictionary';

export function Footer({ locale }: { locale: Locale }) {
  const dict = getDictionary(locale);
  return (
    <footer className="bg-leaf-900 text-white/70">
      <div className="mx-auto max-w-6xl px-4 py-8 text-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <p>&copy; {new Date().getFullYear()} Solar Shop. {dict.footer.rights}.</p>
          <div className="flex gap-4">
            <Link href={`/${locale}/privacy`} className="hover:text-white">
              {dict.footer.privacy}
            </Link>
            <Link href={`/${locale}/offer`} className="hover:text-white">
              {dict.footer.offer}
            </Link>
            <Link href={`/${locale}/contacts`} className="hover:text-white">
              {dict.nav.contacts}
            </Link>
          </div>
        </div>
        <p className="mt-3 text-xs text-white/40">
          ФОП, реквізити — заповнюються перед запуском.
        </p>
      </div>
    </footer>
  );
}
