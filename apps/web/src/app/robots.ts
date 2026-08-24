import type { MetadataRoute } from 'next';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://solarshop.ua';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: '*', allow: '/' },
    // Два окремі sitemap: звичайний (усі сторінки/товари/статті назавжди)
    // + окремий News sitemap (тільки статті за останні 48 годин,
    // офіційна вимога Google News — не можна змішувати в один файл).
    sitemap: [`${SITE_URL}/sitemap.xml`, `${SITE_URL}/news-sitemap.xml`],
  };
}
