import { BadRequestException, Body, Controller, Get, Logger, Param, Post, Put, Query, UseGuards, ServiceUnavailableException } from '@nestjs/common';
import { UserRole } from '@solar-shop/db';
import { OptionalAuthGuard } from '../auth/guards/optional-auth.guard';
import { NotRestrictedGuard } from '../auth/guards/not-restricted.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RateLimitGuard } from '../rate-limit/guards/rate-limit.guard';
import { RateLimit } from '../rate-limit/decorators/rate-limit.decorator';
import { CalculatorService } from './calculator.service';
import { CalculatorSettingsService } from '../calculator-settings/calculator-settings.service';
import { StartCalculatorDto, RefineCalculatorDto, UpdateSpecDto, AddToCartDto, SendPackageDto, RequestDocumentsDto } from './dto/calculator.dto';

@Controller()
export class CalculatorController {
  private readonly logger = new Logger(CalculatorController.name);

  constructor(
    private readonly service: CalculatorService,
    private readonly settings: CalculatorSettingsService,
  ) {}

  // ТЗ п.31.1 — старт квиза, доступен и гостю
  //
  // За прямим запитом користувача ("раньше считал теперь 500") —
  // перевірено ВСЮ ланцюг викликів після сценарію requirements=null
  // (Grok timeout/AbortError — вже коректно ловиться й повертає null
  // у GrokService, розділ README) — resolveRequirementsToCatalog(),
  // notifyCalculatorLead(), renderDiagram() — усі вже мають захист від
  // порожніх/null даних. Жодного очевидного необробленого винятку не
  // знайдено — тому НЕ вигадую причину вчергове. Замість цього —
  // видимість: якщо реальна причина ЦЬОГО 500 в чомусь ІНШОМУ, чого я
  // не перевірив, наступний прояв покаже ТОЧНИЙ текст помилки прямо в
  // браузері (той самий confirm-діалог), не лише голе "500 Internal
  // Server Error" без деталей — не потрібно буде лізти в серверні
  // логи вручну для діагностики.
  @UseGuards(OptionalAuthGuard, NotRestrictedGuard, RateLimitGuard)
  @RateLimit({ limit: 10, windowSeconds: 60 })
  @Post('calculator/start')
  async start(@CurrentUser() user: { sub: string } | undefined, @Body() dto: StartCalculatorDto) {
    try {
      return await this.service.start(user?.sub ?? null, dto);
    } catch (err) {
      // ServiceUnavailableException пропускаємо як є: обгортання її в 400
      // означало б казати клієнту "твій запит некоректний" там, де
      // насправді ліг наш зовнішній сервіс. Будь-який ретрай-шар, монітор
      // аптайму чи CDN трактує 4xx як "не повторювати" — і збій став би
      // невидимим для алертів на 5xx.
      if (err instanceof BadRequestException || err instanceof ServiceUnavailableException) throw err;
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`calculator/start провалився: ${message}`, err instanceof Error ? err.stack : undefined);
      throw new BadRequestException(`Не вдалося створити розрахунок: ${message}`);
    }
  }

  @UseGuards(OptionalAuthGuard)
  @Get('calculator/:id')
  findById(
    @CurrentUser() user: { sub: string } | undefined,
    @Param('id') id: string,
    @Query('sessionId') sessionId?: string,
  ) {
    return this.service.findById(id, user?.sub ?? null, sessionId ?? null);
  }

  // Rate limit на уровне конкретного estimateId — внутри сервиса
  // (RateLimitService.checkAndIncrement с ключом по id), см. ТЗ п.31.9.
  @UseGuards(OptionalAuthGuard, NotRestrictedGuard)
  @Post('calculator/:id/refine')
  refine(
    @CurrentUser() user: { sub: string } | undefined,
    @Param('id') id: string,
    @Body() dto: RefineCalculatorDto,
    @Query('sessionId') sessionId?: string,
  ) {
    return this.service.refine(id, user?.sub ?? null, sessionId ?? null, dto);
  }

  @UseGuards(OptionalAuthGuard)
  @Put('calculator/:id/spec')
  updateSpec(
    @CurrentUser() user: { sub: string } | undefined,
    @Param('id') id: string,
    @Body() dto: UpdateSpecDto,
    @Query('sessionId') sessionId?: string,
  ) {
    return this.service.updateSpec(id, user?.sub ?? null, sessionId ?? null, dto);
  }

  @UseGuards(OptionalAuthGuard)
  @Post('calculator/:id/finalize')
  finalize(
    @CurrentUser() user: { sub: string } | undefined,
    @Param('id') id: string,
    @Query('sessionId') sessionId?: string,
  ) {
    return this.service.finalize(id, user?.sub ?? null, sessionId ?? null);
  }

  // ТЗ п.31.11.0 — чек-лист документов, ставит в очередь batch-генерации
  @UseGuards(OptionalAuthGuard, NotRestrictedGuard)
  @Post('calculator/:id/request-documents')
  requestDocuments(
    @CurrentUser() user: { sub: string } | undefined,
    @Param('id') id: string,
    @Body() dto: RequestDocumentsDto,
    @Query('sessionId') sessionId?: string,
  ) {
    return this.service.requestDocuments(id, user?.sub ?? null, sessionId ?? null, dto);
  }

  @UseGuards(OptionalAuthGuard)
  @Post('calculator/:id/add-to-cart')
  addToCart(
    @CurrentUser() user: { sub: string } | undefined,
    @Param('id') id: string,
    @Body() dto: AddToCartDto,
    @Query('sessionId') sessionId?: string,
  ) {
    return this.service.addToCart(id, user?.sub ?? null, sessionId ?? null, dto.productIds);
  }

  @UseGuards(OptionalAuthGuard, NotRestrictedGuard, RateLimitGuard)
  @RateLimit({ limit: 5, windowSeconds: 60 })
  @Post('calculator/:id/export')
  exportPackage(
    @CurrentUser() user: { sub: string } | undefined,
    @Param('id') id: string,
    @Query('sessionId') sessionId?: string,
  ) {
    return this.service.exportPackage(id, user?.sub ?? null, sessionId ?? null);
  }

  @UseGuards(OptionalAuthGuard, NotRestrictedGuard, RateLimitGuard)
  @RateLimit({ limit: 5, windowSeconds: 60 })
  @Post('calculator/:id/send')
  send(
    @CurrentUser() user: { sub: string } | undefined,
    @Param('id') id: string,
    @Body() dto: SendPackageDto,
    @Query('sessionId') sessionId?: string,
  ) {
    return this.service.send(id, user?.sub ?? null, sessionId ?? null, dto);
  }

  // ТЗ п.31.7 — вызывается фронтендом сразу после успешного Telegram-логина,
  // тот же паттерн, что CartController.mergeGuestCart
  @UseGuards(JwtAuthGuard)
  @Post('calculator/merge')
  async mergeGuestEstimates(@CurrentUser() user: { sub: string }, @Body('sessionId') sessionId: string) {
    if (!sessionId) return { merged: 0 };
    return this.service.mergeGuestEstimates(sessionId, user.sub);
  }

  // ТЗ п.31.7 — /account/projects
  @UseGuards(JwtAuthGuard)
  @Get('account/projects')
  findMine(@CurrentUser() user: { sub: string }) {
    return this.service.findMine(user.sub);
  }

  // ---- Admin (ТЗ п.31.8) ----

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @Get('admin/calculator/estimates')
  findAllForAdmin() {
    return this.service.findAllForAdmin();
  }

  // За прямим запитом користувача ("в админке дать возможность
  // просмотра результатов детально на странице в том же дизайне")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @Get('admin/calculator/estimates/:id')
  findOneForAdmin(@Param('id') id: string) {
    return this.service.findOneForAdmin(id);
  }

  // По запросу — отдельная вкладка «Контакти доставки»: куда/когда/статус
  // отправки материалов (email/telegram/whatsapp/viber)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @Get('admin/calculator/deliveries')
  findAllDeliveries() {
    return this.service.findAllDeliveries();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @Post('admin/calculator/estimates/:id/convert-to-order')
  convertToOrder(@Param('id') id: string) {
    return this.service.convertToOrder(id);
  }

  // За прямим запитом користувача — "Если checked в налаштуваннях то
  // давать вибирати на клієнтському сайті, якщо ні то grayed + not
  // checked". Публічний (без auth) — DocumentChecklist.tsx на
  // клієнтському сайті читає це перед показом чек-листа.
  @Get('document-types/enabled')
  getEnabledDocumentTypes() {
    return this.settings.getEnabledDocumentTypeKeys();
  }
}
