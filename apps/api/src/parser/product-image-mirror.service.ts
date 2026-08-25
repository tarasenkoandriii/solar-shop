import { Injectable, Logger } from '@nestjs/common';
import { createHash } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { BlobStorageService } from '../blob/blob-storage.service';
import { mapWithConcurrency } from './parser-run-cache';

export interface ImageMirrorResult {
  pending: number;
  attempted: number;
  mirrored: number;
  deduped: number;
  failed: number;
  givenUp: number;
  remaining: number;
  elapsedMs: number;
  isComplete: boolean;
  skippedReason?: string;
}

// Скільки разів пробуємо одну картинку, перш ніж лишити її на прямому
// посиланні назавжди. Картинка, яку постачальник видалив, інакше
// поверталась би в чергу щопрогону вічно.
const MAX_MIRROR_ATTEMPTS = 3;

// Скільки картинок тягнемо одночасно. Тут, на відміну від парсера, вузьке
// місце — не латентність БД, а завантаження й віддача самих файлів
// (сотні КБ кожен), тож обмежує вже канал, а не пул з'єднань Postgres.
const DEFAULT_MIRROR_CONCURRENCY = 4;

// Обмеження на розмір файлу — захист від випадкового багатомегабайтного
// TIFF у видачі постачальника, який з'їв би і бюджет часу, і квоту сховища.
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

// Таймаут на ВСЮ операцію завантаження — з'єднання, заголовки і тіло.
const DOWNLOAD_TIMEOUT_MS = 15_000;

// Чому картинку не вдалося перенести. Розрізняти обов'язково: провина
// ДЖЕРЕЛА (404, не картинка, завелика) означає, що ця конкретна картинка
// приречена і має врешті вийти з черги; провина НАШОГО СХОВИЩА
// (протермінований токен, вичерпана квота, недоступний Blob) стосується
// геть усіх картинок одразу — списувати за неї спроби означало б за три
// прогони назавжди поховати весь каталог через одну помилку в
// налаштуваннях. Тому спроби рахуються лише за 'source'.
type MirrorFailure = 'source' | 'storage';

// Форма рядка, з якою працює джоб — рівно те, що перелічено в select
// нижче. Явний тип, а не висновок: зміна select'а одразу підсвітиться тут,
// а не десь у глибині циклу.
interface MirrorImageRow {
  id: string;
  sourceUrl: string | null;
  url: string;
  mirrorAttempts: number;
}

const CONTENT_TYPE_EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/avif': 'avif',
  'image/gif': 'gif',
};

@Injectable()
export class ProductImageMirrorService {
  private readonly logger = new Logger(ProductImageMirrorService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly blob: BlobStorageService,
  ) {}

