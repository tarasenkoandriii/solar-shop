import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { UserRole } from '@solar-shop/db';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RateLimitGuard } from '../rate-limit/guards/rate-limit.guard';
import { RateLimit } from '../rate-limit/decorators/rate-limit.decorator';
import { BusinessPlanManifestService } from './business-plan-manifest.service';
import { CreateManifestDto, GenerateManifestDto } from './dto/manifest.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller('admin/business-plan-manifests')
export class BusinessPlanController {
  constructor(private readonly manifests: BusinessPlanManifestService) {}

  @Get()
  findAll() {
    return this.manifests.findAll();
  }

  @Post()
  createManual(@Body() dto: CreateManifestDto) {
    return this.manifests.createManual(dto.goalTags, dto.powerRangeTag ?? null, dto.content, undefined, dto.changeNote);
  }

  @UseGuards(RateLimitGuard)
  @RateLimit({ limit: 3, windowSeconds: 180 })
  @Post('generate-ai')
  generateViaAi(@Body() dto: GenerateManifestDto) {
    return this.manifests.generateViaAi(dto.goalTags, dto.powerRangeTag ?? null, dto.brief);
  }

  @Post(':id/activate')
  activate(@Param('id') id: string) {
    return this.manifests.activate(id);
  }
}
