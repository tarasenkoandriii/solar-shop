import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RateLimitService } from '../rate-limit/rate-limit.service';

// За прямим запитом користувача — "привязать отзывы к покупке - один
// отзыв на каждую позицию в составе проекта, при оставлении отзыва
// фиксировать количество купленных единиц и сколько прошло времени от
// покупки. Допускается редактировать (пересчитывать сколько прошло от
// покупки) и удалять отзывы (самим покупателем только)".
//
// Прив'язка ЗМІНЕНА з (productId, userId) на КОНКРЕТНУ позицію
// замовлення (orderItemId, унікальна) — покупець, що замовляв той
// самий товар у ДВОХ окремих замовленнях, тепер може лишити ДВА
// окремих відгуки (досвід міг відрізнятись з часом), не один
// "загальний" на товар.
export interface ProductReviewAggregate {
  reviewCount: number;
  avgReliabilityScore: number | null;
}

const MS_PER_DAY = 1000 * 60 * 60 * 24;

@Injectable()
export class ProductReviewService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly rateLimit: RateLimitService,
  ) {}

  // Один запит одразу на всі товари — уникає N+1 у каталозі/картці
  // товару. Той самий підхід, що вже getAggregatesForPrograms().
  async getAggregatesForProducts(productIds: string[]): Promise<Record<string, ProductReviewAggregate>> {
    if (productIds.length === 0) return {};

    const grouped = await this.prisma.client.productReview.groupBy({
      by: ['productId'],
      where: { productId: { in: productIds } },
      _count: { _all: true },
      _avg: { reliabilityScore: true },
    });

    const result: Record<string, ProductReviewAggregate> = {};
    for (const g of grouped) {
      result[g.productId] = { reviewCount: g._count._all, avgReliabilityScore: g._avg.reliabilityScore };
    }
    return result;
  }

  // За прямим запитом користувача — знімки quantityAtReview/
  // daysSincePurchaseAtReview показуються ПУБЛІЧНО (це і є сенс їх
  // фіксації — контекст покупки в самому відгуці), АЛЕ userId НІКОЛИ
  // не повертається явним полем — той самий принцип анонімності, що
  // вже для відгуків про програми кредитування. `requestingUserId`
  // (опційний, з поточної сесії) — лише для прапорця `isMine`, щоб
  // фронтенд міг показати кнопки "редагувати"/"видалити" ТІЛЬКИ на
  // власних відгуках, не розкриваючи чужий userId.
  async findPublicReviewsForProduct(productId: string, requestingUserId?: string) {
    const reviews = await this.prisma.client.productReview.findMany({
      where: { productId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        reliabilityScore: true,
        reviewText: true,
        reviewTextStatus: true,
        quantityAtReview: true,
        daysSincePurchaseAtReview: true,
        createdAt: true,
        userId: true,
      },
    });
    return reviews.map((r) => ({
      id: r.id,
      reliabilityScore: r.reliabilityScore,
      reviewText: r.reviewTextStatus === 'APPROVED' ? r.reviewText : null,
      reviewTextStatus: r.reviewTextStatus,
      quantityAtReview: r.quantityAtReview,
      daysSincePurchaseAtReview: r.daysSincePurchaseAtReview,
      createdAt: r.createdAt,
      isMine: requestingUserId !== undefined && r.userId === requestingUserId,
    }));
  }

  // За прямим запитом користувача — "добавить парсер отзывов на
  // товары... показать отзывы на нашем сайте с указанием источника
  // отзыва". ОКРЕМИЙ метод (не змішується з findPublicReviewsForProduct
  // вище) — явне розділення на фронтенді за рівнем довіри
  // (верифікована покупка vs спарсено із зовнішнього джерела).
  // Простий read через спільний PrismaService — НЕ через
  // ParserModule (де реалізовано сам імпорт), щоб уникнути циклічної
  // залежності модулів (ParserModule вже імпортує ProductsModule).
  async findImportedReviewsForProduct(productId: string) {
    return this.prisma.client.importedProductReview.findMany({
      where: { productId },
      orderBy: { scrapedAt: 'desc' },
      select: {
        id: true,
        vendorName: true,
        sourceUrl: true,
        authorName: true,
        ratingNormalized: true,
        reviewText: true,
        publishedAtRaw: true,
      },
    });
  }

  // За прямим запитом користувача — "добавить парсер отзывов..." —
  // адмінський перегляд/видалення. На відміну від verified-purchase
  // відгуків (де текст модерується ПЕРЕД публікацією) — імпортовані
  // відгуки публікуються одразу (це вже опублікований, публічний
  // контент із сайту-джерела, не наш UGC, що потребує захисту від
  // спаму) — АЛЕ можливість видалити ОКРЕМИЙ запис критична: чесно
  // позначена невпевненість у селекторах 3 з 4 адаптерів (розділ
  // README) робить помилковий парсинг (спарсено НЕ відгук, а якийсь
  // нерелевантний текст) цілком імовірним на практиці.
  findAllImportedReviewsForAdmin() {
    return this.prisma.client.importedProductReview.findMany({
      orderBy: { scrapedAt: 'desc' },
      include: { product: { select: { name: true } } },
    });
  }

  async deleteImportedReview(id: string) {
    const review = await this.prisma.client.importedProductReview.findUnique({ where: { id } });
    if (!review) throw new NotFoundException('Review not found');
    await this.prisma.client.importedProductReview.delete({ where: { id } });
    return { ok: true };
  }

  // За прямим запитом користувача — "один отзыв на каждую позицию".
  // Позиції (OrderItem) цього товару для користувача, що ЩЕ НЕ мають
  // відгуку — фронтенд пропонує форму окремо для КОЖНОЇ такої позиції,
  // не одну загальну форму на товар.
  async getReviewableOrderItems(userId: string, productId: string) {
    const items = await this.prisma.client.orderItem.findMany({
      where: {
        productId,
        review: null,
        order: { userId, status: { not: 'CANCELLED' } },
      },
      include: { order: { select: { createdAt: true } } },
      orderBy: { order: { createdAt: 'desc' } },
    });
    return items.map((i) => ({
      orderItemId: i.id,
      quantity: i.quantity,
      purchasedAt: i.order.createdAt,
    }));
  }

  // Перевірка: конкретний OrderItem реально належить userId, товар не
  // скасований, ще не має відгуку — набагато точніше за попередню
  // перевірку "хоч якесь замовлення цього товару взагалі".
  async createReview(
    userId: string,
    productId: string,
    dto: { orderItemId: string; reliabilityScore: number; reviewText?: string },
  ) {
    const orderItem = await this.prisma.client.orderItem.findUnique({
      where: { id: dto.orderItemId },
      include: { order: true, review: true },
    });
    if (!orderItem || orderItem.productId !== productId) {
      throw new NotFoundException('Позицію замовлення не знайдено для цього товару');
    }
    if (orderItem.order.userId !== userId) {
      throw new ForbiddenException('Ця позиція замовлення належить іншому користувачу');
    }
    if (orderItem.order.status === 'CANCELLED') {
      throw new ForbiddenException('Замовлення скасовано — відгук про цю позицію лишити не можна');
    }
    if (orderItem.review) {
      throw new ConflictException('Ви вже залишали відгук про цю позицію замовлення');
    }

    // Той самий rate-limit підхід, що вже для відгуків про програми
    // кредитування — ключ по (userId, orderItemId), не по IP.
    await this.rateLimit.checkAndIncrement(`product-review:${userId}:${dto.orderItemId}`, 1, 3600);

    const daysSincePurchase = Math.floor((Date.now() - orderItem.order.createdAt.getTime()) / MS_PER_DAY);

    return this.prisma.client.productReview.create({
      data: {
        productId,
        userId,
        orderItemId: dto.orderItemId,
        quantityAtReview: orderItem.quantity,
        daysSincePurchaseAtReview: Math.max(0, daysSincePurchase),
        reliabilityScore: dto.reliabilityScore,
        reviewText: dto.reviewText,
        reviewTextStatus: dto.reviewText ? 'PENDING' : 'APPROVED',
      },
    });
  }

  // За прямим запитом користувача — "допускается редактировать
  // (пересчитывать сколько прошло от покупки)... самим покупателем
  // только". daysSincePurchaseAtReview ЗАВЖДИ перераховується заново
  // при редагуванні (не бере значення з dto — користувач не може
  // вписати довільне число, лише реальний перерахунок від справжньої
  // дати замовлення). Якщо текст змінено — статус модерації скидається
  // на PENDING знову (та сама логіка, що вже для програм кредитування
  // — новий текст потребує повторної модерації).
  async updateReview(
    userId: string,
    reviewId: string,
    dto: { reliabilityScore?: number; reviewText?: string },
  ) {
    const review = await this.prisma.client.productReview.findUnique({
      where: { id: reviewId },
      include: { orderItem: { include: { order: true } } },
    });
    if (!review) throw new NotFoundException('Review not found');
    if (review.userId !== userId) {
      throw new ForbiddenException('Редагувати можна лише власний відгук');
    }

    const daysSincePurchase = Math.floor((Date.now() - review.orderItem.order.createdAt.getTime()) / MS_PER_DAY);
    const textChanged = dto.reviewText !== undefined && dto.reviewText !== review.reviewText;

    return this.prisma.client.productReview.update({
      where: { id: reviewId },
      data: {
        reliabilityScore: dto.reliabilityScore ?? review.reliabilityScore,
        reviewText: dto.reviewText ?? review.reviewText,
        reviewTextStatus: textChanged ? (dto.reviewText ? 'PENDING' : 'APPROVED') : review.reviewTextStatus,
        daysSincePurchaseAtReview: Math.max(0, daysSincePurchase),
      },
    });
  }

  // За прямим запитом користувача — "удалять отзывы (самим покупателем
  // только)".
  async deleteReview(userId: string, reviewId: string) {
    const review = await this.prisma.client.productReview.findUnique({ where: { id: reviewId } });
    if (!review) throw new NotFoundException('Review not found');
    if (review.userId !== userId) {
      throw new ForbiddenException('Видалити можна лише власний відгук');
    }
    await this.prisma.client.productReview.delete({ where: { id: reviewId } });
    return { ok: true };
  }

  // ---- Адмін-модерація тексту (той самий патерн, що для програм кредитування) ----

  findPendingTexts() {
    return this.prisma.client.productReview.findMany({
      where: { reviewTextStatus: 'PENDING' },
      orderBy: { createdAt: 'asc' },
      include: { product: { select: { name: true } } },
    });
  }

  private async getReviewOr404(id: string) {
    const review = await this.prisma.client.productReview.findUnique({ where: { id } });
    if (!review) throw new NotFoundException('Review not found');
    return review;
  }

  async approveText(id: string) {
    await this.getReviewOr404(id);
    return this.prisma.client.productReview.update({ where: { id }, data: { reviewTextStatus: 'APPROVED' } });
  }

  async rejectText(id: string) {
    await this.getReviewOr404(id);
    return this.prisma.client.productReview.update({ where: { id }, data: { reviewTextStatus: 'REJECTED' } });
  }
}
