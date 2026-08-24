import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Prisma, titleSimilarity } from '@solar-shop/db';
import { PrismaService } from '../prisma/prisma.service';
import { GrokService } from '../grok/grok.service';
import { fetchWithRetry } from '../common/fetch-with-retry';
import { fetchOgImage } from '../common/og-image-fetcher';

// За прямим запитом користувача — "импорт экспорт... через compacted
// json". Один спільний тип для export/import — уникає потрійного
// дублювання того самого довгого об'єктного типу в сигнатурах методів.
interface ExportedProgram {
  name: string;
  eligibility: string;
  description: string;
  url: string;
  discoverySourceUrl: string | null;
  minLoanUsd: number | null;
  maxLoanUsd: number | null;
  imageUrl: string | null;
  status: string;
  countryCode: string;
}

// ТЗ п.32.1 — список тем-затравок настраивается (не хардкод в коде), но
// отдельная админ-CRUD для списка тем — избыточно ради того, чтобы его
// можно было передать явно при ручном запуске из админки (см. контроллер);
// это значение — только дефолт для суточного крона.
const DEFAULT_SEED_TOPICS = [
  'кредит на сонячні панелі Україна',
  'державна програма енергонезалежність',
  'ГрінДІМ умови',
  'СвітлоDIM програма',
  'Доступні кредити 5-7-9 сонячні панелі',
  'Ощадбанк Енергонезалежність кредит',
];

const RECHECK_THRESHOLD_DAYS = 30;

@Injectable()
export class FinancingService {
  private readonly logger = new Logger(FinancingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly grok: GrokService,
  ) {}

  // За прямим запитом користувача (розділ README про переніс у спільний
  // модуль) — fetchOgImage() (та вся допоміжна логіка: fetchOgImageLight/
  // fetchOgImageWithBrowser/extractImageFromHtml) перенесено в
  // apps/api/src/common/og-image-fetcher.ts — той самий, вже перевірений
  // на реальному прогоні (oschadbank.ua, Incapsula bypass) шлях тепер
  // переюзаний і в ArticlesService (fallback, коли RSS не дав картинку),
  // не задубльований копіпастою.


  // ---- Публичная страница /financing (ТЗ п.32.3) ----

  // Для сторінки відгуків конкретного банку — за прямим запитом
  // користувача ("новая страница отзывов"). NotFoundException для
  // неопублікованої/неіснуючої програми, той самий принцип, що й решта
  // публічних findOne-методів у проєкті.
  async findOnePublished(id: string) {
    const program = await this.prisma.client.financingProgram.findFirst({ where: { id, status: 'PUBLISHED' } });
    if (!program) throw new NotFoundException('Financing program not found');
    return program;
  }

  findPublished(filters: { eligibility?: string; minAmountUsd?: number; maxAmountUsd?: number; sort?: string }) {
    return this.prisma.client.financingProgram.findMany({
      where: {
        status: 'PUBLISHED',
        ...(filters.eligibility ? { eligibility: { contains: filters.eligibility, mode: 'insensitive' } } : {}),
        ...(filters.minAmountUsd !== undefined ? { maxLoanUsd: { gte: filters.minAmountUsd } } : {}),
        ...(filters.maxAmountUsd !== undefined ? { minLoanUsd: { lte: filters.maxAmountUsd } } : {}),
      },
      orderBy:
        filters.sort === 'amount_desc'
          ? { maxLoanUsd: 'desc' }
          : filters.sort === 'name'
            ? { name: 'asc' }
            : { lastVerifiedAt: 'desc' },
    });
  }

  // ---- Додаток 1 бизнес-плана (ТЗ п.31.11.2) — детерминированный SQL-фильтр ----