  // За прямим запитом користувача (25.08.2026) — "полностью сделай через
  // блоб". Передісторія: картинки товарів зберігались прямим посиланням на
  // сайт постачальника, і next/image різав їх (домен поза
  // images.remotePatterns) — у каталозі були биті іконки.
  //
  // Дзеркалювання свідомо винесене В ОКРЕМИЙ джоб, а не вбудоване в
  // парсер. Причина конкретна: парсер щойно ледве вкладався в ліміт
  // Vercel (реальний збій — "бюджет часу вичерпано (на обробці)"), а
  // завантаження + віддача файлу на сотні КБ коштує на порядок більше за
  // будь-який запит до БД. Вбудувавши це в парсер, ми б поверталися рівно
  // до тієї проблеми, від якої щойно пішли. Тут же — той самий патерн, що
  // вже працює для PVGIS і відгуків: тайм-боксований ідемпотентний прогін,
  // що доїдає чергу порціями, і "кеш і є прогресом".
  //
  // Якщо сховище Blob колись переstворять (це рутинна операція — і
  // піддомен <storeId> при цьому змінюється), усі вже перенесені
  // посилання почнуть віддавати 404, і жоден джоб цього не помітить: усі
  // запити фільтрують mirroredAt = null. Саме заради цього sourceUrl
  // зберігається назавжди — відкат робиться одним запитом:
  //   UPDATE "ProductImage"
  //   SET "url" = "sourceUrl", "mirroredAt" = NULL, "mirrorAttempts" = 0
  //   WHERE "sourceUrl" IS NOT NULL AND "mirroredAt" IS NOT NULL;
  // після чого цей джоб перенесе все наново.
  //
  // Ключове для безпеки: ProductImage.url ЗАВЖДИ лишається робочим. До
  // дзеркалювання це пряме посилання на постачальника (картинка видна
  // одразу після парсингу), після — посилання на Blob. Проміжного стану
  // "картинки немає" не існує, тож джоб можна зупинити будь-коли.
  async runMirror(timeBudgetMs = 200_000): Promise<ImageMirrorResult> {
    const startedAt = Date.now();
    const deadlineAt = startedAt + timeBudgetMs;

    // Разовий backfill для рядків, створених ДО появи sourceUrl: у них
    // url — це і є пряме посилання на постачальника, іншого джерела
    // просто немає. Без цього кроку весь наявний каталог назавжди лишився
    // б поза чергою (вона фільтрує по sourceUrl != null), і джоб
    // "працював" би на порожньому місці.
    //
    // Свідомо НЕ чіпаємо:
    //  - посилання, які вже й так проходять через next/image (наше
    //    сховище, supabase, placehold.co із сіду) — переносити їх нікуди,
    //    а в черзі вони лише марно палили б спроби;
    //  - картинки, додані АДМІНОМ вручну (sourceListingId IS NULL): у
    //    matching.service.ts прямо зафіксовано принцип "не перезаписуємо
    //    вручну підібрані адміном фото", і підміна url тихцем його б
    //    порушила. Картинки від парсера завжди мають sourceListingId.
    //
    // Патерни доменів прив'язані до крапки перед доменом і кінця рядка або
    // '/', інакше 'placehold.co' зловило б і 'placehold.com' (.co — префікс
    // .com), а '%supabase.co%' — будь-який URL, де ці літери просто
    // трапились у шляху.
    //
    // http:// теж беремо, не лише https://. Саме такі рядки найбільш
    // зламані: браузер ріже їх на https-сторінці як mixed content, тож
    // виключити їх з переносу означало б залишити без картинок рівно тих,
    // кому він найпотрібніший. Порівняння без урахування регістру (~*),
    // бо схема й домен регістронезалежні за RFC.
    const backfilled = await this.prisma.client.$executeRaw`
      UPDATE "ProductImage"
      SET "sourceUrl" = "url"
      WHERE "sourceUrl" IS NULL
        AND "mirroredAt" IS NULL
        AND "sourceListingId" IS NOT NULL
        AND "url" ~* '^https?://'
        AND "url" !~* '^https?://([^/]+\\.)?placehold\\.co(/|$)'
        AND "url" !~* '^https?://[^/]*\\.supabase\\.co(/|$)'
        AND "url" !~* '^https?://[^/]*\\.public\\.blob\\.vercel-storage\\.com(/|$)'
    `;
    if (backfilled > 0) {
      console.log(`[ProductImageMirror] Проставлено sourceUrl для ${backfilled} картинок, збережених до появи цього поля — тепер вони теж у черзі.`);
    }

    const pending = await this.prisma.client.productImage.count({
      where: { mirroredAt: null, sourceUrl: { not: null }, mirrorAttempts: { lt: MAX_MIRROR_ATTEMPTS } },
    });

    if (!this.blob.isConfigured()) {
      // М'який фолбек — той самий принцип, що вже в ArticlesService:
      // відсутність сховища не є помилкою прогону. Картинки лишаються на
      // прямих посиланнях і працюють; щойно токен з'явиться, цей самий
      // джоб підхопить чергу без жодних додаткових дій.
      const reason = 'BLOB_READ_WRITE_TOKEN не налаштований — картинки лишаються на прямих посиланнях постачальників.';
      this.logger.warn(reason);
      return { pending, attempted: 0, mirrored: 0, deduped: 0, failed: 0, givenUp: 0, remaining: pending, elapsedMs: Date.now() - startedAt, isComplete: pending === 0, skippedReason: reason };
    }

    // Беремо найстаріші першими — так свіжозапарсені товари не відсувають
    // назавжди тих, хто чекає з попередніх прогонів.
    const batch: MirrorImageRow[] = await this.prisma.client.productImage.findMany({
      where: { mirroredAt: null, sourceUrl: { not: null }, mirrorAttempts: { lt: MAX_MIRROR_ATTEMPTS } },
      orderBy: { createdAt: 'asc' },
      take: 500,
      select: { id: true, sourceUrl: true, url: true, mirrorAttempts: true },
    });

    let mirrored = 0;
    let deduped = 0;
    let givenUp = 0;

    // Дедуплікація В МЕЖАХ прогону: той самий файл трапляється в різних
    // товарів (постачальники повторно використовують фото модельного ряду),
    // а картинки одного товару взагалі часто йдуть підряд. Ключ — проміс,
    // а не готове значення, бо при паралельній обробці кілька рядків з
    // однаковим sourceUrl стартують ОДНОЧАСНО і зі звичайним кешем усі
    // вони промахнулись би повз нього й завантажили файл по разу.
    const inFlightBySourceUrl = new Map<string, Promise<MirrorOutcome>>();

    const { failed, isComplete } = await mapWithConcurrency(
      batch,
      mirrorConcurrency(),
      () => Date.now() >= deadlineAt,
      async (image: MirrorImageRow) => {
        const sourceUrl = image.sourceUrl;
        if (!sourceUrl) return; // where вже це гарантує, тут лише TS-guard

        const inFlight = inFlightBySourceUrl.get(sourceUrl);
        const isFollower = inFlight !== undefined;

        // Той самий файл уже їде в цьому прогоні — чекаємо його результат
        // замість другого завантаження. `.catch` обов'язковий: без нього
        // відхилений проміс лідера повалив би КОЖНОГО, хто його чекає, і
        // одна мертва картинка, що трапляється в 300 товарів, дала б 300
        // "помилок" замість однієї.
        // resolveBlobUrl тотальна (див. її коментар), тож .catch тут —
        // страховка від зовсім непередбаченого, а НЕ спосіб визначити
        // причину: 'storage' обрано свідомо, бо помилка невідомої природи
        // не є доведеною провиною картинки і не має палити її спроби.
        const outcome: MirrorOutcome = isFollower
          ? await inFlight.catch(() => ({ url: null, failure: 'storage' as const }))
          : await (() => {
              const started = this.resolveBlobUrl(sourceUrl);
              inFlightBySourceUrl.set(sourceUrl, started);
              return started;
            })();

        if (outcome.url) {
          await this.markMirrored(image.id, outcome.url);
          if (isFollower) deduped++;
          else mirrored++;
          return;
        }

        // Не вийшло. url НЕ чіпаємо: пряме посилання працює, користувач
        // картинку бачить.
        //
        // Спробу списуємо ЛИШЕ якщо винне джерело. Збій сховища стосується
        // усіх картинок одразу, і рахувати його як провину кожної окремої
        // означало б за три прогони назавжди вивести з черги весь каталог
        // через, скажімо, протермінований токен.
        //
        // Лічильник рухають і ті, хто чекав чужого промісу: інакше 300
        // рядків з одним мертвим URL виходили б із черги по одному за
        // прогін — сотні прогонів замість трьох.
        if (outcome.failure !== 'source') return;

        const attempts = image.mirrorAttempts + 1;
        await this.prisma.client.productImage.update({
          where: { id: image.id },
          data: { mirrorAttempts: attempts },
        });
        if (attempts >= MAX_MIRROR_ATTEMPTS) {
          givenUp++;
          this.logger.warn(`Картинка ${image.id} (${sourceUrl}) не завантажилась ${attempts} разів — лишаю на прямому посиланні, більше не пробую.`);
        }
      },
      (err: unknown, image: MirrorImageRow) => {
        this.logger.warn(`Дзеркалювання картинки ${image.id} впало: ${err instanceof Error ? err.message : String(err)}`);
      },
    );

    const remaining = await this.prisma.client.productImage.count({
      where: { mirroredAt: null, sourceUrl: { not: null }, mirrorAttempts: { lt: MAX_MIRROR_ATTEMPTS } },
    });

    return {
      pending,
      attempted: batch.length,
      mirrored,
      deduped,
      failed,
      givenUp,
      remaining,
      elapsedMs: Date.now() - startedAt,
      // Повний прогін — це і встигли пройти весь батч, і в черзі більше
      // нікого (батч обмежений 500, тож перше не означає друге).
      isComplete: isComplete && remaining === 0,
    };
  }

