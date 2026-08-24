import { Body, Controller, Delete, Get, HttpCode, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { UserRole } from '@solar-shop/db';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { FinancingService } from './financing.service';
import { FinancingReviewService } from './financing-review.service';
import { UpdateFinancingProgramDto } from './dto/financing-program.dto';
import { CreateFinancingReviewDto } from './dto/financing-review.dto';

@Controller()
export class FinancingController {
  constructor(
    private readonly service: FinancingService,
    private readonly reviews: FinancingReviewService,
  ) {}

  // ТЗ п.32.3 — публичная страница /financing. За прямим запитом
  // користувача — "агрегацию отзывов показать на существующих
  // картках" — кожна програма тепер несе `reviewAggregate` (кількість
  // відгуків + середні по 4 шкалах + середній % покриття).
  @Get('financing-programs')
  async findPublished(
    @Query('eligibility') eligibility?: string,
    @Query('minAmountUsd') minAmountUsd?: string,
    @Query('maxAmountUsd') maxAmountUsd?: string,
    @Query('sort') sort?: string,
  ) {
    const programs = await this.service.findPublished({
      eligibility,
      minAmountUsd: minAmountUsd ? Number(minAmountUsd) : undefined,
      maxAmountUsd: maxAmountUsd ? Number(maxAmountUsd) : undefined,
      sort,
    });
    const aggregates = await this.reviews.getAggregatesForPrograms(programs.map((p) => p.id));
    return programs.map((p) => ({ ...p, reviewAggregate: aggregates[p.id] ?? null }));
  }

  // За прямим запитом користувача — "новая страница отзывов" потребує
  // базову інформацію про програму (назва, url тощо) окремо від списку.
  @Get('financing-programs/:id')
  findOne(@Param('id') id: string) {
    return this.service.findOnePublished(id);
  }

  // За прямим запитом користувача — "отзывы подробно для каждого банка
  // - новая страница отзывов". Публічний, без guard — той самий рівень
  // доступу, що перегляд самих програм.
  @Get('financing-programs/:id/reviews')
  findReviews(@Param('id') id: string) {
    return this.reviews.findPublicReviewsForProgram(id);
  }

  // "статистика привязана к телеграм" — обов'язкова авторизація (не
  // OptionalAuthGuard, як кошик) саме для подачі відгуку, анонімність —
  // на рівні того, ЩО повертається публічно (findReviews/
  // findPublicReviewsForProgram вище), не на рівні того, хто МОЖЕ
  // залишити відгук.
  @UseGuards(JwtAuthGuard)
  @Post('financing-programs/:id/reviews')
  createReview(@Param('id') id: string, @CurrentUser() user: { sub: string }, @Body() dto: CreateFinancingReviewDto) {
    return this.reviews.createReview(user.sub, id, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Get('admin/financing-reviews/pending')
  findPendingReviewTexts() {
    return this.reviews.findPendingTexts();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Post('admin/financing-reviews/:id/approve-text')
  approveReviewText(@Param('id') id: string) {
    return this.reviews.approveText(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Post('admin/financing-reviews/:id/reject-text')
  rejectReviewText(@Param('id') id: string) {
    return this.reviews.rejectText(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Get('admin/financing-programs')
  findAllForAdmin(@Query('status') status?: string) {
    return this.service.findAllForAdmin(status);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Put('admin/financing-programs/:id')
  update(@Param('id') id: string, @Body() dto: UpdateFinancingProgramDto) {
    return this.service.update(id, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Post('admin/financing-programs/:id/publish')
  publish(@Param('id') id: string) {
    return this.service.publish(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Post('admin/financing-programs/:id/archive')
  archive(@Param('id') id: string) {
    return this.service.archive(id);
  }

  // За запитом користувача — реальне видалення (не archive), для
  // очищення дублікатів, накопичених до виправлення зіставлення по url.
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Delete('admin/financing-programs/:id')
  @HttpCode(204)
  async remove(@Param('id') id: string) {
    await this.service.remove(id);
  }

  // За прямим запитом користувача — "ни возможности смерджить"
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Post('admin/financing-programs/:id/merge')
  merge(@Param('id') id: string, @Body() dto: { targetId: string }) {
    return this.service.merge(id, dto.targetId);
  }

  // За прямим запитом користувача — "добавь действие для таких
  // случаев - спарсить фото"
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Post('admin/financing-programs/:id/refetch-image')
  refetchImage(@Param('id') id: string) {
    return this.service.refetchImage(id);
  }

  // За прямим запитом користувача — "сделай импорт экспорт полного
  // списка (включительно с кандидатами) программ кредитования через
  // compacted json". Той самий патерн, що вже для карти потенціалу
  // (SolarMapController).
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Get('admin/financing-programs/export')
  exportData() {
    return this.service.exportData();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Post('admin/financing-programs/import')
  importData(@Body() payload: unknown) {
    return this.service.importData(payload);
  }
}
