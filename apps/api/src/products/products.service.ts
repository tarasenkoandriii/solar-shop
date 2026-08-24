import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, ProductStatus } from '@solar-shop/db';
import { PrismaService } from '../prisma/prisma.service';
import { QueryProductsDto } from './dto/query-products.dto';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductPricingService } from './product-pricing.service';
import { ProductReviewService } from './product-review.service';

function slugify(name: string, suffix: string): string {
  return (
    name
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '') +
    '-' +
    suffix.toLowerCase()
  );
}

@Injectable()
export class ProductsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly pricing: ProductPricingService,
    private readonly reviews: ProductReviewService,
  ) {}

  // Каталог (ТЗ п.3.2) — читает исключительно кэш-поля Product
  // (cachedPriceUsd/cachedInStock/...), без джойна на SourceListing на
  // каждый запрос (см. комментарий на Product в schema.prisma).
  async findAll(query: QueryProductsDto) {
    const page = query.page ?? 1;
    const pageSize = Math.min(query.pageSize ?? 12, 60);

    const where: Prisma.ProductWhereInput = { status: ProductStatus.PUBLISHED };

    if (query.category) where.category = query.category;
    if (query.manufacturerId?.length) where.manufacturerId = { in: query.manufacturerId };
    if (query.inStockOnly) where.cachedInStock = true;
    if (query.promoOnly) where.cachedIsPromo = true;

    if (query.type) where.specs = { path: ['type'], equals: query.type };
    if (query.chemistry) where.specs = { path: ['chemistry'], equals: query.chemistry };
    if (query.controllerType) where.specs = { path: ['controllerType'], equals: query.controllerType };

    // Базовый site search (ТЗ п.30.2) — по имени/артикулу/SKU производителя.
    // Полноценный pg_trgm-индекс требует raw SQL/migration extension; для
    // объёма каталога Фазы 2 обычный ILIKE через Prisma `contains` достаточен
    // и работает без миграций расширений Postgres — апгрейд до pg_trgm
    // фиксирую как задел в AUDIT.md, если каталог вырастет на порядок.
    if (query.q) {
      where.OR = [
        { name: { contains: query.q, mode: 'insensitive' } },
        { articleNumber: { contains: query.q, mode: 'insensitive' } },
        { manufacturerSku: { contains: query.q, mode: 'insensitive' } },
      ];
    }

    const orderBy: Prisma.ProductOrderByWithRelationInput =
      query.sort === 'price_asc'
        ? { cachedPriceUsd: 'asc' }
        : query.sort === 'price_desc'
          ? { cachedPriceUsd: 'desc' }
          : { createdAt: 'desc' };

    const [items, total] = await Promise.all([
      this.prisma.client.product.findMany({
        where,
        orderBy,
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: { manufacturer: true, images: { orderBy: { sortOrder: 'asc' } } },
      }),
      this.prisma.client.product.count({ where }),
    ]);

    return { items, total, page, pageSize, totalPages: Math.max(1, Math.ceil(total / pageSize)) };
  }

  // Карточка товара (ТЗ п.3.3/п.13.3/п.25.3) — здесь, в отличие от каталога,
  // нужна полная картина по siblings: города наличия объединены из кэша
  // (актуален после каждого recalculate), но конкретный самый дешёвый
  // листинг для кнопки "Купить"/"В корзину" всё равно берём отдельным
  // запросом — CartService должен знать listingId для снапшота цены.
  async findBySlug(slug: string) {
    const product = await this.prisma.client.product.findUnique({
      where: { slug },
      include: {
        manufacturer: true,
        images: { orderBy: { sortOrder: 'asc' } },
        listings: {
          include: { sourceListing: { include: { vendor: true } } },
        },
      },
    });
    if (!product || product.status !== ProductStatus.PUBLISHED) throw new NotFoundException('Product not found');

    // За прямим запитом користувача — "поле рекомендации (в основном
    // надёжность со скорингом на основе отзывов)". Один агрегатний
    // запит на 1 товар — не денормалізоване поле на Product (той самий
    // принцип, що вже reviewAggregate для програм кредитування —
    // рахується наживо, не розсинхронюється з реальним станом
    // відгуків).
    const aggregates = await this.reviews.getAggregatesForProducts([product.id]);
    return { ...product, reviewAggregate: aggregates[product.id] ?? { reviewCount: 0, avgReliabilityScore: null } };
  }

  // Используется CartService/OrderService при добавлении в корзину/чекауте
  // "Купить в 1 клик" — актуальный самый дешёвый listing в наличии (ТЗ п.13.3).
  async getCheapestInStockListing(productId: string) {
    const listings = await this.prisma.client.productListing.findMany({
      where: { productId, sourceListing: { inStock: true } },
      include: { sourceListing: true },
      orderBy: { sourceListing: { priceUsd: 'asc' } },
      take: 1,
    });
    return listings[0] ?? null;
  }

  // ---- Admin CRUD ----

  // За запитом користувача — "seed" тепер не окрема колонка на Product, а
  // обчислюється на льоту через приналежність листингів до Vendor.
  // excludeFromMatching (packages/db/prisma/seed.ts створює для цього
  // окремий "Демо-дані (seed)" вендор) — архітектурно логічніше, ніж
  // окремий прапорець, що дублював би те саме джерело істини.
  async findAllForAdmin() {
    const products = await this.prisma.client.product.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        manufacturer: true,
        images: { orderBy: { sortOrder: 'asc' } },
        listings: { include: { sourceListing: { include: { vendor: true } } } },
      },
    });

    return products.map((p) => ({
      ...p,
      isSeedData: p.listings.some((l) => l.sourceListing.vendor.excludeFromMatching),
    }));
  }

  async create(dto: CreateProductDto) {
    const articleNumber = await this.nextArticleNumber(dto.category);
    const slug = slugify(dto.name, articleNumber);

    const { images, isNew, ...rest } = dto;

    return this.prisma.client.product.create({
      data: {
        ...rest,
        category: dto.category,
        articleNumber,
        slug,
        specs: dto.specs as Prisma.InputJsonValue,
        cachedIsNew: isNew ?? false,
        images: { create: images.map((url, i) => ({ url, sortOrder: i })) },
      },
      include: { images: true },
    });
  }

  async update(id: string, dto: UpdateProductDto) {
    await this.getOr404(id);
    const { images, isNew, ...rest } = dto;

    if (images) {
      // Пересоздаём галерею целиком — проще и предсказуемее, чем diff
      // отдельных фото, для объёма Фазы 2 (drag&drop reorder — п.26.4,
      // задел на будущее, если понадобится точечный edit одной фотографии).
      await this.prisma.client.productImage.deleteMany({ where: { productId: id } });
    }

    return this.prisma.client.product.update({
      where: { id },
      data: {
        ...rest,
        specs: dto.specs as Prisma.InputJsonValue | undefined,
        cachedIsNew: isNew,
        images: images ? { create: images.map((url, i) => ({ url, sortOrder: i })) } : undefined,
      },
      include: { images: true },
    });
  }

  async remove(id: string) {
    await this.getOr404(id);
    await this.prisma.client.product.delete({ where: { id } });
    return { ok: true };
  }

  // Ручной триггер пересчёта кэша для одного товара (напр. после ручной
  // привязки siblings в модерации, ТЗ п.13.2) — используется modулем siblings.
  async recalculatePricing(id: string) {
    await this.pricing.recalculate(id);
    return this.prisma.client.product.findUnique({ where: { id } });
  }

  private async getOr404(id: string) {
    const product = await this.prisma.client.product.findUnique({ where: { id } });
    if (!product) throw new NotFoundException('Product not found');
    return product;
  }

  // За запитом користувача (категорії тепер таблиця, не жорсткий enum) —
  // префікс береться з Category.articleNumberPrefix замість
  // захардкодженого Record<ProductCategory,string>. Якщо категорія
  // раптом не знайдена (малоймовірно — dto.category вже пройшов повз
  // створення товару адміном, категорія мала існувати) — фолбек "XX",
  // не падаємо на порожньому місці.
  private async nextArticleNumber(category: string): Promise<string> {
    const seq = await this.prisma.client.articleNumberSequence.upsert({
      where: { category },
      create: { category, lastSeq: 1 },
      update: { lastSeq: { increment: 1 } },
    });
    const categoryRow = await this.prisma.client.category.findUnique({ where: { key: category } });
    const prefix = categoryRow?.articleNumberPrefix ?? 'XX';
    return `${prefix}-${String(seq.lastSeq).padStart(6, '0')}`;
  }
}
