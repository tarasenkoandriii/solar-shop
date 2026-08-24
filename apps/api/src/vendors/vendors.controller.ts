import { Body, Controller, Delete, Get, Param, Post, Put, UseGuards } from '@nestjs/common';
import { UserRole } from '@solar-shop/db';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { VendorsService } from './vendors.service';
import { CreateVendorDto, UpdateVendorDto, SearchVendorCandidatesDto, EstimateVendorCatalogDto } from './dto/vendor.dto';

// Весь контроллер только для ADMIN — поставщики никогда не видны публично (ТЗ п.25.3)
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller('admin/vendors')
export class VendorsController {
  constructor(private readonly service: VendorsService) {}

  @Get()
  findAll() {
    return this.service.findAll();
  }

  // За запитом користувача — ІІ-пошук нових постачальників, крім
  // ручного додавання. DTO з class-validator (не inline-тип @Body()) —
  // той самий клас проблеми, що вже виправлявся в AUDIT-FULL.md.
  @Post('ai-search')
  searchCandidates(@Body() dto: SearchVendorCandidatesDto) {
    return this.service.searchCandidates(dto.country, dto.category, dto.city);
  }

  // Другий ІІ-запит — оцінка каталогу ОДНОГО конкретного кандидата
  // (кількість товарів + категорії), викликається окремо від пошуку.
  @Post('ai-estimate')
  estimateCatalog(@Body() dto: EstimateVendorCatalogDto) {
    return this.service.estimateCatalog(dto.website);
  }

  @Post()
  create(@Body() dto: CreateVendorDto) {
    return this.service.create(dto);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() dto: UpdateVendorDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