  async findForBusinessPlan(creditAmountUsd: number, clientType: string) {
    const all = await this.prisma.client.financingProgram.findMany({ where: { status: 'PUBLISHED' } });
    return all.filter((p) => {
      const inRange =
        (p.minLoanUsd === null || Number(p.minLoanUsd) <= creditAmountUsd) &&
        (p.maxLoanUsd === null || Number(p.maxLoanUsd) >= creditAmountUsd);
      const eligible = p.eligibility.toLowerCase().includes(clientType.toLowerCase());
      return inRange && eligible;
    });
  }

  // ---- Админка ----

  // За прямим запитом користувача — "в повторном поиске программ
  // кредитования нет защиты от дубликатов". Реальний скріншот показав:
  // старий фікс (розділ вище — пошук по url) НЕ ловить цей клас
  // дублікатів — Grok знайшов ту саму ініціативу під ІНШИМИ URL
  // (підсторінки джерела для різних цільових аудиторій:
  // energycredit.bdf.gov.ua/for-osbb/, /for-houses/, замість головної
  // energycredit.bdf.gov.ua/). Свідомо НЕ автоматичне злиття/відхилення
  // — це МОЖЕ бути цінна деталізація (різні суми/умови для ОСББ vs
  // домогосподарств), не завжди сміттєвий дублікат — рішення залишено
  // за адміном, лише видиме попередження. Евристика: збіг ДОМЕНУ url
  // (сильний сигнал підсторінки того самого джерела) АБО висока
  // titleSimilarity (той самий алгоритм, що вже для siblings-матчингу
  // товарів/категорій, не новий) АБО пряме входження одного імені в
  // інше як підрядка (тут явно видно: "Доступні кредити 5-7-9%"
  // буквально входить у дужки нового імені).
  async findAllForAdmin(status?: string) {
    const programs = await this.prisma.client.financingProgram.findMany({
      where: status ? { status: status as never } : undefined,
      orderBy: { createdAt: 'desc' },
    });

    // ⚠️ Знайдено реальний баг у власній вчорашній реалізації — за
    // прямим запитом користувача ("нету ни отметки дубликата ни
    // возможности смерджить"). `programs` вище ВЖЕ відфільтрований по
    // `status` (якщо передано) — коли фронтенд запитує саме `status=
    // DRAFT` (типова вкладка "Чернетка (модерація)", саме вона на
    // реальному скріншоті), `programs` містить ЛИШЕ чернетки, і
    // `programs.filter(p => p.status === 'PUBLISHED')` на масиві З
    // САМИХ ЛИШЕ чернеток завжди повертав би порожній масив — звідси
    // "жодної позначки дубліката". Виправлено — ОКРЕМИЙ, БЕЗУМОВНИЙ
    // запит за ВСІМА PUBLISHED-записами, незалежно від того, який
    // фільтр застосований до відображуваного списку.
    const published = await this.prisma.client.financingProgram.findMany({ where: { status: 'PUBLISHED' as never } });

    return programs.map((p) => {
      if (p.status !== 'DRAFT') return { ...p, similarPublished: null };

      let draftHost: string | null = null;
      try {
        draftHost = new URL(p.url).hostname;
      } catch {
        draftHost = null;
      }

      const match = published.find((pub) => {
        if (pub.id === p.id) return false;
        let pubHost: string | null = null;
        try {
          pubHost = new URL(pub.url).hostname;
        } catch {
          pubHost = null;
        }
        const sameDomain = draftHost && pubHost && draftHost === pubHost;
        const nameContains = p.name.includes(pub.name) || pub.name.includes(p.name);
        const similar = titleSimilarity(p.name, pub.name) >= 0.4;
        return sameDomain || nameContains || similar;
      });

      return { ...p, similarPublished: match ? { id: match.id, name: match.name, url: match.url } : null };
    });
  }

  async publish(id: string) {
    await this.getOr404(id);
    return this.prisma.client.financingProgram.update({
      where: { id },
      data: { status: 'PUBLISHED', lastVerifiedAt: new Date(), needsRecheck: false },
    });
  }

