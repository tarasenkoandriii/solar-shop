import { BadRequestException, Body, Controller, Delete, Get, Param, Post, Put, UseGuards } from '@nestjs/common';
import { UserRole } from '@solar-shop/db';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RateLimitGuard } from '../rate-limit/guards/rate-limit.guard';
import { RateLimit } from '../rate-limit/decorators/rate-limit.decorator';
import { ProjectGoalsService } from './project-goals.service';
import { CreateProjectGoalDto, UpdateProjectGoalDto, SuggestProjectGoalsDto } from './dto/project-goal.dto';

@Controller()
export class ProjectGoalsController {
  constructor(private readonly service: ProjectGoalsService) {}

  // Публичный список для квиза калькулятора
  @Get('project-goals')
  findActive() {
    return this.service.findActive();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Get('admin/project-goals')
  findAll() {
    return this.service.findAll();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Post('admin/project-goals')
  create(@Body() dto: CreateProjectGoalDto) {
    return this.service.create(dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Put('admin/project-goals/:id')
  update(@Param('id') id: string, @Body() dto: UpdateProjectGoalDto) {
    return this.service.update(id, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Delete('admin/project-goals/:id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }

  // ТЗ п.31.9 — даже для ADMIN ограничиваем частоту ИИ-кнопок
  @UseGuards(JwtAuthGuard, RolesGuard, RateLimitGuard)
  @Roles(UserRole.ADMIN)
  @RateLimit({ limit: 1, windowSeconds: 180 })
  @Post('admin/project-goals/suggest-ai')
  async suggestViaAi(@Body() dto: SuggestProjectGoalsDto) {
    // За прямим запитом користувача ("same shit" — реальний скріншот
    // показав голий "500 Internal Server Error" без жодних деталей).
    // На відміну від cron-джобів (де CronService.run() вже зберігає
    // errorMessage в БД, розділ README) — цей ендпоінт викликається
    // НАПРЯМУ, без такого механізму. Найімовірніша причина вже
    // виправлена в сервісі (валідація defaultTopology), але цей
    // зовнішній try/catch — захист від БУДЬ-ЯКОЇ іншої непередбаченої
    // причини теж: перетворює голий 500 на BadRequestException із
    // РЕАЛЬНИМ текстом помилки, видимим прямо в тому самому
    // confirm-діалозі браузера, що вже показує повідомлення винятку.
    try {
      return await this.service.suggestViaAi(dto.brief);
    } catch (err) {
      if (err instanceof BadRequestException) throw err;
      const message = err instanceof Error ? err.message : String(err);
      throw new BadRequestException(`Не вдалося згенерувати пропозиції: ${message}`);
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Post('admin/project-goals/:id/activate')
  activate(@Param('id') id: string) {
    return this.service.activate(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Post('admin/project-goals/:id/reject')
  reject(@Param('id') id: string) {
    return this.service.reject(id);
  }
}
