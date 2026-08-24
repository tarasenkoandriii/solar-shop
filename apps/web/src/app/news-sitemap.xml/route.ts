import { locales } from '../../lib/i18n';
import { apiGet } from '../../lib/api';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://solarshop.ua';

// Google News вимагає окремий sitemap (не звичайний sitemap.xml) з
// news:namespace, і, критично, ТІЛЬКИ статті, опубліковані за останні 48
// годин (офіційна вимога Google News — старіші статті НЕ повинні
// лишатися в цьому файлі, інакше Google може розцінити це як
// невідповідність протоколу). Звичайний sitemap.ts (усі статті/товари
// назавжди) — окремий, для загальної індексації, цей — спеціально для
// News.
const PUBLICATION_NAMES: Record<string, string> = {
  uk: 'Solar Shop',
  ru: 'Solar Shop',
  en: 'Solar Shop',
};

interface ArticleTranslationForSitemap {
  locale: string;
  slug: string;
  title: string;
  article: { publishedAt: string | null; createdAt: string };
}

export async function GET() {
  const FORTY_EIGHT_HOURS_MS = 48 * 60 * 60 * 1000;
  const cutoff = Date.now() - FORTY_EIGHT_HOURS_MS;

  const urls: string[] = [];

  for (const locale of locales) {
    try {
      const translations = await apiGet<ArticleTranslationForSitemap[]>(`/articles?locale=${locale}`, 300);
      for (const t of translations) {
        const publishedAtRaw = t.article.publishedAt ?? t.article.createdAt;
        const publishedAt = new Date(publishedAtRaw);
        if (publishedAt.getTime() < cutoff) continue; // старше 48 годин — не в News sitemap

        const loc = `${SITE_URL}/${locale}/articles/${t.slug}`;
        const escapedTitle = escapeXml(t.title);
        urls.push(`  <url>
    <loc>${loc}</loc>
    <news:news>
      <news:publication>
        <news:name>${escapeXml(PUBLICATION_NAMES[locale] ?? 'Solar Shop')}</news:name>
        <news:language>${locale}</news:language>
      </news:publication>
      <news:publication_date>${publishedAt.toISOString()}</news:publication_date>
      <news:title>${escapedTitle}</news:title>
    </news:news>
  </url>`);
      }
    } catch {
      // Один локаль впав (напр. апі тимчасово недоступний) — не валимо
      // весь sitemap через це, просто пропускаємо цю локаль на цей раз.
      continue;
    }
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">
${urls.join('\n')}
</urlset>`;

  return new Response(xml, {
    headers: { 'Content-Type': 'application/xml; charset=UTF-8' },
  });
}

function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
