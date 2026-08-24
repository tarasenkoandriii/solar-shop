import { Body, Controller, Get, Headers, Post, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { UserRole } from '@solar-shop/db';
import { AuthService } from './auth.service';
import { TelegramLoginDto } from './dto/telegram-login.dto';
import { DevLoginDto } from './dto/dev-login.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';
import { RateLimitGuard } from '../rate-limit/guards/rate-limit.guard';
import { RateLimit } from '../rate-limit/decorators/rate-limit.decorator';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // ТЗ п.28.3 — Login Widget callback защищён от подбора/спама подписанных данных
  @UseGuards(RateLimitGuard)
  @RateLimit({ limit: 10, windowSeconds: 60 })
  @Post('telegram')
  async telegramLogin(@Body() dto: TelegramLoginDto, @Res({ passthrough: true }) res: Response) {
    const { token, user } = await this.authService.loginWithTelegram(dto, 'site');
    res.cookie('session', token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });
    return { user };
  }

  // Отдельный бот для админки (у Login Widget домен привязывается через
  // @BotFather /setdomain только к одному домену на бота — если apps/web и
  // apps/admin живут на разных доменах, одним ботом не обойтись). Cookie —
  // тоже отдельная (домен admin), схема идентична /auth/telegram.
  @UseGuards(RateLimitGuard)
  @RateLimit({ limit: 10, windowSeconds: 60 })
  @Post('telegram/admin')
  async telegramLoginAdmin(@Body() dto: TelegramLoginDto, @Res({ passthrough: true }) res: Response) {
    const { token, user } = await this.authService.loginWithTelegram(dto, 'admin');
    res.cookie('session', token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });
    return { user };
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async me(@CurrentUser() jwtUser: { sub: string }) {
    return this.authService.me(jwtUser.sub);
  }

  @Post('logout')
  logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie('session');
    return { ok: true };
  }

  // Dev-вход без Telegram — работает только если ENABLE_DEV_LOGIN=true И
  // NODE_ENV !== 'production' (двойная защита, см. AuthService.devLogin).
  // Cookie ставится точно так же, как при обычном логине — фронтенд-код
  // (AuthGate) после этого ведёт себя идентично реальному входу.
  @Post('dev-login')
  async devLogin(@Body() dto: DevLoginDto, @Res({ passthrough: true }) res: Response) {
    const { token, user } = await this.authService.devLogin(dto.role ?? UserRole.ADMIN);
    res.cookie('session', token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });
    return { user };
  }

  // Инициализация сессии TMA (ТЗ п.7) — принимает сырую initData строку в
  // заголовке X-Telegram-Init-Data, отдаёт JWT телу ответа (не cookie,
  // Telegram WebView иногда режет third-party cookies) — фронтенд TMA сам
  // решает, хранить ли токен в памяти/localStorage на время сессии.
  @UseGuards(RateLimitGuard)
  @RateLimit({ limit: 20, windowSeconds: 60 })
  @Post('bootstrap')
  async bootstrap(@Headers('x-telegram-init-data') initData: string) {
    if (!initData) return { error: 'Missing X-Telegram-Init-Data header' };
    const { token, user } = await this.authService.bootstrapFromInitData(initData);
    return { token, user };
  }
}
