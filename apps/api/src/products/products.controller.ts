import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { UserRole } from '@solar-shop/db';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OptionalAuthGuard } from '../auth/guards/optional-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ProductsService } from './products.service';
import { ProductReviewService } from './product-review.service';
import { QueryProductsDto } from './dto/query-products.dto';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { CreateProductReviewDto, UpdateProductReviewDto } from './dto/product-review.dto';

@Controller('products')
export class ProductsController {
  constructor(
    private readonly service: ProductsService,
    private readonly reviews: ProductReviewService,
  ) {}

  @Get()
  findAll(@Query() query: QueryProductsDto) {
    return this.service.findAll(query);
  }

  // ---- Admin-only (объявлены раньше ':slug' — иначе Express перехватит
  // /products/admin/* как :slug='admin') ----

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @Get('admin/all')
  findAllForAdmin() {
    return this.service.findAllForAdmin();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Post('admin')
  create(@Body() dto: CreateProductDto) {
    return this.service.create(dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Put('admin/:id')
  update(@Param('id') id: string, @Body() dto: UpdateProductDto) {
    return this.service.update(id, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Delete('admin/:id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Post('admin/:id/recalculate-pricing')
  recalculatePricing(@Param('id') id: string) {
    return this.service.recalculatePricing(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Get('admin/reviews/pending')
  findPendingReviewTexts() {
    return this.reviews.findPendingTexts();
  }

  // За прямим запитом користувача — "добавить парсер отзывов на
  // товары... показать отзывы на нашем сайте".
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Get('admin/imported-reviews')
  findAllImportedReviewsForAdmin() {
    return this.reviews.findAllImportedReviewsForAdmin();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Delete('admin/imported-reviews/:id')
  deleteImportedReview(@Param('id') id: string) {
    return this.reviews.deleteImportedReview(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Post('admin/reviews/:id/approve-text')
  approveReviewText(@Param('id') id: string) {
    return this.reviews.approveText(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Post('admin/reviews/:id/reject-text')
  rejectReviewText(@Param('id') id: string) {
    return this.reviews.rejectText(id);
  }

  // За прямим запитом користувача — "привязать отзывы к покупке -
  // один отзыв на каждую позицию". Публічний список — OptionalAuthGuard
  // (не JwtAuthGuard), щоб гість теж бачив відгуки, а залогінений
  // користувач додатково отримував прапорець isMine на своїх (для
  // кнопок редагувати/видалити на фронтенді, без розкриття чужого
  // userId — анонімність збережена для решти).
  @UseGuards(OptionalAuthGuard)
  @Get(':id/reviews')
  findReviews(@Param('id') id: string, @CurrentUser() user: { sub: string } | undefined) {
    return this.reviews.findPublicReviewsForProduct(id, user?.sub);
  }

  // За прямим запитом користувача — "показать отзывы на нашем сайте с
  // указанием источника отзыва".
  @Get(':id/imported-reviews')
  findImportedReviews(@Param('id') id: string) {
    return this.reviews.findImportedReviewsForProduct(id);
  }

  // За прямим запитом користувача — "один отзыв на каждую позицию" —
  // список позицій ЦЬОГО товару в замовленнях користувача, що ЩЕ НЕ
  // мають відгуку, для показу окремої форми на кожну.
  @UseGuards(JwtAuthGuard)
  @Get(':id/reviewable-order-items')
  findReviewableOrderItems(@Param('id') id: string, @CurrentUser() user: { sub: string }) {
    return this.reviews.getReviewableOrderItems(user.sub, id);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/reviews')
  createReview(@Param('id') id: string, @CurrentUser() user: { sub: string }, @Body() dto: CreateProductReviewDto) {
    return this.reviews.createReview(user.sub, id, dto);
  }

  // За прямим запитом користувача — "допускается редактировать...
  // удалять отзывы (самим покупателем только)". Не під /admin — це
  // дія самого покупця, не адміна (перевірка власності — усередині
  // сервісу).
  @UseGuards(JwtAuthGuard)
  @Put('reviews/:reviewId')
  updateReview(@Param('reviewId') reviewId: string, @CurrentUser() user: { sub: string }, @Body() dto: UpdateProductReviewDto) {
    return this.reviews.updateReview(user.sub, reviewId, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('reviews/:reviewId')
  deleteReview(@Param('reviewId') reviewId: string, @CurrentUser() user: { sub: string }) {
    return this.reviews.deleteReview(user.sub, reviewId);
  }

  @Get(':slug')
  findBySlug(@Param('slug') slug: string) {
    return this.service.findBySlug(slug);
  }
}