  async archive(id: string) {
    await this.getOr404(id);
    return this.prisma.client.financingProgram.update({ where: { id }, data: { status: 'ARCHIVED' } });
  }

  // За прямим запитом користувача — "добавь действие для таких
  // случаев - спарсить фото". Ручний ретрай для ОДНІЄЇ конкретної
  // програми — на відміну від масового backfill (розділ README про
  // статті, аналогічний патерн), тут точковий контроль: адмін бачить
  // конкретну картку без фото й може одразу спробувати ще раз, не
  // чекаючи наступного повного прогону парсера.
  async refetchImage(id: string) {
    const program = await this.getOr404(id);
    const attempt = await fetchOgImage(program.url);
    if (!attempt.imageUrl) {
      throw new BadRequestException(`Не вдалося знайти картинку: ${attempt.diagnostic}`);
    }
    return this.prisma.client.financingProgram.update({
      where: { id },
      data: { imageUrl: attempt.imageUrl },
    });
  }

  // За запитом користувача — реальне видалення (не archive, який лише
  // ховає статус, а сам рядок лишається в базі й далі порушує унікальність
  // за url при наступному прогоні парсера). Потрібно для очищення
  // майже-дублікатів, що вже накопичились через баг зіставлення по
  // (name, url) замість url — виправлено вище, але старі дублікати самі
  // не зникнуть, їх треба прибрати вручну один раз.
  async remove(id: string) {
    await this.getOr404(id);
    await this.prisma.client.financingProgram.delete({ where: { id } });
  }

  // За прямим запитом користувача — "ни возможности смерджить".
  // Приймає targetId ЯВНО від фронтенду (не перераховуємо евристику
  // similarPublished знову на бекенді) — дає користувачу контроль,
  // якщо він вирішить об'єднати в ІНШУ запис, не обов'язково той, що
  // евристика авто-запропонувала. Оновлює PUBLISHED-запис даними з
  // DRAFT, потім видаляє DRAFT (дані вже перенесені — порожній
  // дублікат-чернетка сенсу не має).
  async merge(draftId: string, targetId: string) {
    const draft = await this.getOr404(draftId);
    const target = await this.getOr404(targetId);
    if (draft.status !== 'DRAFT') throw new BadRequestException('Об\'єднувати можна лише чернетку');
    if (target.status !== 'PUBLISHED') throw new BadRequestException('Ціль об\'єднання має бути опублікованою програмою');

    await this.prisma.client.financingProgram.update({
      where: { id: targetId },
      data: {
        eligibility: draft.eligibility,
        description: draft.description,
        minLoanUsd: draft.minLoanUsd ?? undefined,
        maxLoanUsd: draft.maxLoanUsd ?? undefined,
        imageUrl: target.imageUrl ?? draft.imageUrl ?? undefined,
        lastVerifiedAt: new Date(),
        lastSeenInParserAt: new Date(),
        needsRecheck: false,
      },
    });
    await this.prisma.client.financingProgram.delete({ where: { id: draftId } });
    return this.prisma.client.financingProgram.findUnique({ where: { id: targetId } });
  }

  async update(
    id: string,
    dto: Partial<{ name: string; eligibility: string; description: string; url: string; minLoanUsd: number; maxLoanUsd: number; imageUrl: string | null }>,
  ) {
    await this.getOr404(id);
    return this.prisma.client.financingProgram.update({ where: { id }, data: dto });
  }

  // ---- Суточный крон financing_program_parser (ТЗ п.32.1/32.2) ----

