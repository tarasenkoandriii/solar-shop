import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { IsNotEmpty, IsString } from 'class-validator';
import { UserRole } from '@solar-shop/db';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CategoryService } from './category.service';

// Справжні DTO-класи з class-validator (не inline @Body()) — той самий
// клас проблеми, що вже виправлявся системно в AUDIT-FULL.md, тут із
// самого початку зроблено правильно.
export class ApproveAsNewCategoryDto {
  @IsString() @IsNotEmpty() nameUk!: string;
  @IsString() @IsNotEmpty() nameRu!: string;
  @IsString() @IsNotEmpty() nameEn!: string;
  @IsString() @IsNotEmpty() articleNumberPrefix!: string;
}

export class MergeCategoryDto {
  @IsString() @IsNotEmpty() targetCategoryId!: string;
}

@Controller()
export class CategoryController {
  constructor(private readonly service: CategoryService) {}

  // За прямим запитом користувача — "показать в клиентском сайте все
  // промодерированные категории из этой новой таблицы". Публічний, без
  // guard — той самий рівень доступу, що звичайний перегляд каталогу.
  @Get('categories')
  findAllApproved() {
    return this.service.findAll(true);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Get('admin/categories')
  findAllForAdmin() {
    return this.service.findAll(false);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Get('admin/categories/pending')
  findPending() {
    return this.service.findPendingWithCounts();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Post('admin/categories/:id/approve')
  approveAsNew(@Param('id') id: string, @Body() dto: ApproveAsNewCategoryDto) {
    return this.service.approveAsNew(id, dto.nameUk, dto.nameRu, dto.nameEn, dto.articleNumberPrefix);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Post('admin/categories/:id/merge')
  merge(@Param('id') id: string, @Body() dto: MergeCategoryDto) {
    return this.service.mergeIntoExisting(id, dto.targetCategoryId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Post('admin/categories/:id/reject')
  reject(@Param('id') id: string) {
    return this.service.reject(id);
  }
}
