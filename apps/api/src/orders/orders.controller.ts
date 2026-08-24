import { Body, Controller, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
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
    const order = await this.service.findById(id);
    // Личный кабинет — только свои заказы, не проверка на уровне БД-запроса
    // (findById переиспользуется и админкой), поэтому фильтр здесь.
    if (order.userId !== user.sub) return { error: 'Not found' };
    return order;
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

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @Post('admin/orders/:id/ttn/print')
  printLabel(@Param('id') id: string) {
    return this.service.printLabel(id);
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