  // За запитом користувача — "слідкувати за актуальністю умов і оновлювати
  // клієнтський сайт при змінах": раніше повторне виявлення ІСНУЮЧОЇ
  // програми оновлювало ЛИШЕ lastSeenInParserAt — реальні умови
  // (description/eligibility/суми/картинка) НІКОЛИ не перезаписувались,
  // навіть якщо ІІ цього разу знайшов інші значення. Тепер — явне
  // порівняння поле-за-полем, реальне оновлення БД при розбіжності
  // (клієнтський сайт читає ці ж поля напряму — жодного окремого кроку
  // "оновити сайт" не потрібно, апдейт у БД вже й є оновленням сайту на
  // наступному завантаженні сторінки). changed[] у результаті — видимий
  // список того, що саме змінилося, для аудиту в debugLog.
  async runParser(seedTopics?: string[]): Promise<{
    found: number;
    created: number;
    updated: number;
    changed: string[];
    imagesBackfilled: number;
    imageDiagnostics: { name: string; url: string; diagnostic: string }[];
    flaggedForRecheck: number;
    errors: string[];
  }> {
    const topics = seedTopics && seedTopics.length > 0 ? seedTopics : DEFAULT_SEED_TOPICS;
    const result = {
      found: 0,
      created: 0,
      updated: 0,
      changed: [] as string[],
      imagesBackfilled: 0,
      imageDiagnostics: [] as { name: string; url: string; diagnostic: string }[],
      flaggedForRecheck: 0,
      errors: [] as string[],
    };

    const candidates = await this.grok.searchFinancingPrograms(topics);
    if ('error' in candidates) {
      result.errors.push(candidates.error);
      return result;
    }
    result.found = candidates.length;

    for (const c of candidates) {
      try {
        // Знайдено 19.08.2026 на реальному прогоні (скріншот адмінки з
        // купою майже-дублікатів): пошук по (name, url) створював НОВИЙ
        // запис щоразу, коли ІІ хоч трохи по-іншому назвав ту саму
        // програму між прогонами ("Моя енергонезалежність" ↔ "Джерела
        // енергії" ↔ їхнє злиття в різному порядку — той самий url
        // oschadbank.ua/privatbank.ua щоразу). Правильний ключ
        // ідентичності програми — url сам по собі (реальна сторінка
        // джерела), не назва (яку ІІ генерує нестабільно). Свідомо НЕ
        // змінюю `@@unique([name, url])` у схемі — це вимагало б `prisma
        // db push` з уже наявними дублікатами urls в реальній базі, що
        // впало б при наступному старті контейнера (порушення
        // constraint). Замість цього — пошук через findFirst по url,
        // без зміни схеми.
        const existing = await this.prisma.client.financingProgram.findFirst({
          where: { url: c.url },
        });

        if (existing) {
          const fieldsDiffer =
            existing.name !== c.name ||
            existing.eligibility !== c.eligibility ||
            existing.description !== c.description ||
            Number(existing.minLoanUsd ?? NaN) !== (c.minLoanUsd ?? NaN) ||
            Number(existing.maxLoanUsd ?? NaN) !== (c.maxLoanUsd ?? NaN);
          // Картинку підтягуємо, лише якщо своєї ще немає — не
          // перезаписуємо вручну вибрану/перевірену адміном картинку
          // щоразу (могло б смикати картинку туди-сюди між прогонами без
          // реальної причини). Реальний HTTP-запит + парсинг og:image
          // (fetchOgImage) робимо ЛИШЕ коли справді потрібно (нема чого
          // підтягувати) — не витрачаємо зайвий запит на кожну програму
          // щоразу.
          let fetchedImageUrl: string | null = null;
          if (!existing.imageUrl) {
            const attempt = await fetchOgImage(c.url);
            fetchedImageUrl = attempt.imageUrl;
            result.imageDiagnostics.push({ name: c.name, url: c.url, diagnostic: attempt.diagnostic });
          }
          const shouldBackfillImage = !!fetchedImageUrl;

          if (fieldsDiffer || shouldBackfillImage) {
            const baseUpdateData = {
              eligibility: c.eligibility,
              description: c.description,
              minLoanUsd: c.minLoanUsd ?? undefined,
              maxLoanUsd: c.maxLoanUsd ?? undefined,
              ...(shouldBackfillImage ? { imageUrl: fetchedImageUrl } : {}),
              lastVerifiedAt: new Date(),
              lastSeenInParserAt: new Date(),
              needsRecheck: false,
            };
            try {
              await this.prisma.client.financingProgram.update({
                where: { id: existing.id },
                data: { name: c.name, ...baseUpdateData },
              });
            } catch (err) {
              // Знайдено 19.08.2026 на реальному прогоні: `@@unique([name,
              // url])` СВІДОМО не змінювався (розділ 44 — ризик зламати
              // старт контейнера при db push проти вже наявних
              // дублікатів). Але поки старі майже-дублікати (з різними
              // назвами під тим самим url) не прибрані вручну — оновлення
              // імені цього запису іноді натикається на ІНШИЙ старий
              // дублікат, що вже має ту саму (name, url) пару, яку зараз
              // повернув ІІ. P2002 тут — не критична помилка, просто
              // конфлікт з ще неприбраним старим сміттям: повторюємо БЕЗ
              // зміни імені (решта полів все одно оновлюється), не
              // валимо весь прогін через це.
              if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
                this.logger.warn(`Оновлення імені "${existing.name}" → "${c.name}" конфліктує зі старим дублікатом (url: ${c.url}) — оновлюю решту полів без зміни імені. Приберіть дублікати вручну через "Видалити назавжди".`);
                await this.prisma.client.financingProgram.update({
                  where: { id: existing.id },
                  data: baseUpdateData,
                });
              } else {
                throw err;
              }
            }
            if (fieldsDiffer) result.changed.push(c.name);
            if (shouldBackfillImage) result.imagesBackfilled++;
          } else {
            await this.prisma.client.financingProgram.update({
              where: { id: existing.id },
              data: { lastSeenInParserAt: new Date(), needsRecheck: false },
            });
          }
          result.updated++;
        } else {
          const attempt = await fetchOgImage(c.url);
          result.imageDiagnostics.push({ name: c.name, url: c.url, diagnostic: attempt.diagnostic });
          await this.prisma.client.financingProgram.create({
            data: {
              name: c.name,
              eligibility: c.eligibility,
              description: c.description,
              url: c.url,
              discoverySourceUrl: c.discoverySourceUrl ?? undefined,
              minLoanUsd: c.minLoanUsd ?? undefined,
              maxLoanUsd: c.maxLoanUsd ?? undefined,
              imageUrl: attempt.imageUrl ?? undefined,
              status: 'DRAFT',
              lastSeenInParserAt: new Date(),
            },
          });
          // Знайдено 19.08.2026: лічильник imagesBackfilled раніше
          // інкрементувався ЛИШЕ у гілці "оновлення існуючого запису" —
          // для щойно СТВОРЕНОГО запису з успішно знайденою картинкою
          // (attempt.imageUrl) лічильник мовчки нічого не рахував, попри
          // те, що картинка РЕАЛЬНО зберігалась у БД (diagnostic "OK",
          // сама картинка на сайті — це підтверджує). Суто косметичний
          // баг підрахунку, не функціональний — але вводив в оману
          // ("0 картинок підтягнуто" при тому, що одна явно спрацювала).
          if (attempt.imageUrl) result.imagesBackfilled++;
          result.created++;
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        this.logger.error(`Failed to upsert financing program "${c.name}": ${message}`);
        result.errors.push(`${c.name}: ${message}`);
      }
    }

    const staleCutoff = new Date(Date.now() - RECHECK_THRESHOLD_DAYS * 24 * 60 * 60 * 1000);
    const flagged = await this.prisma.client.financingProgram.updateMany({
      where: {
        status: 'PUBLISHED',
        needsRecheck: false,
        OR: [{ lastSeenInParserAt: null }, { lastSeenInParserAt: { lt: staleCutoff } }],
      },
      data: { needsRecheck: true },
    });
    result.flaggedForRecheck = flagged.count;

    return result;
  }

