import { Body, Controller, Delete, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { UserRole } from '@solar-shop/db';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { GrokUsageService } from './grok-usage.service';

@Controller('admin')
export class GrokUsageController {
  constructor(private readonly service: GrokUsageService) {}

  // За прямим запитом користувача — "показать и привязывать к
  // telegram id". since у днях — той самий простий підхід, що вже
  // застосований для embed-views/stats (period замість довільного
  // date-range пікера).
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Get('grok-usage')
  getSummary(@Query('sinceDays') sinceDays?: string) {
    const sinceDate = sinceDays ? new Date(Date.now() - Number(sinceDays) * 24 * 60 * 60 * 1000) : undefined;
    return this.service.getUsageSummary(sinceDate);
  }

  // За прямим запитом користувача — "плашка баланс аккаунта grok ai"
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Get('grok-balance')
  getBalance() {
    return this.service.getGrokConsoleLink();
  }

  // За прямим запитом користувача — "административные расходы"
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Get('admin-expenses')
  listAdminExpenses() {
    return this.service.listAdminExpenses();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Post('admin-expenses')
  createAdminExpense(@Body() dto: { description: string; amountUsd: number; category?: string }) {
    return this.service.createAdminExpense(dto.description, dto.amountUsd, dto.category);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Delete('admin-expenses/:id')
  deleteAdminExpense(@Param('id') id: string) {
    return this.service.deleteAdminExpense(id);
  }

  // За прямим запитом користувача — "снизу лог расходов"
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Get('expense-log')
  getExpenseLog(@Query('limit') limit?: string) {
    return this.service.getExpenseLog(limit ? Number(limit) : undefined);
  }
}