  // Один sourceUrl -> один URL на Blob. Спершу шукаємо вже завантажений
  // дублікат у БД: постачальники масово перевикористовують ті самі фото
  // між товарами, і без цієї перевірки той самий файл їздив би на Blob
  // десятки разів, витрачаючи і час, і квоту сховища.
  private async resolveBlobUrl(sourceUrl: string): Promise<MirrorOutcome> {
    // ЦЯ ФУНКЦІЯ НЕ МАЄ ПРАВА ВІДХИЛИТИСЬ. Її проміс шариться між усіма
    // рядками з тим самим sourceUrl, і відхилення довелося б комусь
    // перекласифіковувати наосліп — а єдиний чесний варіант наосліп
    // ('source') означав би, що збій НАШОЇ інфраструктури (вичерпаний пул
    // Postgres, обрив з'єднання) списується як провина картинки. Три такі
    // вікна — і сотні цілком живих картинок назавжди поза чергою, без
    // жодного способу повернути їх, окрім ручного SQL. Тому класифікація
    // робиться тут, один раз, і їде разом з результатом.
    try {
      const alreadyMirrored: { url: string } | null = await this.prisma.client.productImage.findFirst({
        where: { sourceUrl, mirroredAt: { not: null } },
        select: { url: true },
      });
      if (alreadyMirrored && BlobStorageService.isBlobUrl(alreadyMirrored.url)) {
        return { url: alreadyMirrored.url };
      }

      return await this.downloadAndUpload(sourceUrl);
    } catch (err) {
      // Сюди потрапляє лише те, що ми не передбачили явно (Prisma, обрив
      // тіла відповіді). Це наша проблема, не джерела — 'storage', спроба
      // не списується.
      this.logger.warn(`Непередбачена помилка при дзеркалюванні ${sourceUrl}: ${err instanceof Error ? err.message : String(err)}`);
      return { url: null, failure: 'storage' };
    }
  }

