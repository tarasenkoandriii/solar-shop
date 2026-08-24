import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { titleSimilarity } from '@solar-shop/db';
import { PrismaService } from '../prisma/prisma.service';

// За прямим запитом користувача — "сохранять сырые категории с сайтов и
// матчить с существующими на сайте, если явного соответствия нет
// добавить категорию на модерацию в админке с указанием сколько товарів
// ждут эту категорию, при успешной модерации менять на новую у всех
// этих товаров".
//
// Той самий поріг, що вже застосований для siblings-матчингу товарів
// (MATCH_AUTO_THRESHOLD у packages/db/src/matching.ts) — тут своя,
// окрема константа, бо це принципово інша задача (категорія, не товар),
// хоч і той самий алгоритм (titleSimilarity, біграмне схожість Жаккара).
const CATEGORY_MATCH_THRESHOLD = 0.5;

@Injectable()
export class CategoryService {
  private readonly logger = new Logger(CategoryService.name);

  constructor(private readonly prisma: PrismaService) {}

  // Публічний список — для клієнтського сайту (тільки APPROVED) і для
  // адмінки (усі, разом з PENDING/REJECTED).
  async findAll(onlyApproved = false) {
    return this.prisma.client.category.findMany({
      where: onlyApproved ? { status: 'APPROVED' } : undefined,
      orderBy: { key: 'asc' },
    });
  }

  // Адмінська черга модерації — категорії зі статусом PENDING, разом із
  // РЕАЛЬНОЮ кількістю товарів, що на неї вже посилаються (не
  // денормалізований лічильник — рахуємо наживо, щоб не розсинхронитись
  // з фактичним станом Product).
  async findPendingWithCounts() {
    const pending = await this.prisma.client.category.findMany({ where: { status: 'PENDING' }, orderBy: { createdAt: 'asc' } });
    return Promise.all(
      pending.map(async (c) => ({
        ...c,
        waitingProductCount: await this.prisma.client.product.count({ where: { category: c.key } }),
      })),
    );
  }

  // Головна точка входу з парсера — за siteCategoryLabel (як сторінка
  // сама показує категорію) визначає, ЯКИЙ ключ категорії призначити
  // товару. Три випадки:
  // 1. siteCategoryLabel відсутній (адаптер не зміг витягти H1/
  //    breadcrumb) — довіряємо internalKey як є, без модерації.
  // 2. siteCategoryLabel добре збігається (>= CATEGORY_MATCH_THRESHOLD)
  //    з очікуваною категорією (internalKey) — усе гаразд, повертаємо
  //    internalKey.
  // 3. Розбіжність — можливо, вендор перейменував категорію, або це
  //    взагалі щось інше. Шукаємо/створюємо PENDING Category зі слагом
  //    від siteCategoryLabel і повертаємо ЙОГО ключ замість
  //    internalKey — товар піде в чергу "чекає модерації категорії".
  async resolveCategoryKey(internalKey: string, siteCategoryLabel: string | undefined | null): Promise<string> {
    if (!siteCategoryLabel) return internalKey;

    const expected = await this.prisma.client.category.findUnique({ where: { key: internalKey } });
    if (expected) {
      const bestScore = Math.max(
        titleSimilarity(siteCategoryLabel, expected.nameUk),
        titleSimilarity(siteCategoryLabel, expected.nameRu),
        titleSimilarity(siteCategoryLabel, expected.nameEn),
      );
      if (bestScore >= CATEGORY_MATCH_THRESHOLD) return internalKey;
    }

    // Розбіжність — шукаємо серед УСІХ категорій (не тільки очікуваної),
    // раптом siteCategoryLabel насправді добре збігається з ІНШОЮ вже
    // відомою категорією (напр. вендор показав "Акумулятори" на
    // сторінці, яку ми зайшли шукати як CONTROLLER — малоймовірно, але
    // не виключено при зміні структури сайту).
    const allCategories = await this.prisma.client.category.findMany();
    let best: { key: string; score: number } | null = null;
    for (const c of allCategories) {
      const score = Math.max(titleSimilarity(siteCategoryLabel, c.nameUk), titleSimilarity(siteCategoryLabel, c.nameRu), titleSimilarity(siteCategoryLabel, c.nameEn));
      if (!best || score > best.score) best = { key: c.key, score };
    }
    if (best && best.score >= CATEGORY_MATCH_THRESHOLD) return best.key;

    // Жодного впевненого збігу — це кандидат на нову категорію.
    const slug = slugifyLabel(siteCategoryLabel);
    const existingPending = await this.prisma.client.category.findUnique({ where: { key: slug } });
    if (existingPending) return existingPending.key;

    console.log(`[CategoryService] Нова, невпізнана категорія "${siteCategoryLabel}" (очікувалась "${internalKey}") — створюю запис на модерацію (key: ${slug}).`);
    const created = await this.prisma.client.category.create({
      data: {
        key: slug,
        nameUk: siteCategoryLabel,
        nameRu: siteCategoryLabel,
        nameEn: siteCategoryLabel,
        articleNumberPrefix: slug.slice(0, 4).toUpperCase(),
        status: 'PENDING',
      },
    });
    return created.key;
  }

  private async getOr404(id: string) {
    const category = await this.prisma.client.category.findUnique({ where: { id } });
    if (!category) throw new NotFoundException('Category not found');
    return category;
  }

  // «Затвердити як нову категорію» — товари вже посилаються на key
  // (він не змінюється при переході з PENDING в APPROVED), тому жодного
  // ретроактивного оновлення товарів не потрібно, лише зміна статусу +
  // фінальні переклади назв (адмін міг відредагувати перед підтвердженням).
  async approveAsNew(id: string, nameUk: string, nameRu: string, nameEn: string, articleNumberPrefix: string) {
    await this.getOr404(id);
    return this.prisma.client.category.update({
      where: { id },
      data: { status: 'APPROVED', nameUk, nameRu, nameEn, articleNumberPrefix },
    });
  }

  // «Це насправді вже існуюча категорія» — за прямим запитом
  // користувача ("при успешной модерации менять на новую у всех этих
  // товаров"): усі Product із category = pending.key переносяться на
  // category = target.key, PENDING-запис видаляється (більше не
  // потрібен — товари вже переїхали).
  async mergeIntoExisting(pendingId: string, targetCategoryId: string) {
    const pending = await this.getOr404(pendingId);
    const target = await this.getOr404(targetCategoryId);

    const { count } = await this.prisma.client.product.updateMany({
      where: { category: pending.key },
      data: { category: target.key },
    });
    console.log(`[CategoryService] Злиття категорії "${pending.nameUk}" (${pending.key}) → "${target.nameUk}" (${target.key}): оновлено ${count} товарів.`);

    await this.prisma.client.category.delete({ where: { id: pendingId } });
    return { mergedProductCount: count };
  }

  async reject(id: string) {
    await this.getOr404(id);
    return this.prisma.client.category.update({ where: { id }, data: { status: 'REJECTED' } });
  }
}

function slugifyLabel(label: string): string {
  return (
    label
      .toUpperCase()
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^A-ZА-ЯЁІЇЄ0-9]+/gi, '_')
      .replace(/(^_|_$)/g, '')
      .slice(0, 40) || `CATEGORY_${Date.now()}`
  );
}
