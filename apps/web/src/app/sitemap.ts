import type { MetadataRoute } from 'next';
import { locales } from '../lib/i18n';
import { apiGet } from '../lib/api';
import type { Product } from '../lib/api';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://solarshop.ua';

const STATIC_PATHS = ['', '/solar-panels', '/batteries', '/controllers', '/contacts', '/payment', '/articles'];

// Динамическая sitemap (ТЗ п.15) — статические страницы + все опубликованные
// товары и статьи. /cart, /checkout, /account — персонализированные,
// намеренно не в sitemap (аналогично /calculator/[estimateId] из ТЗ п.3.6).
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries: MetadataRoute.Sitemap = [];

  for (const locale of locales) {
    for (const path of STATIC_PATHS) {
      entries.push({
        url: `${SITE_URL}/${locale}${path}`,
        changeFrequency: 'daily',
        priority: path === '' ? 1 : 0.7,
      });
    }
  }

  try {
    const { items } = await apiGet<{ items: Product[] }>('/products?pageSize=1000', 3600);
    for (const locale of locales) {
      for (const product of items) {
        entries.push({
          url: `${SITE_URL}/${locale}/products/${product.slug}`,
          changeFrequency: 'weekly',
          priority: 0.6,
        });
      }
    }
  } catch {
    // API недоступен на этапе сборки — sitemap просто без товаров в этом прогоне
  }

  // Знайдено 18.08.2026: раніше `/articles` викликався БЕЗ query-параметра
  // `locale` — контроллер за замовчуванням віддає лише 'uk'
  // (`findPublished(@Query('locale') locale = 'uk')`), і той самий
  // україномовний список статей (з їхніми УКРАЇНСЬКИМИ slug'ами)
  // переюзувався для ВСІХ трьох локалей у циклі нижче. Кожна локаль має
  // власний `ArticleTranslation.slug` (окреме поле, не збігається з
  // українським між мовами — Grok генерує заголовок/slug окремо для
  // кожної мови) — тому `/ru/articles/{український-slug}` і
  // `/en/articles/{український-slug}` в sitemap вказували на URL, які
  // фізично не існують (404 при переході з пошукової видачі). Виправлено
  // — окремий запит на кожну локаль, той самий підхід, що вже
  // правильно застосований у news-sitemap.xml/route.ts.
  try {
    for (const locale of locales) {
      const translations = await apiGet<{ slug: string }[]>(`/articles?locale=${locale}`, 3600);
      for (const t of translations) {
        entries.push({ url: `${SITE_URL}/${locale}/articles/${t.slug}`, changeFrequency: 'monthly', priority: 0.5 });
      }
    }
  } catch {
    // API недоступен на этапе сборки — sitemap просто без статей в этом прогоне
  }

  return entries;
}
