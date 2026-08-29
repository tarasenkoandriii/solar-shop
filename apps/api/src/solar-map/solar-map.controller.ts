import { Body, Controller, Get, Post, Query, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { UserRole } from '@solar-shop/db';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RateLimitGuard } from '../rate-limit/guards/rate-limit.guard';
import { RateLimit } from '../rate-limit/decorators/rate-limit.decorator';
import { SolarMapService } from './solar-map.service';
import { EmbedViewService } from './embed-view.service';
import { LogEmbedViewDto, RecomputeGridDto, RecomputeInterpolationDto } from './dto/solar-map.dto';

@Controller()
export class SolarMapController {
  constructor(
    private readonly solarMap: SolarMapService,
    private readonly embedViews: EmbedViewService,
  ) {}

  // Єдиний публічний GET карти. Дьоргається з КОЖНОЇ сторінки, що
  // показує карту, включно з /embed/solar-map, який за задумом
  // вбудовується в чужі сайти (frame-ancestors *) — тобто обсяг
  // запитів визначаємо не ми.
  //
  // ПОРОЖНЯ відповідь позначається no-store — і це головне, заради чого
  // тут узагалі є заголовок. Уся ця правка почалась із того, що порожній
  // масив застряг у кеші (Next.js Data Cache, 24 години) уже після того,
  // як дані з'явились. Порожня сітка НЕ МАЄ осідати в жодному кеші на
  // шляху: ані в Data Cache, ані в CDN, ані в браузері.
  //
  // Для НЕПОРОЖНЬОЇ відповіді заголовок свідомо не ставиться. Спокуса
  // поставити `public, s-maxage=300`, щоб CDN гасив сплески, розбивається
  // об CORS: обидва бутстрапи (main.ts і api/index.ts) піднімають
  // enableCors({ credentials: true }) з origin=true/списком, а бібліотека
  // cors у такій конфігурації ВІДДЗЕРКАЛЮЄ Origin запиту в
  // Access-Control-Allow-Origin і додає Vary: Origin. Тобто тіло стає
  // origin-залежним: або кеш чесно розкладає його по ключах на кожен
  // Origin (і будь-хто обходить CDN одним заголовком — захист нульовий),
  // або не розкладає (і чужий Origin з Allow-Credentials: true їде
  // іншому клієнту). Спільний кеш для credentialed-CORS відповіді — не
  // те, що варто вмикати заради економії кількох читань БД.
  //
  // Rate-limit тут теж свідомо НЕ ставиться. Ключ ліміту — IP, що дійшов
  // до сокета API, а публічний трафік приходить сюди через rewrite
  // /api/* у apps/web, тобто з egress-адреси самого веб-застосунку.
  // Один ліміт на всіх означав би, що будь-хто вичерпує спільне вікно й
  // гасить карту всьому сайту разом із SSR — рівно та аварія, від якої
  // ліміт мав захищати. Дорогу частину (перебудову інтерполяції) вже
  // обмежено інакше — MIN_REBUILD_INTERVAL_MS у SolarMapService.
  @Get('solar-map/grid')
  async getGrid(@Res({ passthrough: true }) res: Response) {
    const points = await this.solarMap.getGridPoints();
    if (points.length === 0) res.setHeader('Cache-Control', 'no-store');
    return points;
  }

  // Публичный, но rate-limited — вызывается с любой страницы, встраивающей
  // виджет, потенциальная точка злоупотребления (накрутка EmbedView).
  @UseGuards(RateLimitGuard)
  @RateLimit({ limit: 10, windowSeconds: 60 })
  @Post('solar-map/embed-view')
  logEmbedView(@Body() dto: LogEmbedViewDto) {
    return this.embedViews.logView(dto.widgetKey ?? 'solar-map', dto.refererHost ?? null);
  }

  @UseGuards(JwtAuthGuard, RolesGuard, RateLimitGuard)
  @Roles(UserRole.ADMIN)
  @RateLimit({ limit: 1, windowSeconds: 3600 })
  @Post('admin/solar-map/recompute-grid')
  recomputeGrid(@Body() dto: RecomputeGridDto) {
    return this.solarMap.recomputeGrid(dto.stepDegrees);
  }

  @UseGuards(JwtAuthGuard, RolesGuard, RateLimitGuard)
  @Roles(UserRole.ADMIN)
  @RateLimit({ limit: 5, windowSeconds: 60 })
  @Post('admin/solar-map/recompute-interpolation')
  recomputeInterpolation(@Body() dto: RecomputeInterpolationDto) {
    return this.solarMap.recomputeInterpolation(dto.resolution);
  }

  // За запитом користувача — "прогрес індикація" для нового ітеративного
  // джоба pvgis_country_grid: легкий GET (лише підрахунок кешу проти
  // детермінованого повного списку точок, жодного виклику PVGIS) — щоб
  // адмінка могла показати покриття в БУДЬ-який момент, не тільки одразу
  // після ручного запуску джоба.
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Get('admin/solar-map/raw-grid-coverage')
  getRawGridCoverage() {
    return this.solarMap.getRawGridCoverage();
  }

  // За прямим запитом користувача — "pvgis кеш как обнулить". POST, не
  // GET — деструктивна дія, реального guard-рівня RolesGuard.ADMIN
  // достатньо (не rate-limited окремо — адмінська дія, не публічний
  // ендпоінт, той самий рівень захисту, що й recompute-grid нижче).
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Post('admin/solar-map/reset-cache')
  resetRawGridCache() {
    return this.solarMap.resetRawGridCache();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Get('admin/embed-views/stats')
  getStats(@Query('widgetKey') widgetKey = 'solar-map', @Query('period') period: 'today' | 'week' | 'month' | 'all' = 'week') {
    return this.embedViews.getStats(widgetKey, period);
  }

  // Міграція даних карти між оточеннями — той самий паттерн, що
  // VendorDataTransferService (Фаза 2): експорт сирих точок PVGIS +
  // закешованих інтерпольованих сіток разом, ідемпотентний імпорт.
  // Body типізовано як `unknown`, не inline-об'єктом — валідація формату
  // вручну всередині сервісу (та сама причина, що й у
  // VendorDataTransferService.importVendorData: глибоко вкладена
  // динамічна структура, DTO-класи були б громіздкі без додаткової
  // користі; `unknown` коректно проходить через global ValidationPipe,
  // не обходить його мовчки, на відміну від inline-об'єктних типів,
  // знайдених у AUDIT-FULL.md).
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Get('admin/solar-map/export')
  exportData() {
    return this.solarMap.exportData();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Post('admin/solar-map/import')
  importData(@Body() payload: unknown) {
    return this.solarMap.importData(payload);
  }
}
