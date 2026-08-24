import { Body, Controller, Get, Param, Post, Put, UseGuards } from '@nestjs/common';
import { UserRole } from '@solar-shop/db';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RateLimitGuard } from '../rate-limit/guards/rate-limit.guard';
import { RateLimit } from '../rate-limit/decorators/rate-limit.decorator';
import { SchemaTemplatesService } from './schema-templates.service';
import { UpdateSchemaTemplateDto } from './dto/update-schema-template.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller('admin/schema-templates')
export class SchemaTemplatesController {
  constructor(private readonly service: SchemaTemplatesService) {}

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() dto: UpdateSchemaTemplateDto) {
    return this.service.updateSvg(id, dto.svgTemplate, dto.notes);
  }

  @UseGuards(RateLimitGuard)
  @RateLimit({ limit: 1, windowSeconds: 180 })
  @Post(':id/audit')
  runAudit(@Param('id') id: string) {
    return this.service.runAudit(id);
  }
}
