import { Body, Controller, Delete, Get, HttpCode, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { UserRole } from '@solar-shop/db';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { ArticlesService } from './articles.service';
import { UpdateArticleDto, UpdateTranslationDto } from './dto/article.dto';

// Запуск парсера статей (article_parser) — только через CronModule (см.
// комментарий в ParserController) — здесь только чтение + модерация.
@Controller()
export class ArticlesController {
  constructor(private readonly service: ArticlesService) {}

  @Get('articles')
  findPublished(@Query('locale') locale = 'uk') {
    return this.service.findPublished(locale);
  }

  @Get('articles/:slug')
  findBySlug(@Param('slug') slug: string, @Query('locale') locale = 'uk') {
    return this.service.findBySlug(locale, slug);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Get('admin/articles')
  findAllForAdmin(@Query('sortBy') sortBy?: 'createdAt' | 'score', @Query('status') status?: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED') {
    return this.service.findAllForAdmin(sortBy, status);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Put('admin/articles/:id')
  updateArticle(@Param('id') id: string, @Body() dto: UpdateArticleDto) {
    return this.service.updateArticle(id, dto);
  }

  // За прямим запитом користувача (розділ README про виправлення
  // промпту локалізації) — щоб можна було прибрати статті зі старими
  // (до фіксу промпту) неякісними перекладами й переспарсити заново.
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Delete('admin/articles/:id')
  @HttpCode(204)
  deleteArticle(@Param('id') id: string) {
    return this.service.deleteArticle(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Put('admin/articles/translations/:id')
  updateTranslation(@Param('id') id: string, @Body() dto: UpdateTranslationDto) {
    return this.service.updateTranslation(id, dto);
  }

  // За прямим запитом користувача — "немає фото в новинах... також
  // підтягати фото для попередніх статей". Ретраїть завантаження на
  // Blob по вже збереженому sourceImageUrl, БЕЗ повторного RSS-запиту.
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Post('admin/articles/backfill-cover-images')
  backfillCoverImages() {
    return this.service.backfillMissingCoverImages();
  }
}
