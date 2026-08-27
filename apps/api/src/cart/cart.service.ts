import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ProductsService } from '../products/products.service';
import { roundToCents } from '../common/money';

@Injectable()
export class CartService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly products: ProductsService,
  ) {}

  private async getOrCreateCart(userId: string | null, sessionId: string | null) {
    if (userId) {
      const existing = await this.prisma.client.cart.findFirst({ where: { userId } });
      if (existing) return existing;
      return this.prisma.client.cart.create({ data: { userId } });
    }
    if (sessionId) {
      const existing = await this.prisma.client.cart.findFirst({ where: { sessionId } });
      if (existing) return existing;
      return this.prisma.client.cart.create({ data: { sessionId } });
    }
    throw new NotFoundException('Neither userId nor sessionId provided');
  }

  async getCart(userId: string | null, sessionId: string | null) {
    const cart = await this.getOrCreateCart(userId, sessionId);
    return this.getCartWithTotals(cart.id);
  }

  async addItem(userId: string | null, sessionId: string | null, productId: string, quantity = 1) {
    const cart = await this.getOrCreateCart(userId, sessionId);
    // Аудит 27.08.2026: тут стояв getCheapestInStockListing(), і в
    // priceSnapshot лягала ціна найдешевшого листинга — тобто наша
    // СОБІВАРТІСТЬ, тоді як вітрина показує cachedPriceUsd. Покупець бачив
    // одну ціну, а платив меншу. Розгорнуто — у ProductsService.getPurchaseTerms().
    const terms = await this.products.getPurchaseTerms(productId);
    if (!terms) throw new NotFoundException('Product has no in-stock listing right now');

    await this.prisma.client.cartItem.upsert({
      where: {
        cartId_productId_listingId: {
          cartId: cart.id,
          productId,
          listingId: terms.listingId,
        },
      },
      create: {
        cartId: cart.id,
        productId,
        listingId: terms.listingId,
        quantity,
        priceSnapshot: terms.priceUsd,
      },
      update: { quantity: { increment: quantity } },
    });

    return this.getCartWithTotals(cart.id);
  }

  async updateItemQuantity(cartItemId: string, quantity: number) {
    const item = await this.prisma.client.cartItem.findUnique({ where: { id: cartItemId } });
    if (!item) throw new NotFoundException('Cart item not found');
    await this.prisma.client.cartItem.update({ where: { id: cartItemId }, data: { quantity } });
    return this.getCartWithTotals(item.cartId);
  }

  async removeItem(cartItemId: string) {
    const item = await this.prisma.client.cartItem.findUnique({ where: { id: cartItemId } });
    if (!item) throw new NotFoundException('Cart item not found');
    await this.prisma.client.cartItem.delete({ where: { id: cartItemId } });
    return this.getCartWithTotals(item.cartId);
  }

  // Гостевая корзина мёрджится с корзиной пользователя при входе через
  // Telegram (ТЗ п.19.2) — вызывается из AuthService после успешного логина.
  async mergeGuestCartIntoUser(sessionId: string, userId: string): Promise<void> {
    const guestCart = await this.prisma.client.cart.findFirst({ where: { sessionId }, include: { items: true } });
    if (!guestCart || guestCart.items.length === 0) return;

    const userCart = await this.getOrCreateCart(userId, null);

    for (const item of guestCart.items) {
      // Знайдено при реальній Docker-збірці (не ловилось у пісочниці без
      // згенерованого Prisma Client): `listingId` — nullable поле
      // (`String?`), а складений унікальний ключ `cartId_productId_
      // listingId` у згенерованому Prisma-клієнті вимагає НЕ-nullable
      // `string` у цій позиції для lookup — SQL трактує NULL як "не
      // дорівнює NULL", тому Prisma не дозволяє шукати по складеному
      // унікальному ключу зі значенням null. Явно розділяємо два випадки.
      if (item.listingId) {
        const listingId = item.listingId;
        await this.prisma.client.cartItem.upsert({
          where: {
            cartId_productId_listingId: { cartId: userCart.id, productId: item.productId, listingId },
          },
          create: {
            cartId: userCart.id,
            productId: item.productId,
            listingId,
            quantity: item.quantity,
            priceSnapshot: item.priceSnapshot,
          },
          update: { quantity: { increment: item.quantity } },
        });
      } else {
        // Без listingId немає осмисленого складеного ключа для дедублікації
        // — просто переносимо позицію як є (той рідкісний випадок, коли
        // товар додано в кошик без прив'язки до конкретного SourceListing).
        const existing = await this.prisma.client.cartItem.findFirst({
          where: { cartId: userCart.id, productId: item.productId, listingId: null },
        });
        if (existing) {
          await this.prisma.client.cartItem.update({
            where: { id: existing.id },
            data: { quantity: { increment: item.quantity } },
          });
        } else {
          await this.prisma.client.cartItem.create({
            data: {
              cartId: userCart.id,
              productId: item.productId,
              listingId: null,
              quantity: item.quantity,
              priceSnapshot: item.priceSnapshot,
            },
          });
        }
      }
    }

    await this.prisma.client.cart.delete({ where: { id: guestCart.id } });
  }

  async clearCart(cartId: string): Promise<void> {
    await this.prisma.client.cartItem.deleteMany({ where: { cartId } });
  }

  // АУДИТ 27.08.2026 — третій шлях витоку собівартості, знайдений уже при
  // перевірці власних правок. Собівартість закрили в замовленнях
  // (OrdersService.toCustomerView) і в каталозі (PUBLIC_PRODUCT_SELECT), а
  // кошик лишався: `include: { product: ... }` тягнув увесь рядок Product
  // разом із cachedCostPriceUsd, і GET /cart під OptionalAuthGuard віддавав
  // це гостю. Тобто закупівельну ціну було видно просто поклавши товар у
  // кошик.
  //
  // Явний select замість include — з тієї ж причини, що й у каталозі: нове
  // поле в схемі за замовчуванням НЕ потрапляє у видачу, і помилка
  // проявиться як "поля немає на фронті", а не як мовчазний витік.
  async getCartWithTotals(cartId: string) {
    const cart = await this.prisma.client.cart.findUniqueOrThrow({
      where: { id: cartId },
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                slug: true,
                name: true,
                articleNumber: true,
                category: true,
                cachedPriceUsd: true,
                cachedInStock: true,
                images: { orderBy: { sortOrder: 'asc' } },
              },
            },
          },
        },
      },
    });
    const subtotalUsd = roundToCents(cart.items.reduce((sum, i) => sum + Number(i.priceSnapshot) * i.quantity, 0));
    return { ...cart, subtotalUsd };
  }
}
