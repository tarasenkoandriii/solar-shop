import { Body, Controller, Delete, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { OptionalAuthGuard } from '../auth/guards/optional-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CartService } from './cart.service';
import { AddCartItemDto, UpdateCartItemDto } from './dto/cart.dto';
import { MergeGuestSessionDto } from '../common/dto/session-id.dto';

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
  //
  // Аудит 27.08.2026: було `@Body('sessionId') sessionId: string` — примітив
  // із тіла запиту, який глобальний ValidationPipe не перевіряє в принципі
  // (детально — у коментарі до MergeGuestSessionDto). Обʼєкт
  // `{ "not": null }` долітав до `where: { sessionId }` і віддавав чужий
  // кошик. Тепер DTO-клас, тобто штатна валідація.
  @Post('merge')
  async mergeGuestCart(@CurrentUser() user: { sub: string } | undefined, @Body() dto: MergeGuestSessionDto) {
    if (!user) return { merged: false };
    await this.service.mergeGuestCartIntoUser(dto.sessionId, user.sub);
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
