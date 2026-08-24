import { Body, Controller, Delete, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { OptionalAuthGuard } from '../auth/guards/optional-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CartService } from './cart.service';
import { AddCartItemDto, UpdateCartItemDto } from './dto/cart.dto';

@UseGuards(OptionalAuthGuard)
@Controller('cart')
export class CartController {
  constructor(private readonly service: CartService) {}

  @Get()
  getCart(@CurrentUser() user: { sub: string } | undefined, @Query('sessionId') sessionId?: string) {
    return this.service.getCart(user?.sub ?? null, sessionId ?? null);
  }

  @Post('items')
  addItem(@CurrentUser() user: { sub: string } | undefined, @Body() dto: AddCartItemDto) {
    return this.service.addItem(user?.sub ?? null, dto.sessionId ?? null, dto.productId, dto.quantity ?? 1);
  }

  // Вызывается фронтендом сразу после успешного Telegram-логина — мёрджит
  // гостевую корзину (localStorage sessionId) в корзину авторизованного
  // пользователя (ТЗ п.19.2). Отдельный эндпоинт вместо вызова из
  // AuthService напрямую — избегаем циклической зависимости CartModule↔AuthModule.
  @Post('merge')
  async mergeGuestCart(@CurrentUser() user: { sub: string } | undefined, @Body('sessionId') sessionId: string) {
    if (!user || !sessionId) return { merged: false };
    await this.service.mergeGuestCartIntoUser(sessionId, user.sub);
    return { merged: true };
  }

  @Put('items/:id')
  updateItem(@Param('id') id: string, @Body() dto: UpdateCartItemDto) {
    return this.service.updateItemQuantity(id, dto.quantity);
  }

  @Delete('items/:id')
  removeItem(@Param('id') id: string) {
    return this.service.removeItem(id);
  }
}
