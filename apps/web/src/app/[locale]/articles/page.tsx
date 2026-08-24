import Link from 'next/link';
import { notFound } from 'next/navigation';
import { isLocale, type Locale } from '../../../lib/i18n';
import { getDictionary } from '../../../lib/get-dictionary';
import { apiGet } from '../../../lib/api';

// ⚠️ РЕАЛЬНА ПРИЧИНА "новостей так и нет" (знайдено прямим прогоном
// npm run build, не здогадкою) — попри `revalidate: 0` на самому fetch
// нижче, Next.js App Router все одно СТАТИЧНО ПРЕРЕНДЕРИВ цю сторінку
// НА ЕТАПІ ЗБІРКИ Docker-образу (build output показував `●` SSG, не
// `ƒ` Dynamic) — HTML "запікається" ОДИН раз під час `docker build`
// (коли в базі майже напевно 0 опублікованих статей — публікація
// відбувається ПІЗНІШЕ, вже в адмінці працюючого контейнера) і віддається
// назавжди замороженим, СКІЛЬКИ Б новин відтоді не опублікували —
// жодне очікування кешу це ніколи не виправило б, це не time-based
// проблема взагалі. `export const dynamic = 'force-dynamic'` —
// примусово вимикає статичну оптимізацію для цієї сторінки, кожен
// запит рендериться на сервері наживо.
export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface ArticleListItem {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  article: { coverImage: string | null; publishedAt: string | null };
}

export default async function ArticlesPage({ params }: { params: { locale: string } }) {
  if (!isLocale(params.locale)) notFound();
  const locale = params.locale as Locale;
  const dict = getDictionary(locale);

  // За прямим запитом користувача ("новостей так и нет - чини") —
  // прибрано revalidate (публікація статей — рідкісна подія, ціна
  // зайвого запиту нехтовно мала, натомість ISR-кеш був ПОТЕНЦІЙНОЮ
  // причиною плутанини, навіть якщо не єдиною — прибрано як змінну
  // повністю, не залишено сумнівів). Помилку більше НЕ ковтаємо мовчки
  // — `apiGet` кидає виняток на будь-яку не-200 відповідь API
  // (`!res.ok`), а попередній `.catch(() => [])` РІЗНИЦІ між "реально
  // немає статей" і "запит до API впав з помилкою" не показував
  // взагалі — обидва виглядали однаково як порожній список. Тепер
  // помилка потрапляє в лог `docker-compose logs web` (console.error),
  // видима для діагностики, і все одно НЕ ламає сторінку для
  // відвідувача (список просто порожній, як і раніше).
  const articles = await apiGet<ArticleListItem[]>(`/articles?locale=${locale}`, 0).catch((err) => {
    console.error('[ArticlesPage] Failed to fetch articles:', err);
    return [] as ArticleListItem[];
  });

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="mb-8 text-2xl font-semibold text-leaf-900">{dict.articles.title}</h1>
      {articles.length === 0 ? (
        <p className="text-leaf-900/50">{dict.articles.noArticles}</p>
      ) : (
        <div className="flex flex-col gap-4">
          {articles.map((a) => (
            <Link
              key={a.id}
              href={`/${locale}/articles/${a.slug}`}
              className="flex gap-4 overflow-hidden rounded-xl border border-leaf-800/10 hover:shadow"
            >
              {/* За прямим запитом користувача ("сделай мягкий фоллбек
                  - если нет блоба обходится url картинки") — coverImage
                  ТЕПЕР може бути з БУДЬ-ЯКОГО домену RSS-джерела
                  (pv-magazine.com тощо), не гарантовано Vercel Blob —
                  раніше тут навмисно був next/image саме тому, що
                  домен був контрольованим, тепер ця умова більше не
                  виконується. Звичайний <img>, як і для картинок
                  постачальників/банків (той самий принцип: джерела
                  непередбачувані, суворий remotePatterns allowlist
                  next/image тут не підходить). */}
              {a.article.coverImage ? (
                <div className="relative h-28 w-40 shrink-0 bg-leaf-50">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={a.article.coverImage} alt={a.title} className="h-full w-full object-cover" loading="lazy" />
                </div>
              ) : (
                <div className="flex h-28 w-40 shrink-0 items-center justify-center bg-leaf-50 text-xs text-leaf-900/30">
                  немає фото
                </div>
              )}
              <div className="flex-1 py-5 pr-5">
                <h2 className="mb-1 font-semibold text-leaf-900">{a.title}</h2>
                <p className="text-sm text-leaf-900/60">{a.excerpt}</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