  // За прямим запитом користувача — "сделай импорт экспорт полного
  // списка (включительно с кандидатами) программ кредитования через
  // compacted json". Той самий принцип, що вже реалізований для карти
  // потенціалу (`SolarMapService.exportData()`/`importData()`) —
  // ідемпотентний upsert по натуральному ключу, тут це `url` (той
  // самий ключ, що вже використовується парсером, розділ README про
  // фікс дублікатів). Об'єктний формат, не tuple — на відміну від
  // карти потенціалу (тисячі точок, де економія кожного байту мала
  // значення), тут десятки записів з БАГАТЬМА текстовими полями —
  // читабельність важливіша за граничну компактність. "Включительно с
  // кандидатами" — усі статуси разом (DRAFT/PUBLISHED/ARCHIVED), не
  // лише опубліковані, як явно попросив користувач.
  async exportData(): Promise<{ formatVersion: 1; exportedAt: string; programs: ExportedProgram[] }> {
    const rows = await this.prisma.client.financingProgram.findMany({ orderBy: { createdAt: 'asc' } });
    return {
      formatVersion: 1,
      exportedAt: new Date().toISOString(),
      programs: rows.map((r) => ({
        name: r.name,
        eligibility: r.eligibility,
        description: r.description,
        url: r.url,
        discoverySourceUrl: r.discoverySourceUrl,
        minLoanUsd: r.minLoanUsd ? Number(r.minLoanUsd) : null,
        maxLoanUsd: r.maxLoanUsd ? Number(r.maxLoanUsd) : null,
        imageUrl: r.imageUrl,
        status: r.status,
        countryCode: r.countryCode,
      })),
    };
  }