  private async downloadAndUpload(sourceUrl: string): Promise<MirrorOutcome> {
    // Свій fetch, а не спільний fetchWithRetry. Причина не в ретраях (їх
    // тут і не треба — картинку підхопить наступний прогін), а в тому, що
    // fetchWithRetry знімає таймаут ЩОЙНО ПРИЙШЛИ ЗАГОЛОВКИ і тільки потім
    // віддає Response. Тіло лишається без обмеження часу зовсім.
    //
    // Для десятка обкладинок RSS це неважливо, для сотень URL з чужих
    // сайтів — критично: сайт може віддати 200 з правильним
    // Content-Type і зависнути на тілі. Чотири такі URL займають усі
    // чотири слоти назавжди (дедлайн перевіряється МІЖ позиціями, зависле
    // не перервати), джоб не повертається, а через стабільний
    // orderBy createdAt ті самі URL стають першими й наступного разу —
    // черга не рухається більше ніколи.
    //
    // Тому AbortController живе до кінця ЧИТАННЯ ТІЛА, а не до заголовків.
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), DOWNLOAD_TIMEOUT_MS);
    let res: Response;
    let buffer: Buffer;
    try {
      res = await fetch(sourceUrl, { signal: controller.signal });

      if (!res.ok) {
        this.logger.warn(`Джерело картинки ${sourceUrl} віддало HTTP ${res.status}`);
        return { url: null, failure: 'source' };
      }

      // Тип і розмір перевіряємо ДО читання тіла: немає сенсу тягнути
      // мегабайти HTML-заглушки, а перевірка розміру постфактум рятувала б
      // лише квоту сховища, але не пам'ять функції.
      const declaredType = (res.headers.get('content-type') ?? '').split(';')[0]!.trim().toLowerCase();
      if (!declaredType.startsWith('image/')) {
        // Типовий випадок — постачальник віддав HTML-сторінку помилки або
        // редірект на заглушку зі статусом 200. Зберігати це як "картинку"
        // гірше, ніж лишити пряме посилання.
        this.logger.warn(`Джерело ${sourceUrl} віддало не картинку (content-type: "${declaredType || 'відсутній'}")`);
        return { url: null, failure: 'source' };
      }

      const declaredLength = Number(res.headers.get('content-length'));
      if (Number.isFinite(declaredLength) && declaredLength > MAX_IMAGE_BYTES) {
        this.logger.warn(`Картинка ${sourceUrl} заявляє ${Math.round(declaredLength / 1024)} КБ — не читаю.`);
        return { url: null, failure: 'source' };
      }

      buffer = Buffer.from(await res.arrayBuffer());
    } catch (err) {
      // Один catch на з'єднання, заголовки і тіло: наслідок для викликача
      // однаковий — з цього джерела зараз нічого не взяти.
      this.logger.warn(`Джерело картинки ${sourceUrl} недоступне: ${err instanceof Error ? err.message : String(err)}`);
      return { url: null, failure: 'source' };
    } finally {
      clearTimeout(timeout);
    }

    const contentType = (res.headers.get('content-type') ?? '').split(';')[0]!.trim().toLowerCase();

    if (buffer.byteLength === 0) {
      this.logger.warn(`Джерело ${sourceUrl} віддало порожню відповідь`);
      return { url: null, failure: 'source' };
    }
    if (buffer.byteLength > MAX_IMAGE_BYTES) {
      this.logger.warn(`Картинка ${sourceUrl} завелика (${Math.round(buffer.byteLength / 1024)} КБ) — пропускаю, лишаю пряме посилання.`);
      return { url: null, failure: 'source' };
    }

    // Ім'я файлу — хеш ОРИГІНАЛЬНОГО URL: у шлях не потрапляють ні
    // кирилиця, ні query-рядок, ні "..", і сам шлях лишається читаним
    // орієнтиром "звідки це". Від повторного завантаження того самого
    // джерела захищає не шлях, а перевірка в БД (resolveBlobUrl вище).
    const hash = createHash('sha256').update(sourceUrl).digest('hex').slice(0, 32);
    const ext = CONTENT_TYPE_EXT[contentType] ?? 'jpg';

    const uploaded = await this.blob.upload(`products/${hash}.${ext}`, contentType, buffer);
    // Скачати вийшло, а покласти до себе — ні: це наша проблема, не
    // джерела. Спробу не списуємо.
    return uploaded ? { url: uploaded } : { url: null, failure: 'storage' };
  }

  private async markMirrored(imageId: string, blobUrl: string): Promise<void> {
    await this.prisma.client.productImage.update({
      where: { id: imageId },
      data: { url: blobUrl, mirroredAt: new Date() },
    });
  }
}

interface MirrorOutcome {
  url: string | null;
  failure?: MirrorFailure;
}

function mirrorConcurrency(): number {
  const configured = process.env.IMAGE_MIRROR_CONCURRENCY?.trim();
  if (!configured) return DEFAULT_MIRROR_CONCURRENCY;
  const raw = Number(configured);
  if (!Number.isFinite(raw) || raw < 1) return DEFAULT_MIRROR_CONCURRENCY;
  return Math.min(Math.floor(raw), 12);
}
