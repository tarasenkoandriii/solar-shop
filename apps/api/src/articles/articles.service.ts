import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { extractFirstJsonObject, sanitizeArticleForPrompt, GrokService } from '../grok/grok.service';
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
// Дефолт той самий, що й для синхронних викликів. Береться через
// GROK_MODEL, щоб не лишалось другого захардкодженого слага: інакше
// GROK_MODEL=grok-4.6 мовчки лишив би Batch API на старій моделі, і
// "єдине місце, де задана модель" було б неправдою.
// Дефолт моделі для Batch API. Читається через ConfigService (геттер
// нижче), а НЕ через process.env тут: цей модуль імпортується раніше,
// ніж ConfigModule прочитає .env, тож значення з файлу сюди просто не
// долітало б — а docker-compose передає в контейнер лише явний список
// змінних. Той самий клас помилки вже задокументований у compose для
// GROK_MANAGEMENT_API_KEY.
const DEFAULT_GROK_BATCH_MODEL = 'grok-4.3';

// Скільки разів пачка може ЗАВЕРШИТИСЬ, не давши жодного придатного
// результату, перш ніж визнати її невдалою. Рахуються лише такі
// завершення — детермінований сигнал зламаної пачки. Тимчасові збої
// (xAI недоступна, немає ключа, мережа) сюди НЕ рахуються: інакше одна
// недоступність провайдера списала б усі пачки, що саме в роботі, а
// частота крона живе поза репозиторієм (pg_cron), тож перекласти
// кількість спроб у години звідси неможливо.
const MAX_BATCH_POLL_ATTEMPTS = 5;

// xAI зберігає результати пачки обмежений час (у документації — до
// 24 годин на обробку). Після цього чекати вже нема на що, скільки б
// спроб не лишалось у запасі.
const MAX_BATCH_AGE_HOURS = 48;

// Скільки осиротілих статей повторно замовляємо за один прогін. Ліміт
// потрібен, щоб разовий масовий збій (скажімо, доба без ключа) не подав
// у пачку сотні запитів одночасно — черга розсмокчеться за кілька
// прогонів, а не одним стрибком витрат.
const MAX_ORPHAN_RETRIES_PER_RUN = 10;

// Скільки разів узагалі замовляємо переклад для однієї статті (перше
// замовлення рахується). Після цього стаття лишається як є — новина
// кількаденної давнини вже й не варта нових витрат.
const MAX_TRANSLATION_ORDERS = 3;

