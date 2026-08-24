import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { GrokService } from '../grok/grok.service';
import { GrokBatchService } from '../grok/grok-batch.service';
import { fetchWithRetry } from '../common/fetch-with-retry';
import { fetchOgImage } from '../common/og-image-fetcher';
import { parseRssItems, isRelevantToSolarEnergy, resetImageDiagnosticsForNewRun } from './rss.util';
import { UpdateArticleDto, UpdateTranslationDto } from './dto/article.dto';

const TARGET_LOCALES = ['uk', 'ru', 'en'];
// Знайдено 18.08.2026 на реальному прогоні: xAI повернув живу помилку
// "Model grok-4-fast is not supported for batch processing" (400,
// Client specified an invalid argument) — офіційна документація Batch
// API навіть у СВОЇХ прикладах коду послідовно використовує "grok-4.3"
// для батч-запитів (docs.x.ai/developers/advanced-api-usage/batch-api,
// перевірено через web_search+web_fetch, не здогад). Формулювання
// помилки — "not supported for BATCH processing" (не "model not found")
// — тобто grok-4-fast лишається валідним для звичайних синхронних
// викликів (GrokService.chatJson і далі використовує його без змін), це
// стосується виключно списку моделей, дозволених саме для Batch API.
const GROK_BATCH_MODEL = 'grok-4.3';

// Скільки НОВИХ статей (не вже існуючих) обробляти за один запуск
// runParser() — не обмеження продуктивності, як було раніше (Batch API не
// має такого ризику таймауту, бо не чекає відповідь синхронно), а просто
// розумна верхня межа розміру однієї пачки за один прогін крону.
const MAX_NEW_ARTICLES_PER_RUN = 20;

interface RssSource {
  siteName: string;
  feedUrl: string;
  // Знайдено 18.08.2026: ukrinform.net/rss повертав 404 (мертвий URL,
  // ніколи не перевірявся живим запитом — чесно зазначено в
  // попередньому коментарі). Замінено на 3 реально перевірені (через
  // web_fetch, живий запит, не здогад) профільні видання про
  // сонячну/відновлювану енергетику. skipRelevanceFilter: true — бо
  // TOPIC_KEYWORDS у rss.util.ts складається виключно з українських слів
  // ("сонячн", "акумулятор" тощо) — застосування цього фільтра до
  // англомовних профільних видань відфільтрувало б УСЕ підряд (жодна
  // англійська стаття ніколи не містить українських ключових слів), а
  // сенсу у фільтрації тут і немає — це вже вузькотематичні видання про
  // саме той предмет, не загальні СМІ на кшталт колишнього ukrinform.
  skipRelevanceFilter?: boolean;
  // Знайдено разом з попереднім: article.create() нижче раніше жорстко
  // писав originalLocale: 'uk' — коректно для колишнього ukrinform.net,
  // але хибно для нових англомовних джерел (Grok при рерайті/перекладі
  // повинен знати, що вихідний текст англійською, не українською).
  sourceLocale: string;
}

// ТЗ п.14.3 — перевірені живим запитом (web_fetch, 18.08.2026) джерела:
// pv-magazine.com і energy-storage.news — профільні трейд-видання про
// сонячну енергетику/накопичувачі відповідно (кілька публікацій на день
// кожне — реалістично дає задекларовані "хоча б 3 статті на день" з
// запасом навіть з одного джерела), renewableenergyworld.com — ширше
// (відновлювана енергетика загалом, не тільки сонячна) — тому для НЬОГО
// фільтр релевантності залишений увімкненим (не всі new hydro/wind
// статті доречні для магазину сонячних панелей).
const RSS_SOURCES: RssSource[] = [
  { siteName: 'pv-magazine.com', feedUrl: 'https://www.pv-magazine.com/feed/', skipRelevanceFilter: true, sourceLocale: 'en' },
  { siteName: 'energy-storage.news', feedUrl: 'https://www.energy-storage.news/feed/', skipRelevanceFilter: true, sourceLocale: 'en' },
  { siteName: 'renewableenergyworld.com', feedUrl: 'https://www.renewableenergyworld.com/feed/', sourceLocale: 'en' },
];