  async importData(payload: unknown): Promise<{ created: number; updated: number; errors: string[] }> {
    const data = this.validateImportPayload(payload);
    const result = { created: 0, updated: 0, errors: [] as string[] };

    for (const p of data.programs) {
      try {
        const existing = await this.prisma.client.financingProgram.findFirst({ where: { url: p.url } });
        const fields = {
          name: p.name,
          eligibility: p.eligibility,
          description: p.description,
          discoverySourceUrl: p.discoverySourceUrl ?? undefined,
          minLoanUsd: p.minLoanUsd ?? undefined,
          maxLoanUsd: p.maxLoanUsd ?? undefined,
          imageUrl: p.imageUrl ?? undefined,
          status: p.status as never,
          countryCode: p.countryCode ?? 'UA',
        };
        if (existing) {
          await this.prisma.client.financingProgram.update({ where: { id: existing.id }, data: fields });
          result.updated++;
        } else {
          await this.prisma.client.financingProgram.create({ data: { ...fields, url: p.url } });
          result.created++;
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        result.errors.push(`${p.name} (${p.url}): ${message}`);
      }
    }

    return result;
  }

  // Валідація структурою (не class-validator DTO — динамічний список
  // полів однакового типу, DTO-клас був би громіздким без додаткової
  // користі, той самий підхід, що вже застосований для
  // SolarMapService.validateImportPayload()) — `unknown` коректно
  // проходить через global ValidationPipe, не обходить його мовчки.
  private validateImportPayload(payload: unknown): { programs: ExportedProgram[] } {
    if (!payload || typeof payload !== 'object' || !Array.isArray((payload as { programs?: unknown }).programs)) {
      throw new BadRequestException('Невалідний формат: очікується { programs: [...] }');
    }
    const programs = (payload as { programs: unknown[] }).programs;
    for (const p of programs) {
      if (!p || typeof p !== 'object' || typeof (p as { name?: unknown }).name !== 'string' || typeof (p as { url?: unknown }).url !== 'string') {
        throw new BadRequestException('Кожна програма має містити принаймні name та url рядками');
      }
    }
    return { programs: programs as ExportedProgram[] };
  }

  private async getOr404(id: string) {
    const program = await this.prisma.client.financingProgram.findUnique({ where: { id } });
    if (!program) throw new NotFoundException('Financing program not found');
    return program;
  }
}