// Один запит у пачці. Раніше цей тип був написаний інлайном у місці
// оголошення масиву; винесено, бо тепер його складають два різні шляхи —
// перше замовлення і повторне.
interface BatchItem {
  batchRequestId: string;
  model: string;
  messages: { role: string; content: string }[];
  responseFormat?: { type: 'json_object' };
}

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

  // Модель для Batch API — СВІДОМО окрема від GROK_MODEL.
  //
  // Коментар угорі файлу фіксує реальний збій: xAI відповіла "Model
  // grok-4-fast is not supported for batch processing" — у пачок свій,
  // вужчий перелік дозволених моделей. Прив'язавши це до GROK_MODEL, ми
  // зробили б так, що цілком коректний для синхронних викликів слаг
  // мовчки ламає кожну подачу пачки.
  private get batchModel(): string {
    return this.config.get<string>('GROK_BATCH_MODEL')?.trim() || DEFAULT_GROK_BATCH_MODEL;
  }

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

  // АУДИТ 25.08.2026 — доданий бюджет часу. Прогін тягне по картинці на
  // кожну зі статей (RSS-фід, потім og:image як запасний варіант), і
  // жодного дедлайну не мав. Якщо платформа вб'є функцію ПІСЛЯ створення
  // рядків Article, але ДО подання пачки, ці статті стають рівно тими
  // сиротами, ремонт яких додано вище — тобто відсутність бюджету сама
  // виробляла роботу для ремонту.
  //
  // Дедлайн перевіряється між статтями: почату статтю доводимо до кінця
  // (напівстворений рядок гірший за необроблену статтю), нові не беремо.
  // Уже зібрані запити подаються в пачку в будь-якому разі.
  async runParser(timeBudgetMs = 200_000): Promise<{
    found: number;
    created: number;
    batchSubmitted: boolean;
    orphanRetries: number;
    itemsSkippedByTimeBudget: number;
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
    // Запас має покрити ДВІ речі, а не одну: (1) статтю, взяту в роботу
    // за мить до дедлайну — RSS-картинка з ретраями, og:image-фолбек,
    // завантаження на Blob; (2) саму подачу пачки після циклу — два
    // запити до xAI по 20с кожен. Перша версія рахувала лише перше, і
    // прогін міг бути вбитий уже ПІСЛЯ створення рядків Article, але ДО
    // запису GrokBatchJob — тобто виробляв рівно тих сиріт, ремонт яких
    // додано нижче, та ще й лишав оплачену пачку без обліку.
    const SAFETY_MARGIN_MS = 90_000;
    const deadlineAt = Date.now() + timeBudgetMs - SAFETY_MARGIN_MS;
    let found = 0;
    let created = 0;
    let itemsSkippedByTimeBudget = 0;
    // Id статей, для яких у цьому прогоні складено запити. Відмітка про
    // замовлення ставиться по ньому — після успішної подачі.
    const orderedArticleIds: string[] = [];
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
    const batchItems: BatchItem[] = [];

    for (const source of RSS_SOURCES) {
      if (created >= MAX_NEW_ARTICLES_PER_RUN) break;
      if (Date.now() >= deadlineAt) {
        this.logger.warn('Бюджет часу вичерпано — решта джерел лишається на наступний прогін.');
        break;
      }
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
        // break, не continue: після дедлайну решту стрічки проходити
        // немає сенсу. І перевірка стоїть ПІСЛЯ ліміту, інакше при
        // одночасному спрацюванні обох break був би недосяжний.
        if (Date.now() >= deadlineAt) {
          itemsSkippedByTimeBudget += items.length - items.indexOf(item);
          this.logger.warn(`Бюджет часу вичерпано — ${itemsSkippedByTimeBudget} позицій стрічки лишається на наступний прогін.`);
          break;
        }

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

        // Один і той самий текст іде і в промпт, і в БД. Раніше в промпт
        // ішов сирий item.description, а зберігався обрізаний — тобто
        // повторне замовлення давало МЕНШИЙ вхід, ніж первинне, і
        // перекладена наново стаття виходила коротшою. Плюс сирий
        // `${item.description}` при відсутньому полі підставляв у промпт
        // рядок "undefined".
        const sourceExcerpt = sanitizeArticleForPrompt(item.description ?? '');
        const sourceText = `${item.title}\n\n${sourceExcerpt}`;

        const slug = slugify(item.title);
        const article = await this.prisma.client.article.create({
          data: {
            slug,
            sourceUrl: item.link,
            sourceSite: source.siteName,
            originalLocale: source.sourceLocale,
            status: 'DRAFT',
            sourceImageUrl: item.imageUrl,
            // Вхідний текст зберігається ОДРАЗУ — це єдине, з чого можна
            // повторити замовлення перекладу, якщо пачка не відпрацює.
            // Обрізаємо тим самим лімітом, що застосовується до промпта,
            // щоб не тримати в БД більше, ніж усе одно поїде в модель.
            sourceTitle: item.title,
            sourceExcerpt: sourceExcerpt,
            // translationOrderedAt/translationOrders свідомо НЕ
            // проставляються тут: замовлення ще не відбулось. Обидва поля
            // пишуться ОДНИМ місцем — після успішної подачі пачки.
            // Інакше провалена подача (напр. незаданий ключ) списувала б
            // спробу, хоча до xAI нічого й не пішло.
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

        this.pushArticleRequests(article.id, sourceText, requestMap, batchItems);
        orderedArticleIds.push(article.id);
      }
    }

    // Осиротілі статті доукомплектовують ТУ САМУ пачку — окремої подачі
    // не робимо: одна пачка дешевша за дві, а логіка опитування вже
    // вміє змішаний requestMap.
    const orphanIds = await this.collectOrphanedArticleRequests(requestMap, batchItems).catch((err) => {
      this.logger.warn(`Повторне замовлення для осиротілих статей не вдалось: ${err instanceof Error ? err.message : String(err)}`);
      return [] as string[];
    });
    orderedArticleIds.push(...orphanIds);
    const orphanRetries = orphanIds.length;

    if (batchItems.length === 0) {
      console.log('[ArticlesService] Нових статей не знайдено — пачку не подаю.');
      return { found, created, batchSubmitted: false, orphanRetries, itemsSkippedByTimeBudget, sources };
    }

    console.log(`[ArticlesService] ${created} нових статей + ${orphanRetries} повторних замовлень (${batchItems.length} запитів рерайт+переклад) — подаю пачку до Grok Batch API...`);
    const submitResult = await this.grokBatch.submitBatch(`article-rewrite-${Date.now()}`, batchItems);

    if ('error' in submitResult) {
      console.log(`[ArticlesService] ⚠ Не вдалося подати пачку: ${submitResult.error}`);
      return { found, created, batchSubmitted: false, orphanRetries, itemsSkippedByTimeBudget, batchError: submitResult.error, sources };
    }

    await this.prisma.client.grokBatchJob.create({
      data: { xaiBatchId: submitResult.xaiBatchId, jobType: 'article-rewrite', requestMap: requestMap as never, status: 'pending' },
    });

    // Пачка прийнята і збережена — тільки тепер фіксуємо замовлення.
    // Помилка тут не має відкочувати вже подану пачку: у найгіршому разі
    // статті приїдуть у чергу ремонту ще раз, а це переживно.
    await this.markTranslationOrdered(orderedArticleIds).catch((err) => {
      this.logger.warn(`Не вдалося відмітити замовлення перекладу: ${err instanceof Error ? err.message : String(err)}`);
    });

    console.log(`[ArticlesService] Пачка ${submitResult.xaiBatchId} збережена (GrokBatchJob), очікую результатів за розкладом (крон-джоб article_batch_poll).`);
    return { found, created, batchSubmitted: true, orphanRetries, itemsSkippedByTimeBudget, xaiBatchId: submitResult.xaiBatchId, sources };
  }

  // Опитує всі незавершені GrokBatchJob (jobType='article-rewrite') —
  // викликається за розписом (крон-джоб article_batch_poll), не при
  // кожному запиті користувача. Той самий "trust num_pending, not
  // num_success === num_requests" принцип, що вже перевірений вживу в
  // RoadScout — частина запитів пачки могла завершитись помилкою
  // (num_error), і тоді num_success ніколи не зрівняється з num_requests,
  // попри те, що пачка вже дійсно готова.
  // Скільки статей лишились без перекладу і НЕ підлягають автоматичному
  // ремонту — тобто збережений вхідний текст для них відсутній. Такі
  // рядки могли з'явитись лише до появи sourceTitle; нових не буде.
  // Нічого не видаляємо: неможливість полагодити — не привід знищувати.
  async countUnrepairableArticles(): Promise<number> {
    const cutoff = new Date(Date.now() - MAX_BATCH_AGE_HOURS * 3_600_000);
    const count = await this.prisma.client.article.count({
      where: {
        status: 'DRAFT',
        createdAt: { lt: cutoff },
        translations: { none: {} },
        OR: [
          { sourceTitle: null },
          // Стеля вичерпана — але тільки якщо ОСТАННЄ замовлення теж уже
          // прострочене. Інакше стаття, що щойно отримала третю спробу,
          // добу поспіль звітувалась би як безнадійна, поки її пачка
          // спокійно обробляється.
          { translationOrders: { gte: MAX_TRANSLATION_ORDERS }, translationOrderedAt: { lt: cutoff } },
        ],
      },
    });
    if (count > 0) {
      this.logger.warn(`${count} статей лишились без перекладу остаточно: або створені до збереження вхідного тексту, або вичерпали ${MAX_TRANSLATION_ORDERS} спроби замовлення. Потрібне ручне рішення.`);
    }
    return count;
  }

  // Матеріалізація результатів пачки — ОДНЕ місце на всі шляхи.
  // Раніше цей цикл існував лише всередині основного обходу, тож
  // "остання спроба перед списанням" мусила або дублювати його, або
  // завантажувати результати вдруге. Повертає, скільки записів реально
  // лягло в БД, і скільки не вдалось.
  private async materializeBatchResults(
    requestMap: Record<string, BatchRequestContext>,
    rawResults: Record<string, string>,
  ): Promise<{ translated: number; failed: number; duplicates: number }> {
    let translated = 0;
    let failed = 0;
    let duplicates = 0;

    for (const [batchRequestId, ctx] of Object.entries(requestMap)) {
      const rawText = rawResults[batchRequestId];
      if (!rawText) {
        failed++;
        continue;
      }

      try {
        const cleaned = extractFirstJsonObject(rawText) ?? '';

        if (ctx.kind === 'score') {
          // За прямим запитом користувача — окрема гілка обробки для
          // score-запиту (не ArticleTranslation, оновлює сам Article).
          const parsed = JSON.parse(cleaned) as { score: number; reasoning: string };
          const score = Math.max(0, Math.min(100, Math.round(parsed.score)));
          await this.prisma.client.article.update({
            where: { id: ctx.articleId },
            data: { score, scoreReasoning: parsed.reasoning },
          });
          translated++;
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
        translated++;
      } catch (err) {
        // Переклад уже існує — це НЕ помилка, а нормальний наслідок
        // повторного замовлення: обидві пачки (стара, яку встигли
        // списати, і нова) можуть урешті доставити результат. Рахувати
        // такий дубль як провал означало б тримати джоб у статусі
        // PARTIAL постійно і ховати справжні збої в цьому шумі.
        if (isUniqueViolation(err)) {
          duplicates++;
          continue;
        }
        this.logger.warn(`Не вдалося розпарсити результат ${batchRequestId}: ${err instanceof Error ? err.message : String(err)}`);
        failed++;
      }
    }

    if (duplicates > 0) {
      this.logger.log(`${duplicates} перекладів уже існували (повторна доставка) — не рахую як помилки.`);
    }
    return { translated, failed, duplicates };
  }

  private async finalizeExpiredBatch(
    job: { id: string; xaiBatchId: string; requestMap: unknown },
    reason: string,
  ): Promise<{ givenUp: number; translated: number; failed: number }> {
    const results = await this.grokBatch.getBatchResults(job.xaiBatchId).catch(() => ({}));
    const requestMap = job.requestMap as Record<string, BatchRequestContext>;
    const { translated, failed, duplicates } = await this.materializeBatchResults(requestMap, results);

    // duplicates враховуються нарівні з translated: дублікат означає, що
    // результат ДОСТАВЛЕНО і розібрано, просто переклад уже існував.
    // Без цього пачка, яка все привезла успішно, списувалась би як
    // невдала лише тому, що її вміст уже був у базі.
    if (translated + duplicates > 0) {
      await this.prisma.client.grokBatchJob.update({
        where: { id: job.id },
        data: { status: 'completed', failureReason: `${reason}; врятовано ${translated} результатів на останній спробі`, processedAt: new Date() },
      });
      this.logger.warn(`Пачка ${job.xaiBatchId} прострочена (${reason}), але ${translated} результатів удалось забрати — джоб закрито.`);
      return { givenUp: 0, translated, failed };
    }

    await this.prisma.client.grokBatchJob.update({
      where: { id: job.id },
      data: { status: 'failed', failureReason: reason, processedAt: new Date() },
    });
    this.logger.warn(`Пачка ${job.xaiBatchId} визнана невдалою: ${reason}. Статті лишились без перекладу — наступний прогін парсера замовить його повторно.`);
    return { givenUp: 1, translated: 0, failed };
  }

  // Складання запитів для ОДНІЄЇ статті — спільне для першого замовлення
  // і для повторного. Раніше цей блок жив лише всередині обходу RSS, тож
  // повторно замовити переклад було нізвідки, навіть маючи текст.
  private pushArticleRequests(
    articleId: string,
    sourceText: string,
    requestMap: Record<string, BatchRequestContext>,
    batchItems: BatchItem[],
  ): void {
    for (const locale of TARGET_LOCALES) {
      const batchRequestId = `article_${articleId}_${locale}`;
      requestMap[batchRequestId] = { articleId, locale, kind: 'translation' };
      batchItems.push({
        batchRequestId,
        model: this.batchModel,
        // АУДИТ 25.08.2026: тут JSON-режиму не було, хоча промпт просить
        // строгий JSON. Модель регулярно повертала його в markdown-огорожі
        // або з преамбулою, розбір падав, і стаття мовчки лишалась без
        // перекладу (лічильник failedInJob).
        responseFormat: { type: 'json_object' as const },
        messages: [{ role: 'user', content: this.grok.buildArticleRewritePrompt(sourceText, locale) }],
      });
    }

    // За прямим запитом користувача — "добавить скоринг статьи". ОДИН
    // запит на статтю (не помножений на TARGET_LOCALES, як переклад) —
    // score оцінює контент, не залежить від мови виводу.
    const scoreBatchRequestId = `article_${articleId}_score`;
    requestMap[scoreBatchRequestId] = { articleId, locale: '', kind: 'score' };
    batchItems.push({
      batchRequestId: scoreBatchRequestId,
      model: this.batchModel,
      responseFormat: { type: 'json_object' as const },
      messages: [{ role: 'user', content: this.grok.buildArticleScorePrompt(sourceText) }],
    });
  }

  // Статті, чия пачка так і не відпрацювала, ПОВТОРНО ставляться в чергу
  // за збереженим вхідним текстом.
  //
  // Попередня версія цієї функції вміла лише рахувати такі статті й
  // писати про них у лог: відновити було нізвідки, бо Article не зберігав
  // оригінальний текст. Тепер зберігає (sourceTitle/sourceExcerpt), тож
  // це справжній ремонт, а не звіт. Нічого не видаляється: стаття просто
  // отримує ще одне замовлення перекладу в найближчій пачці.
  //
  // Обмеження за віком те саме, що для пачок: молодші за нього статті
  // цілком можуть чекати на пачку, яка ще в роботі.
  private async collectOrphanedArticleRequests(
    requestMap: Record<string, BatchRequestContext>,
    batchItems: BatchItem[],
  ): Promise<string[]> {
    const cutoff = new Date(Date.now() - MAX_BATCH_AGE_HOURS * 3_600_000);
    const orphans = await this.prisma.client.article.findMany({
      where: {
        status: 'DRAFT',
        translations: { none: {} },
        // Стеля повторів. Без неї стаття, чий рерайт не розбирається
        // ніколи, лишалась би в черзі вічно й замовлялась щопрогону.
        translationOrders: { lt: MAX_TRANSLATION_ORDERS },
        // Без збереженого тексту повторити замовлення неможливо — такі
        // рядки лишились із часів до цієї зміни. Їх не чіпаємо і не
        // видаляємо; вони просто не підлягають автоматичному ремонту.
        sourceTitle: { not: null },
        OR: [
          // Вік рахується від ОСТАННЬОГО ЗАМОВЛЕННЯ, не від створення
          // рядка: рядок Article з'являється до подання пачки, тож за
          // createdAt стаття ставала б кандидатом на ремонт РАНІШЕ, ніж
          // її власну пачку визнають невдалою — і ми платили б за
          // переклад удруге, поки перший ще законно в роботі.
          { translationOrderedAt: { lt: cutoff } },
          // Замовлення не відбулося жодного разу: подача пачки тоді
          // провалилась (або рядок лишився від коду до цієї зміни).
          { translationOrderedAt: null, createdAt: { lt: cutoff } },
        ],
      },
      select: { id: true, slug: true, sourceTitle: true, sourceExcerpt: true },
      orderBy: { createdAt: 'asc' },
      take: MAX_ORPHAN_RETRIES_PER_RUN,
    });
    if (orphans.length === 0) return [];

    for (const orphan of orphans) {
      this.pushArticleRequests(orphan.id, `${orphan.sourceTitle}\n\n${orphan.sourceExcerpt ?? ''}`, requestMap, batchItems);
    }

    this.logger.warn(`Повторно замовляю переклад для ${orphans.length} статей, чия пачка не відпрацювала: ${orphans.map((o) => o.slug).slice(0, 5).join(', ')}${orphans.length > 5 ? '…' : ''}`);
    // Лічильник НЕ рухаємо тут: відмітка ставиться лише після успішної
    // подачі, одним місцем для нових і повторних статей.
    return orphans.map((o) => o.id);
  }

  // Єдине місце, де фіксується факт замовлення перекладу. Викликається
  // ЛИШЕ після того, як xAI прийняла пачку.
  //
  // Це важливо саме для стелі спроб: провалена подача не коштує нічого
  // (пачки не створено, нічого не оплачено), тож списувати за неї одну з
  // трьох довічних спроб означало б, що кількаденна помилка в
  // налаштуваннях назавжди ховає всі статті того періоду, жодного разу
  // їх нікуди не відправивши. Той самий принцип уже зафіксовано для
  // пачок: тимчасові збої нашого боку спроб не списують.
  private async markTranslationOrdered(articleIds: string[]): Promise<void> {
    if (articleIds.length === 0) return;
    await this.prisma.client.article.updateMany({
      where: { id: { in: articleIds } },
      data: { translationOrderedAt: new Date(), translationOrders: { increment: 1 } },
    });
  }

  async processPendingBatches(): Promise<{ processed: number; stillPending: number; translatedTotal: number; failedTotal: number; givenUp: number }> {
    const pendingJobs = await this.prisma.client.grokBatchJob.findMany({
      where: { jobType: 'article-rewrite', status: { in: ['pending', 'processing'] } },
    });

    let processed = 0;
    let stillPending = 0;
    let translatedTotal = 0;
    let failedTotal = 0;
    let givenUp = 0;

    if (pendingJobs.length === 0) {
      console.log('[ArticlesService] Немає незавершених пачок article-rewrite.');
      return { processed, stillPending, translatedTotal, failedTotal, givenUp };
    }

    console.log(`[ArticlesService] Перевіряю ${pendingJobs.length} незавершених пачок...`);

    for (const job of pendingJobs) {
      // АУДИТ 25.08.2026. Раніше вихід із цього циклу був лише один —
      // успіх. Пачка, яку xAI віддає без поля state, або пачка, де всі
      // запити впали, поверталась сюди щопрогону НАЗАВЖДИ: статус
      // 'failed' був описаний у схемі, але не виставлявся ніде в коді.
      // Крон ходить раз у кілька хвилин, тож кожна така пачка — це
      // постійний запит статусу плюс до 50 сторінок результатів, і з
      // часом їх лише більшало.
      //
      // Два незалежні запобіжники: кількість спроб і вік. Вік потрібен
      // окремо, бо xAI віддає результати пачки обмежений час — після
      // цього чекати вже нема на що, скільки б спроб не лишалось.
      const ageHours = (Date.now() - job.createdAt.getTime()) / 3_600_000;
      const overAttempts = job.pollAttempts >= MAX_BATCH_POLL_ATTEMPTS;
      const overAge = ageHours > MAX_BATCH_AGE_HOURS;

      // ПРОСТРОЧЕНА пачка не списується наосліп: спершу все одно
      // пробуємо забрати результати (нижче, спільним для всіх шляхом —
      // рівно ОДИН раз). Прострочення лише міняє ФІНАЛ: такий джоб
      // завершується термінально в будь-якому разі й більше в чергу не
      // повертається. Перша версія цієї перевірки качала результати тут
      // окремо, а потім не використовувала їх — і виходило гірше, ніж
      // було: подвійне завантаження щопрогону і недосяжне списання,
      // бо непорожня, але нерозбірна відповідь щоразу "рятувала" пачку.
      const isExpired = overAttempts || overAge;
      const expiryReason = overAttempts
        ? `${job.pollAttempts} завершень без жодного придатного результату`
        : `пачці ${Math.round(ageHours)} год`;

      const statusInfo = await this.grokBatch.getBatchStatus(job.xaiBatchId);
      if (!statusInfo) {
        // Спробу СВІДОМО не рахуємо: getBatchStatus повертає null і на
        // мережевій помилці, і на відсутньому ключі, і на 5xx у xAI. Це
        // збої НАШОГО боку або тимчасові — якби вони списували квоту,
        // одна двогодинна недоступність xAI поховала б усі пачки, що
        // саме в роботі. Від вічного очікування захищає перевірка віку.
        console.log(`[ArticlesService] Не вдалося отримати статус пачки ${job.xaiBatchId} — спробую наступного разу.`);
        // Прострочена пачка, статус якої недоступний, — остання спроба
        // забрати результати наосліп, і термінальний фінал у будь-якому
        // разі.
        if (isExpired) {
          // Врятовані результати ОБОВ'ЯЗКОВО потрапляють у підсумки:
          // інакше прогін, що витяг десятки перекладів із простроченої
          // пачки, відзвітував би нулями і виглядав як "нічого не було".
          const outcome = await this.finalizeExpiredBatch(job, expiryReason);
          givenUp += outcome.givenUp;
          translatedTotal += outcome.translated;
          failedTotal += outcome.failed;
          if (outcome.translated > 0) processed++;
          continue;
        }
        stillPending++;
        continue;
      }

      console.log(`[ArticlesService] Пачка ${job.xaiBatchId}: ${statusInfo.completedCount + statusInfo.errorCount}/${statusInfo.totalCount} завершено (${statusInfo.pendingCount} ще в черзі, ${statusInfo.errorCount} з помилкою).`);

      const isActuallyDone = statusInfo.totalCount > 0 && statusInfo.pendingCount === 0;
      if (!isActuallyDone) {
        // totalCount === 0 — відповідь без поля state. Це також стан
        // щойно поданої пачки, поки xAI її не зареєструвала, тож спробу
        // тут теж не рахуємо: від зависання захищає вік.
        if (isExpired) {
          // Врятовані результати ОБОВ'ЯЗКОВО потрапляють у підсумки:
          // інакше прогін, що витяг десятки перекладів із простроченої
          // пачки, відзвітував би нулями і виглядав як "нічого не було".
          const outcome = await this.finalizeExpiredBatch(job, expiryReason);
          givenUp += outcome.givenUp;
          translatedTotal += outcome.translated;
          failedTotal += outcome.failed;
          if (outcome.translated > 0) processed++;
          continue;
        }
        stillPending++;
        continue;
      }

      const rawResults = await this.grokBatch.getBatchResults(job.xaiBatchId);
      const requestMap = job.requestMap as unknown as Record<string, BatchRequestContext>;

      const { translated: translatedInJob, failed: failedInJob, duplicates: duplicatesInJob } = await this.materializeBatchResults(requestMap, rawResults);

      // Той самий захист, що в RoadScout: якщо жоден запит у пачці не дав
      // РОЗПАРСЕНОГО результату попри непорожній requestMap — сильний
      // сигнал зламаного парсингу, не "усі запити легітимно провалились".
      // Лишаємо job у processing для повторної спроби наступного разу,
      // не позначаємо completed.
      const requestMapSize = Object.keys(requestMap).length;
      // duplicatesInJob > 0 — доказ, що розбір ПРАЦЮЄ (результат
      // доставлено, JSON розібрано, просто переклад уже існував). Без
      // цієї умови пачка з повністю успішною повторною доставкою
      // діагностувалась би як зламаний парсинг і опитувалась заново.
      if (requestMapSize > 0 && translatedInJob === 0 && duplicatesInJob === 0) {
        // Прострочена пачка сюди вже не повертається: інакше непорожня,
        // але стабільно нерозбірна відповідь тримала б джоб у черзі
        // вічно, щопрогону заново завантажуючи ті самі результати.
        if (isExpired) {
          await this.prisma.client.grokBatchJob.update({
            where: { id: job.id },
            data: { status: 'failed', failureReason: `${expiryReason}; результати є, але жоден не розібрався`, processedAt: new Date() },
          });
          this.logger.warn(`Пачка ${job.xaiBatchId} визнана невдалою: ${expiryReason}, жоден результат не розібрався. Статті лишились без перекладу — наступний прогін парсера замовить його повторно.`);
          givenUp++;
          continue;
        }

        console.log(`[ArticlesService] ⚠ Пачка ${job.xaiBatchId} завершена (${requestMapSize} запитів), але жоден результат не розпарсився — залишаю для повторної спроби.`);
        await this.prisma.client.grokBatchJob.update({
          where: { id: job.id },
          data: { status: 'processing', pollAttempts: { increment: 1 } },
        });
        stillPending++;
        continue;
      }

      await this.prisma.client.grokBatchJob.update({ where: { id: job.id }, data: { status: 'completed', processedAt: new Date() } });
      console.log(`[ArticlesService] ✅ Пачка ${job.xaiBatchId} оброблена: ${translatedInJob} перекладів створено, ${failedInJob} з помилкою.`);
      processed++;
      translatedTotal += translatedInJob;
      failedTotal += failedInJob;
    }

    return { processed, stillPending, translatedTotal, failedTotal, givenUp };
  }

  // За прямим запитом користувача — "добавить полный импорт-экспорт
  // всех статей в заголовке через compacted json". Той самий принцип
  // ідемпотентності, що вже FinancingService.exportData()/importData()
  // (natural key, не id) — тут природний ключ статті: `slug`. АЛЕ,
  // на відміну від programs (де свідомо обрано читабельний об'єктний
  // формат, бо десятки записів), тут користувач ЯВНО попросив саме
  // "compacted" — виправдано: кожна стаття має ДО 3 перекладів з
  // ДОВГИМ текстовим контентом (content — повний текст статті), тому
  // translations серіалізовано TUPLE-масивами (без повторюваних
  // ключів locale/slug/title/excerpt/content/status на кожен переклад),
  // не масивом об'єктів — реальна економія байтів при сотнях статей.
  async exportData(): Promise<{ formatVersion: 1; exportedAt: string; articles: ExportedArticle[] }> {
    const rows = await this.prisma.client.article.findMany({
      orderBy: { createdAt: 'asc' },
      include: { translations: true },
    });
    return {
      formatVersion: 1,
      exportedAt: new Date().toISOString(),
      articles: rows.map((a) => ({
        slug: a.slug,
        sourceUrl: a.sourceUrl,
        sourceSite: a.sourceSite,
        originalLocale: a.originalLocale,
        coverImage: a.coverImage,
        sourceImageUrl: a.sourceImageUrl,
        score: a.score,
        scoreReasoning: a.scoreReasoning,
        tags: a.tags,
        publishedAt: a.publishedAt ? a.publishedAt.toISOString() : null,
        status: a.status,
        translations: a.translations.map((t) => [t.locale, t.slug, t.title, t.excerpt, t.content, t.status] as ExportedTranslationTuple),
      })),
    };
  }

  async importData(payload: unknown): Promise<{ created: number; updated: number; translationsCreated: number; translationsUpdated: number; errors: string[] }> {
    const data = this.validateArticleImportPayload(payload);
    const result = { created: 0, updated: 0, translationsCreated: 0, translationsUpdated: 0, errors: [] as string[] };

    for (const a of data.articles) {
      try {
        const existing = await this.prisma.client.article.findUnique({ where: { slug: a.slug } });
        const fields = {
          sourceUrl: a.sourceUrl ?? undefined,
          sourceSite: a.sourceSite ?? undefined,
          originalLocale: a.originalLocale ?? 'uk',
          coverImage: a.coverImage ?? undefined,
          sourceImageUrl: a.sourceImageUrl ?? undefined,
          score: a.score ?? undefined,
          scoreReasoning: a.scoreReasoning ?? undefined,
          tags: a.tags ?? [],
          publishedAt: a.publishedAt ? new Date(a.publishedAt) : undefined,
          status: a.status as never,
        };
        const article = existing
          ? await this.prisma.client.article.update({ where: { id: existing.id }, data: fields })
          : await this.prisma.client.article.create({ data: { ...fields, slug: a.slug } });
        if (existing) result.updated++;
        else result.created++;

        for (const [locale, tSlug, title, excerpt, content, status] of a.translations) {
          const existingTranslation = await this.prisma.client.articleTranslation.findUnique({
            where: { articleId_locale: { articleId: article.id, locale } },
          });
          const tFields = { slug: tSlug, title, excerpt, content, status: status as never };
          if (existingTranslation) {
            await this.prisma.client.articleTranslation.update({ where: { id: existingTranslation.id }, data: tFields });
            result.translationsUpdated++;
          } else {
            await this.prisma.client.articleTranslation.create({ data: { ...tFields, articleId: article.id, locale } });
            result.translationsCreated++;
          }
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        result.errors.push(`${a.slug}: ${message}`);
      }
    }

    return result;
  }

  // Валідація структурою (не class-validator DTO — той самий підхід,
  // що вже FinancingService.validateImportPayload() — `unknown`
  // коректно проходить через global ValidationPipe, не обходить
  // його мовчки).
  private validateArticleImportPayload(payload: unknown): { articles: ExportedArticle[] } {
    if (!payload || typeof payload !== 'object' || !Array.isArray((payload as { articles?: unknown }).articles)) {
      throw new BadRequestException('Невалідний формат: очікується { articles: [...] }');
    }
    const articles = (payload as { articles: unknown[] }).articles;
    for (const a of articles) {
      if (!a || typeof a !== 'object' || typeof (a as { slug?: unknown }).slug !== 'string') {
        throw new BadRequestException('Кожна стаття має містити slug рядком');
      }
      const translations = (a as { translations?: unknown }).translations;
      if (!Array.isArray(translations)) {
        throw new BadRequestException(`Стаття "${(a as { slug: string }).slug}" має містити translations масивом`);
      }
      for (const t of translations) {
        if (!Array.isArray(t) || t.length !== 6) {
          throw new BadRequestException(`Стаття "${(a as { slug: string }).slug}": кожен переклад має бути tuple з 6 елементів [locale, slug, title, excerpt, content, status]`);
        }
      }
    }
    return { articles: articles as ExportedArticle[] };
  }
}

type ExportedTranslationTuple = [locale: string, slug: string, title: string, excerpt: string, content: string, status: string];

interface ExportedArticle {
  slug: string;
  sourceUrl: string | null;
  sourceSite: string | null;
  originalLocale: string;
  coverImage: string | null;
  sourceImageUrl: string | null;
  score: number | null;
  scoreReasoning: string | null;
  tags: string[];
  publishedAt: string | null;
  status: string;
  translations: ExportedTranslationTuple[];
}

// АУДИТ 25.08.2026. NFKD розкладає діакритику, але кирилицю НЕ
// транслітерує — тож після фільтра [^a-z0-9] український чи російський
// заголовок перетворювався на порожній рядок, і слаг статті ставав просто
// випадковим суфіксом ("-k3f9a"). А це публічний сегмент URL: обидві
// основні локалі сайту, uk і ru, отримували адреси без жодного слова,
// марні і для читача, і для пошуку. Читабельні слаги виходили лише в en.
const CYRILLIC_TO_LATIN: Record<string, string> = {
  а: 'a', б: 'b', в: 'v', г: 'h', ґ: 'g', д: 'd', е: 'e', є: 'ie', ж: 'zh', з: 'z',
  и: 'y', і: 'i', ї: 'i', й: 'i', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p',
  р: 'r', с: 's', т: 't', у: 'u', ф: 'f', х: 'kh', ц: 'ts', ч: 'ch', ш: 'sh',
  щ: 'shch', ь: '', ю: 'iu', я: 'ia', ъ: '', ы: 'y', э: 'e', ё: 'e',
};

function transliterate(text: string): string {
  return text.replace(/[\u0400-\u04FF]/g, (ch) => CYRILLIC_TO_LATIN[ch] ?? '');
}

// Prisma-клієнт тут не імпортується як значення, тому код помилки
// перевіряємо структурно — це той самий P2002.
function isUniqueViolation(err: unknown): boolean {
  return typeof err === 'object' && err !== null && (err as { code?: unknown }).code === 'P2002';
}

function slugify(text: string): string {
  const base = transliterate(text.toLowerCase())
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 80);

  // Випадковий суфікс лишається — slug унікальний на рівні БД, а
  // заголовки статей із різних джерел цілком можуть збігтися.
  return `${base || 'article'}-${Math.random().toString(36).slice(2, 7)}`;
}