// За прямим запитом користувача (скоринг статей) — kind розрізняє
// звичайний per-locale переклад від окремого, один-раз-на-статтю
// batch-запиту на скоринг. locale лишається порожнім рядком для
// kind='score' (не використовується там), не робимо тип optional —
// простіше й безпечніше для решти коду, що деструктурує ctx.locale.
interface BatchRequestContext {
  articleId: string;
  locale: string;
  kind: 'translation' | 'score';
}

@Injectable()
export class ArticlesService {
  private readonly logger = new Logger(ArticlesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly grok: GrokService,
    private readonly grokBatch: GrokBatchService,
    private readonly config: ConfigService,
  ) {}

  // За прямим запитом користувача — м'який фолбек, якщо BLOB_READ_WRITE_
  // TOKEN не прописаний або сам Vercel Blob недоступний (мережева
  // помилка/non-200): просто попередження в лог, coverImage лишається
  // null, і — найголовніше — це НІКОЛИ не блокує основний потік (пошук
  // статей + подача пачки перекладів все одно триває). Той самий
  // принцип "текст важливіший за картинку", що прямо сформульований у
  // запиті користувача. Патерн uploadToBlob сам по собі — той самий, що
  // вже є в InvoiceService, тут — своя копія з іншим м'яким фолбеком
  // (там — data: URL, тут — просто null, картинка для статті не
  // критична для функціональності, на відміну від рахунку-фактури).
  // За прямим запитом користувача — "если нет блоба обходится url
  // картинки (теперь мы его сохраняем)". Раніше кожен `return null`
  // тут означав "обкладинки взагалі немає" — тепер, коли
  // `sourceImageUrl` (розділ README про backfill) зберігається
  // окремо й гарантовано, можна безпечно віддати ORIGINAL URL
  // джерела напряму (hotlink) замість повної відсутності картинки.
  // М'який фолбек — не "все або нічого", а "найкраще з можливого":
  // Blob недоступний → пряме посилання на джерело; саме джерело
  // недоступне (мережева помилка) → взагалі null (тут дійсно нічого не
  // вдіяти).
  private async downloadAndUploadCoverImage(imageUrl: string, articleSlug: string): Promise<string | null> {
    const blobToken = this.config.get<string>('BLOB_READ_WRITE_TOKEN');
    if (!blobToken) {
      this.logger.warn(`BLOB_READ_WRITE_TOKEN не налаштований — обкладинка для "${articleSlug}" використає пряме посилання на джерело (${imageUrl}), без завантаження на Blob.`);
      return imageUrl;
    }

    try {
      const imageRes = await fetchWithRetry(imageUrl, { retries: 1, timeoutMs: 10_000 });
      if (!imageRes.ok) {
        this.logger.warn(`Не вдалося завантажити обкладинку для "${articleSlug}" (${imageUrl}): HTTP ${imageRes.status} — використовую пряме посилання на джерело замість Blob.`);
        return imageUrl;
      }
      const contentType = imageRes.headers.get('content-type') ?? 'image/jpeg';
      const buffer = Buffer.from(await imageRes.arrayBuffer());
      const ext = contentType.includes('png') ? 'png' : contentType.includes('webp') ? 'webp' : 'jpg';

      const uploadRes = await fetch(`https://blob.vercel-storage.com/articles/${articleSlug}.${ext}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${blobToken}`, 'Content-Type': contentType },
        body: new Uint8Array(buffer),
      });
      if (!uploadRes.ok) {
        this.logger.warn(`Vercel Blob повернув помилку при завантаженні обкладинки для "${articleSlug}": HTTP ${uploadRes.status} — використовую пряме посилання на джерело замість Blob.`);
        return imageUrl;
      }
      const data = (await uploadRes.json()) as { url: string };
      return data.url;
    } catch (err) {
      // Мережева помилка/таймаут при завантаженні джерела АБО при
      // з'єднанні з Vercel Blob — обидва випадки трактуються однаково
      // м'яко (не розрізняємо навмисно, наслідок для виклику той самий):
      // повертаємо пряме посилання на джерело — воно вже підтверджено
      // існуючим (це URL, який реально прийшов із RSS-фіда), навіть
      // якщо САМЕ ЗАВАНТАЖЕННЯ зараз не вдалося з мережевих причин,
      // сам URL з високою ймовірністю робочий для браузера користувача
      // (інша мережа, інший маршрут).
      this.logger.warn(`Обкладинка для "${articleSlug}" не завантажилась на Blob (${err instanceof Error ? err.message : String(err)}) — використовую пряме посилання на джерело.`);
      return imageUrl;
    }
  }

  findPublished(locale: string) {
    return this.prisma.client.articleTranslation.findMany({
      where: { locale, status: 'PUBLISHED' },
      include: { article: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findBySlug(locale: string, slug: string) {
    const translation = await this.prisma.client.articleTranslation.findUnique({
      where: { locale_slug: { locale, slug } },
      include: { article: true },
    });
    if (!translation || translation.status !== 'PUBLISHED') throw new NotFoundException('Article not found');
    return translation;
  }

  // За прямим запитом користувача — "добавить... сортировку по нему".
  // sortBy='score' — за спаданням оцінки (null в кінці, PostgreSQL
  // сам ставить NULL останніми при DESC за замовчуванням); дефолт
  // лишається за датою створення, як і раніше — не змінює наявну
  // поведінку без явного запиту.
  // За прямим запитом користувача — "добавить такой же фильтр для
  // новостей" (як на /admin/financing-programs)
  findAllForAdmin(sortBy: 'createdAt' | 'score' = 'createdAt', status?: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED') {
    return this.prisma.client.article.findMany({
      where: status ? { status } : undefined,
      include: { translations: true },
      orderBy: sortBy === 'score' ? { score: 'desc' } : { createdAt: 'desc' },
    });
  }

  // За прямим запитом користувача — "також підтягати фото для
  // попередніх статей в разі відсутності фото". НЕЗАЛЕЖНИЙ від
  // повторного RSS-парсингу механізм — ретраїть завантаження на Vercel
  // Blob по вже збереженому sourceImageUrl (розділ вище — тепер
  // зберігається завжди, навіть якщо перше завантаження провалилось).
  // Особливо корисно, якщо BLOB_READ_WRITE_TOKEN був відсутній на
  // момент першого парсингу, а тепер налаштований — не чекає, поки
  // стаття знову зустрінеться в RSS-фіді (може вже випасти зі свіжих
  // записів), просто пробує ще раз по вже відомому URL.
  async backfillMissingCoverImages(): Promise<{ attempted: number; succeeded: number; stillMissing: number }> {
    const candidates = await this.prisma.client.article.findMany({
      where: { coverImage: null, sourceImageUrl: { not: null } },
    });

    let succeeded = 0;
    for (const article of candidates) {
      if (!article.sourceImageUrl) continue; // TS-guard, where вже це гарантує
      const coverImage = await this.downloadAndUploadCoverImage(article.sourceImageUrl, article.slug);
      if (coverImage) {
        await this.prisma.client.article.update({ where: { id: article.id }, data: { coverImage } });
        succeeded++;
      }
    }

    console.log(`[ArticlesService] backfillMissingCoverImages: спроб ${candidates.length}, успішно ${succeeded}, досі без фото ${candidates.length - succeeded}.`);
    return { attempted: candidates.length, succeeded, stillMissing: candidates.length - succeeded };
  }

  updateArticle(id: string, dto: UpdateArticleDto) {
    return this.prisma.client.article.update({ where: { id }, data: dto });
  }

  // За прямим запитом користувача (розділ README про виправлення
  // промпту локалізації) — жодного способу видалити статтю раніше не
  // існувало взагалі. Потрібно, щоб адмін міг прибрати статті зі
  // старими (до фіксу промпту) неякісними перекладами й запустити
  // "1. Знайти нові статті" знову — ArticleTranslation НЕ має
  // onDelete: Cascade в схемі, тому видаляємо переклади явно ПЕРЕД
  // самою статтею (інакше — помилка зовнішнього ключа), в транзакції.
  async deleteArticle(id: string): Promise<void> {
    await this.prisma.client.$transaction([
      this.prisma.client.articleTranslation.deleteMany({ where: { articleId: id } }),
      this.prisma.client.article.delete({ where: { id } }),
    ]);
  }

  // За прямим запитом користувача ("еще бы дату публикации") — знайдено
  // реальний пробіл: `Article.publishedAt` НІКОЛИ не проставлявся при
  // публікації перекладу, лишався `null` назавжди. Це й пояснювало, чому
  // NewsArticle JSON-LD (для Google News) ніколи не рендерився — блок
  // явно вимагає publishedAt. Тепер: якщо переклад переходить у
  // PUBLISHED, а батьківська Article ще не має publishedAt — проставляємо
  // при ПЕРШІЙ публікації (будь-якою локаллю), не перезаписуємо при
  // наступних.
  // За прямим запитом користувача ("добавить такой же фильтр для
  // новостей... сейчас остается после публикации в списке на
  // модерацию") — знайдено реальну причину: `Article.status`
  // НІКОЛИ не оновлювався при публікації перекладу, лишався `DRAFT`
  // НАЗАВЖДИ (оновлювався лише `publishedAt`). Тепер — після кожної
  // зміни статусу перекладу перераховуємо `Article.status`: якщо ВСІ
  // переклади статті `PUBLISHED` → стаття `PUBLISHED`; інакше (хоча б
  // один ще `DRAFT`) → стаття `DRAFT`. `ARCHIVED` НЕ перезаписується
  // цим перерахунком — це ручна дія на рівні статті цілком (як і
  // ARCHIVED у financing-programs), не похідна від статусів перекладів.
  async updateTranslation(id: string, dto: UpdateTranslationDto) {
    const updated = await this.prisma.client.articleTranslation.update({ where: { id }, data: dto });

    const article = await this.prisma.client.article.findUnique({
      where: { id: updated.articleId },
      include: { translations: true },
    });

    if (article && article.status !== 'ARCHIVED') {
      const allPublished = article.translations.length > 0 && article.translations.every((t) => t.status === 'PUBLISHED');
      const newStatus = allPublished ? 'PUBLISHED' : 'DRAFT';
      const updateData: { status: typeof newStatus; publishedAt?: Date } = { status: newStatus };
      if (dto.status === 'PUBLISHED' && !article.publishedAt) {
        updateData.publishedAt = new Date();
      }
      if (newStatus !== article.status || updateData.publishedAt) {
        await this.prisma.client.article.update({ where: { id: article.id }, data: updateData });
      }
    }

    return updated;
  }

  // За прямим запитом користувача ("используй grok batch job с ожиданием
  // для экономии средств") — цей метод БІЛЬШЕ НЕ чекає відповідь Grok
  // синхронно. Він лише знаходить нові статті в RSS-фідах, створює
  // Article-рядки (DRAFT, без перекладів) і ПОДАЄ ОДНУ пачку запитів
  // (рерайт+переклад на кожну локаль для кожної нової статті) до xAI
  // Batch API — сам виклик повертається одразу, реальний рерайт
  // відбувається асинхронно на боці xAI (типово до 24 годин) і
  // забирається окремим кроком — processPendingBatches(), який
  // викликається за розписом (новий крон-джоб article_batch_poll).
  //
  // Це не тільки економить кошти (Batch API дешевший на 20-50% за
  // синхронні виклики), а й прибирає ризик таймауту всередині одного
  // HTTP-запиту (розділ README про AbortError/MAX_NEW_ARTICLES_PER_RUN,
  // знайдений на реальному прогоні) — подача пачки сама по собі швидка
  // (два HTTP-запити до xAI: створити + додати), решта не блокує відповідь.
  // За прямим запитом користувача — знайдено на реальному прогоні:
  // частина RSS-записів (напр. pv-magazine.com) ГЕНУЇННО не несе тег
  // картинки взагалі (content:encoded присутній, але без <img>
  // всередині — підтверджено діагностикою rss.util.ts, не здогад).
  // Fallback — той самий og:image-fetch, що вже перевірений на
  // реальному прогоні для financing.service.ts, тепер спільний модуль
  // (apps/api/src/common/og-image-fetcher.ts). Пробуємо ЛИШЕ якщо RSS
  // взагалі не дав imageUrl — не витрачаємо зайвий HTTP-запит, коли RSS
  // і так дав картинку.
  private async resolveImageUrl(rssImageUrl: string | undefined, articleLink: string, logContext: string): Promise<string | undefined> {
    if (rssImageUrl) return rssImageUrl;

    console.log(`[ArticlesService] RSS не дав картинку для "${logContext}" — пробую og:image зі сторінки статті (${articleLink})...`);
    const ogResult = await fetchOgImage(articleLink);
    if (ogResult.imageUrl) {
      console.log(`[ArticlesService] og:image fallback спрацював для "${logContext}": ${ogResult.imageUrl}`);
      return ogResult.imageUrl;
    }
    console.log(`[ArticlesService] og:image fallback теж не дав картинку для "${logContext}": ${ogResult.diagnostic}`);
    return undefined;
  }

  async runParser(): Promise<{
    found: number;
    created: number;
    batchSubmitted: boolean;
    xaiBatchId?: string;
    batchError?: string;
    sources: {
      siteName: string;
      feedUrl: string;
      fetchOk: boolean;
      httpStatus?: number;
      rawItemCount?: number;
      relevantItemCount?: number;
      error?: string;
    }[];
  }> {
    resetImageDiagnosticsForNewRun();
    let found = 0;
    let created = 0;
    const sources: {
      siteName: string;
      feedUrl: string;
      fetchOk: boolean;
      httpStatus?: number;
      rawItemCount?: number;
      relevantItemCount?: number;
      error?: string;
    }[] = [];

    // batch_request_id -> {articleId, locale} для подальшого зіставлення
    // результатів (GrokBatchJob.requestMap), і паралельно — сирі
    // messages-запити для самого виклику submitBatch().
    const requestMap: Record<string, BatchRequestContext> = {};
    const batchItems: { batchRequestId: string; model: string; messages: { role: string; content: string }[] }[] = [];

    for (const source of RSS_SOURCES) {
      if (created >= MAX_NEW_ARTICLES_PER_RUN) break;
      let items;
      try {
        const res = await fetchWithRetry(source.feedUrl, { retries: 2, timeoutMs: 15_000 });
        const xml = await res.text();
        const rawItems = parseRssItems(xml, source.siteName);
        items = source.skipRelevanceFilter ? rawItems : rawItems.filter(isRelevantToSolarEnergy);
        sources.push({
          siteName: source.siteName,
          feedUrl: source.feedUrl,
          fetchOk: true,
          httpStatus: res.status,
          rawItemCount: rawItems.length,
          relevantItemCount: items.length,
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        this.logger.error(`RSS fetch failed for ${source.siteName}`, err as Error);
        sources.push({ siteName: source.siteName, feedUrl: source.feedUrl, fetchOk: false, error: message });
        continue;
      }

      found += items.length;

      for (const item of items) {
        if (created >= MAX_NEW_ARTICLES_PER_RUN) break;

        const existing = await this.prisma.client.article.findFirst({ where: { sourceUrl: item.link } });
        if (existing) {
          // За прямим запитом користувача — "також підтягати фото для
          // попередніх статей в разі відсутності фото". Раніше `if
          // (existing) continue;` повністю пропускав статтю, що вже
          // існує — НІКОЛИ не оновлював coverImage, навіть якщо його
          // бракувало. Тепер — якщо картинки досі немає, а RSS цього
          // разу знову дав imageUrl (фід ще містить цю статтю), пробуємо
          // ще раз. Природний backfill без окремого спеціального
          // виклику — просто повторний запуск того самого крону.
          if (!existing.coverImage) {
            const imageUrl = await this.resolveImageUrl(item.imageUrl, item.link, existing.slug);
            if (imageUrl) {
              await this.prisma.client.article.update({ where: { id: existing.id }, data: { sourceImageUrl: imageUrl } });
              const coverImage = await this.downloadAndUploadCoverImage(imageUrl, existing.slug);
              if (coverImage) {
                await this.prisma.client.article.update({ where: { id: existing.id }, data: { coverImage } });
              }
            }
          }
          continue;
        }

        const slug = slugify(item.title);
        const article = await this.prisma.client.article.create({
          data: {
            slug,
            sourceUrl: item.link,
            sourceSite: source.siteName,
            originalLocale: source.sourceLocale,
            status: 'DRAFT',
            sourceImageUrl: item.imageUrl,
          },
        });
        created++;

        // Обкладинка — окремий, незалежний крок від рерайту/перекладу
        // (Batch API нижче). За прямим запитом користувача: перевірено,
        // м'який фолбек — жодна помилка тут (відсутній токен, недоступний
        // Blob, недоступне джерело картинки) не блокує основний потік.
        const resolvedImageUrl = await this.resolveImageUrl(item.imageUrl, item.link, slug);
        if (resolvedImageUrl) {
          // RSS сирий imageUrl уже збережено вище при create(); якщо ж
          // прийшло з og:image fallback (RSS не дав), sourceImageUrl
          // ще не збережений — оновлюємо окремо, той самий принцип
          // "зберігати завжди", що вже застосований для RSS-джерела.
          if (resolvedImageUrl !== item.imageUrl) {
            await this.prisma.client.article.update({ where: { id: article.id }, data: { sourceImageUrl: resolvedImageUrl } });
          }
          const coverImage = await this.downloadAndUploadCoverImage(resolvedImageUrl, slug);
          if (coverImage) {
            await this.prisma.client.article.update({ where: { id: article.id }, data: { coverImage } });
          }
        }

        for (const locale of TARGET_LOCALES) {
          const batchRequestId = `article_${article.id}_${locale}`;
          requestMap[batchRequestId] = { articleId: article.id, locale, kind: 'translation' };
          batchItems.push({
            batchRequestId,
            model: GROK_BATCH_MODEL,
            messages: [{ role: 'user', content: this.grok.buildArticleRewritePrompt(`${item.title}\n\n${item.description}`, locale) }],
          });
        }

        // За прямим запитом користувача — "добавить скоринг статьи".
        // ОДИН запит на статтю (не помножений на TARGET_LOCALES, як
        // переклад) — score оцінює контент, не залежить від мови
        // виводу, тому не потребує повторення тричі.
        const scoreBatchRequestId = `article_${article.id}_score`;
        requestMap[scoreBatchRequestId] = { articleId: article.id, locale: '', kind: 'score' };
        batchItems.push({
          batchRequestId: scoreBatchRequestId,
          model: GROK_BATCH_MODEL,
          messages: [{ role: 'user', content: this.grok.buildArticleScorePrompt(`${item.title}\n\n${item.description}`) }],
        });
      }
    }

    if (batchItems.length === 0) {
      console.log('[ArticlesService] Нових статей не знайдено — пачку не подаю.');
      return { found, created, batchSubmitted: false, sources };
    }

    console.log(`[ArticlesService] Знайдено ${created} нових статей (${batchItems.length} запитів рерайт+переклад) — подаю пачку до Grok Batch API...`);
    const submitResult = await this.grokBatch.submitBatch(`article-rewrite-${Date.now()}`, batchItems);

    if ('error' in submitResult) {
      console.log(`[ArticlesService] ⚠ Не вдалося подати пачку: ${submitResult.error}`);
      return { found, created, batchSubmitted: false, batchError: submitResult.error, sources };
    }

    await this.prisma.client.grokBatchJob.create({
      data: { xaiBatchId: submitResult.xaiBatchId, jobType: 'article-rewrite', requestMap: requestMap as never, status: 'pending' },
    });

    console.log(`[ArticlesService] Пачка ${submitResult.xaiBatchId} збережена (GrokBatchJob), очікую результатів за розкладом (крон-джоб article_batch_poll).`);
    return { found, created, batchSubmitted: true, xaiBatchId: submitResult.xaiBatchId, sources };
  }

  // Опитує всі незавершені GrokBatchJob (jobType='article-rewrite') —
  // викликається за розписом (крон-джоб article_batch_poll), не при
  // кожному запиті користувача. Той самий "trust num_pending, not
  // num_success === num_requests" принцип, що вже перевірений вживу в
  // RoadScout — частина запитів пачки могла завершитись помилкою
  // (num_error), і тоді num_success ніколи не зрівняється з num_requests,
  // попри те, що пачка вже дійсно готова.
  async processPendingBatches(): Promise<{ processed: number; stillPending: number; translatedTotal: number; failedTotal: number }> {
    const pendingJobs = await this.prisma.client.grokBatchJob.findMany({
      where: { jobType: 'article-rewrite', status: { in: ['pending', 'processing'] } },
    });

    let processed = 0;
    let stillPending = 0;
    let translatedTotal = 0;
    let failedTotal = 0;

    if (pendingJobs.length === 0) {
      console.log('[ArticlesService] Немає незавершених пачок article-rewrite.');
      return { processed, stillPending, translatedTotal, failedTotal };
    }

    console.log(`[ArticlesService] Перевіряю ${pendingJobs.length} незавершених пачок...`);

    for (const job of pendingJobs) {
      const statusInfo = await this.grokBatch.getBatchStatus(job.xaiBatchId);
      if (!statusInfo) {
        console.log(`[ArticlesService] Не вдалося отримати статус пачки ${job.xaiBatchId} — спробую наступного разу.`);
        stillPending++;
        continue;
      }

      console.log(`[ArticlesService] Пачка ${job.xaiBatchId}: ${statusInfo.completedCount + statusInfo.errorCount}/${statusInfo.totalCount} завершено (${statusInfo.pendingCount} ще в черзі, ${statusInfo.errorCount} з помилкою).`);

      const isActuallyDone = statusInfo.totalCount > 0 && statusInfo.pendingCount === 0;
      if (!isActuallyDone) {
        stillPending++;
        continue;
      }

      const rawResults = await this.grokBatch.getBatchResults(job.xaiBatchId);
      const requestMap = job.requestMap as unknown as Record<string, BatchRequestContext>;

      let translatedInJob = 0;
      let failedInJob = 0;

      for (const [batchRequestId, ctx] of Object.entries(requestMap)) {
        const rawText = rawResults[batchRequestId];
        if (!rawText) {
          failedInJob++;
          continue;
        }

        try {
          const cleaned = rawText.replace(/```json|```/g, '').trim();

          if (ctx.kind === 'score') {
            // За прямим запитом користувача — окрема гілка обробки для
            // score-запиту (не ArticleTranslation, оновлює сам Article).
            const parsed = JSON.parse(cleaned) as { score: number; reasoning: string };
            const score = Math.max(0, Math.min(100, Math.round(parsed.score)));
            await this.prisma.client.article.update({
              where: { id: ctx.articleId },
              data: { score, scoreReasoning: parsed.reasoning },
            });
            translatedInJob++;
            continue;
          }

          const parsed = JSON.parse(cleaned) as { title: string; excerpt: string; content: string };

          await this.prisma.client.articleTranslation.create({
            data: {
              articleId: ctx.articleId,
              locale: ctx.locale,
              slug: slugify(parsed.title),
              title: parsed.title,
              excerpt: parsed.excerpt,
              content: parsed.content,
              status: 'DRAFT',
            },
          });
          translatedInJob++;
        } catch (err) {
          this.logger.warn(`Не вдалося розпарсити результат ${batchRequestId}: ${err instanceof Error ? err.message : String(err)}`);
          failedInJob++;
        }
      }

      // Той самий захист, що в RoadScout: якщо жоден запит у пачці не дав
      // РОЗПАРСЕНОГО результату попри непорожній requestMap — сильний
      // сигнал зламаного парсингу, не "усі запити легітимно провалились".
      // Лишаємо job у processing для повторної спроби наступного разу,
      // не позначаємо completed.
      const requestMapSize = Object.keys(requestMap).length;
      if (requestMapSize > 0 && translatedInJob === 0) {
        console.log(`[ArticlesService] ⚠ Пачка ${job.xaiBatchId} завершена (${requestMapSize} запитів), але жоден результат не розпарсився — залишаю для повторної спроби.`);
        await this.prisma.client.grokBatchJob.update({ where: { id: job.id }, data: { status: 'processing' } });
        stillPending++;
        continue;
      }

      await this.prisma.client.grokBatchJob.update({ where: { id: job.id }, data: { status: 'completed', processedAt: new Date() } });
      console.log(`[ArticlesService] ✅ Пачка ${job.xaiBatchId} оброблена: ${translatedInJob} перекладів створено, ${failedInJob} з помилкою.`);
      processed++;
      translatedTotal += translatedInJob;
      failedTotal += failedInJob;
    }

    return { processed, stillPending, translatedTotal, failedTotal };
  }
}

function slugify(text: string): string {
  return (
    text
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
      .slice(0, 80) +
    '-' +
    Math.random().toString(36).slice(2, 7)
  );
}
