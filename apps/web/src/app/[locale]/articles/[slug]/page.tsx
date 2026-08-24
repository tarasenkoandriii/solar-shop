import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { isLocale, type Locale } from '../../../../lib/i18n';
import { apiGet } from '../../../../lib/api';
import { safeJsonLdStringify } from '../../../../lib/safe-json-ld';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://solarshop.ua';

interface ArticleTranslation {
  id: string;
  title: string;
  excerpt: string;
  content: string;
  article: { coverImage: string | null; publishedAt: string | null; tags: string[]; sourceUrl: string | null; sourceSite: string | null };
}

async function getArticle(locale: string, slug: string) {
  try {
    return await apiGet<ArticleTranslation>(`/articles/${slug}?locale=${locale}`, 300);
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: { locale: string; slug: string };
}): Promise<Metadata> {
  const article = await getArticle(params.locale, params.slug);
  if (!article) return {};
  return {
    title: article.title,
    description: article.excerpt,
    openGraph: {
      title: article.title,
      description: article.excerpt,
      images: article.article.coverImage ? [article.article.coverImage] : undefined,
    },
  };
}

export default async function ArticlePage({ params }: { params: { locale: string; slug: string } }) {
  if (!isLocale(params.locale)) notFound();
  const locale = params.locale as Locale;

  const article = await getArticle(locale, params.slug);
  if (!article) notFound();

  // NewsArticle JSON-LD (schema.org) — разом з /news-sitemap.xml
  // допомагає індексації в Google News (потребує publishedAt і headline;
  // якщо publishedAt ще не проставлений (стаття щойно створена, до
  // модерації/публікації) — просто не рендеримо блок, а не вигадуємо
  // дату). safeJsonLdStringify — те саме екранування, що вже
  // застосоване в товарах (AUDIT-FULL.md), той самий ризик передчасного
  // закриття </script>.
  const newsArticleJsonLd = article.article.publishedAt
    ? {
        '@context': 'https://schema.org',
        '@type': 'NewsArticle',
        headline: article.title,
        description: article.excerpt,
        image: article.article.coverImage ? [article.article.coverImage] : undefined,
        datePublished: article.article.publishedAt,
        publisher: { '@type': 'Organization', name: 'Solar Shop', url: SITE_URL },
        mainEntityOfPage: `${SITE_URL}/${locale}/articles/${params.slug}`,
      }
    : null;

  return (
    <article className="mx-auto max-w-2xl px-4 py-10">
      {newsArticleJsonLd && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLdStringify(newsArticleJsonLd) }} />
      )}
      {/* За прямим запитом користувача ("сделай мягкий фоллбек - если
          нет блоба обходится url картинки") — той самий перехід на
          звичайний <img>, що й на сторінці списку (coverImage тепер
          може бути з будь-якого домену RSS-джерела, не гарантовано
          Vercel Blob). openGraph.images/JSON-LD image вище НЕ
          зачіпаються — вони просто вставляють URL як текст у метадані,
          не проходять через конвеєр оптимізації next/image взагалі. */}
      {article.article.coverImage && (
        <div className="relative mb-6 aspect-video overflow-hidden rounded-2xl bg-leaf-50">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={article.article.coverImage} alt={article.title} className="h-full w-full object-cover" />
        </div>
      )}
      <h1 className="mb-4 text-2xl font-semibold text-leaf-900">{article.title}</h1>
      {/* За прямим запитом користувача — "еще бы дату публикации и
          ссылку на источник". locale з date форматуванням, не жорстко
          'uk-UA' — узгоджено з рештою сайту (напр. відгуки про банки),
          де форматування теж прив'язане до поточної локалі, не завжди
          українське незалежно від мови сторінки. */}
      <div className="mb-6 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-leaf-900/40">
        {article.article.publishedAt && (
          <span>{new Date(article.article.publishedAt).toLocaleDateString(locale === 'uk' ? 'uk-UA' : locale === 'ru' ? 'ru-RU' : 'en-US')}</span>
        )}
        {article.article.sourceUrl && (
          <a href={article.article.sourceUrl} target="_blank" rel="noopener noreferrer" className="underline hover:text-leaf-900/70">
            {locale === 'uk' ? 'Джерело' : locale === 'ru' ? 'Источник' : 'Source'}
            {article.article.sourceSite ? `: ${article.article.sourceSite}` : ''}
          </a>
        )}
      </div>
      <div className="prose prose-leaf max-w-none whitespace-pre-line text-leaf-900/80">{article.content}</div>
    </article>
  );
}
