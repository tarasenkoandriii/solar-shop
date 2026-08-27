import { Body, Controller, Get, Param, Post, Put, Query, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { UserRole } from '@solar-shop/db';
import { OptionalAuthGuard } from '../auth/guards/optional-auth.guard';
import { NotRestrictedGuard } from '../auth/guards/not-restricted.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RateLimitGuard } from '../rate-limit/guards/rate-limit.guard';
import { RateLimit } from '../rate-limit/decorators/rate-limit.decorator';
import { OrdersService } from './orders.service';
import { ProfitService } from './profit.service';
import { DeliveryContactDto, BuyNowDto, UpdateOrderStatusDto } from './dto/checkout.dto';

@Controller()
export class OrdersController {
  constructor(
    private readonly service: OrdersService,
    private readonly profit: ProfitService,
  ) {}

  // Чекаут из корзины — гость или авторизованный (ТЗ п.19.2). Rate limit +
  // блокировка (ТЗ п.28.3/28.4) — заказ дорогая операция (внешние вызовы NP/PDF).
  @UseGuards(OptionalAuthGuard, NotRestrictedGuard, RateLimitGuard)
  @RateLimit({ limit: 10, windowSeconds: 60 })
  @Post('orders/checkout')
  checkout(@CurrentUser() user: { sub: string } | undefined, @Body() dto: DeliveryContactDto) {
    return this.service.checkoutFromCart(user?.sub ?? null, dto.sessionId ?? null, dto);
  }

  @UseGuards(OptionalAuthGuard, NotRestrictedGuard, RateLimitGuard)
  @RateLimit({ limit: 10, windowSeconds: 60 })
  @Post('orders/buy-now')
  buyNow(@CurrentUser() user: { sub: string } | undefined, @Body() dto: BuyNowDto) {
    return this.service.buyNow(user?.sub ?? null, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('account/orders')
  myOrders(@CurrentUser() user: { sub: string }) {
    return this.service.findMyOrders(user.sub);
  }

  @UseGuards(JwtAuthGuard)
  @Get('account/orders/:id')
  async myOrderDetail(@CurrentUser() user: { sub: string }, @Param('id') id: string) {
    // Аудит 27.08.2026: раніше тут викликався findById() і повертався
    // сирий об'єкт — із собівартістю позицій і повним Product усередині.
    // Плюс на чуже замовлення віддавалося `{ error: 'Not found' }` з
    // кодом 200, тобто фронтенд бачив "успіх" із тілом-помилкою. Обидві
    // частини тепер у findByIdForCustomer(): чистка полів + справжній 404.
    return this.service.findByIdForCustomer(id, user.sub);
  }

  // ---- Admin ----

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @Get('admin/orders')
  findAllForAdmin(@Query('status') status?: string) {
    return this.service.findAllForAdmin(status);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @Get('admin/orders/:id')
  findOneForAdmin(@Param('id') id: string) {
    return this.service.findById(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @Put('admin/orders/:id/status')
  updateStatus(@Param('id') id: string, @Body() dto: UpdateOrderStatusDto) {
    return this.service.updateStatus(id, dto.status);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @Post('admin/orders/:id/invoice')
  generateInvoice(@Param('id') id: string) {
    return this.service.generateInvoice(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @Post('admin/orders/:id/ttn')
  createTtn(@Param('id') id: string) {
    return this.service.createTtnManually(id);
  }

  // Аудит 27.08.2026: був POST, що віддавав JSON із посиланням, у якому
  // лежав NOVA_POSHTA_API_KEY, — і адмінка це посилання просто відкидала,
  // тобто кнопка друку не працювала взагалі. Тепер GET, що віддає САМ PDF:
  // ключ не залишає сервера, а кнопка відкриває накладну в новій вкладці
  // (GET верхнього рівня несе cookie сесії, бо вона SameSite=lax).
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @Get('admin/orders/:id/ttn/print')
  async printLabel(@Param('id') id: string, @Res() res: Response) {
    const pdf = await this.service.printLabel(id);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Length': String(pdf.byteLength),
      'Content-Disposition': `inline; filename="ttn-${id}.pdf"`,
      // Накладна — документ конкретного замовлення; проміжним кешам його
      // класти нікуди.
      'Cache-Control': 'private, no-store',
    });
    res.end(pdf);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @Post('admin/orders/:id/ttn/cancel')
  cancelTtn(@Param('id') id: string) {
    return this.service.cancelTtn(id);
  }

  // За прямим запитом користувача — "добавить в админку вкладку
  // profit... выводить на вкладке profit обе цены и разницу которую
  // мы заработаем, и статус заказа".
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @Get('admin/orders-profit')
  getOrdersProfit() {
    return this.profit.getOrdersWithProfit();
  }

  // За прямим запитом користувача — "продумать из на систему на
  // отдельно кнопку "делегировать заказы" - все позиции заказа без
  // прибыли делегируем другим поставщикам и генерируем отдельно ТТН
  // для каждого из них, все с этой страницы profit".
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @Post('admin/orders-profit/delegate')
  delegateNoProfitOrders() {
    return this.profit.delegateNoProfitOrders();
  }

  // За прямим запитом користувача — реалізація doc/TZ_ImportScout.md
  // розділ 3.1/3.2.
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @Get('admin/orders-profit/top-products-by-profit')
  getTopProductsByProfit() {
    return this.profit.getTopProductsByProfit();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @Get('admin/orders-profit/top-products-by-sales')
  getTopProductsBySales() {
    return this.profit.getTopProductsBySales();
  }

  // За прямим запитом користувача — "OrderDelegation не имеет пути
  // просмотра... Исправь".
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @Get('admin/orders-profit/delegations')
  getDelegations() {
    return this.profit.getDelegations();
  }
}
