import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { UserRole } from '@solar-shop/db';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ImportScoutService } from './import-scout.service';
import { SearchImportOffersDto } from './dto/search-import-offers.dto';

// За прямим запитом користувача — реалізація doc/TZ_ImportScout.md
// розділ 5/6. Адмінський функціонал — не публічний, ANY endpoint тут
// коштує грошей (виклик Grok API), тому лише ADMIN/MANAGER, той самий
// принцип, що вже решта адмінських модулів.
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.MANAGER)
@Controller('admin/import-scout')
export class ImportScoutController {
  constructor(private readonly service: ImportScoutService) {}

  @Post('search')
  search(@Body() dto: SearchImportOffersDto, @CurrentUser() user: { sub: string }) {
    return this.service.searchForProduct(dto.productId, user.sub);
  }

  @Get('product/:productId')
  getResults(@Param('productId') productId: string) {
    return this.service.getResultsForProduct(productId);
  }
}
