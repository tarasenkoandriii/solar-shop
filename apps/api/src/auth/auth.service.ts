import { BadRequestException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { UserRole } from '@solar-shop/db';
import { PrismaService } from '../prisma/prisma.service';
import { TelegramLoginDto } from './dto/telegram-login.dto';
import { verifyTelegramLoginPayload } from './telegram.util';
import { verifyTelegramInitData } from './telegram-init-data.util';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  // Логин через Telegram Login Widget — сайт и админка теперь используют
  // РАЗНЫХ ботов (у официального Login Widget домен привязывается через
  // @BotFather /setdomain только к одному домену на бота), поэтому нужно
  // проверять подпись против соответствующего токена. Модель User общая —
  // роль (CUSTOMER/MANAGER/ADMIN) не зависит от того, через какого бота
  // прошёл логин, назначается вручную в БД (ТЗ п.20.3), самостоятельная
  // регистрация в привилегированные роли невозможна в любом случае.
  async loginWithTelegram(payload: TelegramLoginDto, surface: 'site' | 'admin' = 'site') {
    const envKey = surface === 'admin' ? 'TELEGRAM_ADMIN_BOT_TOKEN' : 'TELEGRAM_BOT_TOKEN';
    const botToken = this.config.get<string>(envKey);
    if (!botToken) throw new BadRequestException(`${envKey} not configured`);

    const isValid = verifyTelegramLoginPayload(payload, botToken);
    if (!isValid) throw new UnauthorizedException('Invalid Telegram signature');

    const telegramId = String(payload.id);

    const user = await this.prisma.client.user.upsert({
      where: { telegramId },
      create: {
        telegramId,
        username: payload.username,
        firstName: payload.first_name,
        lastName: payload.last_name,
        photoUrl: payload.photo_url,
      },
      update: {
        username: payload.username,
        firstName: payload.first_name,
        lastName: payload.last_name,
        photoUrl: payload.photo_url,
      },
    });

    if (user.isBlocked) throw new UnauthorizedException('Account is blocked');

    const token = this.jwt.sign({
      sub: user.id,
      telegramId: user.telegramId,
      role: user.role,
    });

    return { token, user };
  }

  async me(userId: string) {
    return this.prisma.client.user.findUnique({ where: { id: userId } });
  }

  // /bootstrap для TMA (ТЗ п.7/п.20.4) — initData резолвится в ту же таблицу
  // User, что и сайт/админка, единый профиль независимо от точки входа.
  async bootstrapFromInitData(initData: string) {
    const botToken = this.config.get<string>('TELEGRAM_BOT_TOKEN');
    if (!botToken) throw new BadRequestException('TELEGRAM_BOT_TOKEN not configured');

    const parsed = verifyTelegramInitData(initData, botToken);
    if (!parsed || !parsed.user) throw new UnauthorizedException('Invalid Telegram initData');

    const telegramId = String(parsed.user.id);

    const user = await this.prisma.client.user.upsert({
      where: { telegramId },
      create: {
        telegramId,
        username: parsed.user.username,
        firstName: parsed.user.first_name,
        lastName: parsed.user.last_name,
        photoUrl: parsed.user.photo_url,
      },
      update: {
        username: parsed.user.username,
        firstName: parsed.user.first_name,
        lastName: parsed.user.last_name,
      },
    });

    if (user.isBlocked) throw new UnauthorizedException('Account is blocked');

    const token = this.jwt.sign({ sub: user.id, telegramId: user.telegramId, role: user.role });
    return { token, user };
  }

  // Dev-логин без Telegram (для локальной разработки под Docker) — жёстко
  // требует ДВЕ независимые проверки: ENABLE_DEV_LOGIN=true И
  // NODE_ENV !== 'production'. Даже если кто-то случайно оставит
  // ENABLE_DEV_LOGIN=true в проде, вторая проверка всё равно заблокирует
  // эндпоинт. 404 вместо 403 — не выдаём даже сам факт существования
  // маршрута в окружениях, где он выключен.
  async devLogin(role: UserRole = UserRole.ADMIN) {
    this.assertDevLoginEnabled();

    // Фиксированный sentinel telegramId на роль — повторные dev-логины
    // используют того же пользователя, не плодят новых при каждом клике.
    const telegramId = `dev-${role.toLowerCase()}`;

    const user = await this.prisma.client.user.upsert({
      where: { telegramId },
      create: {
        telegramId,
        username: `dev_${role.toLowerCase()}`,
        firstName: `Dev ${role}`,
        role,
      },
      update: {},
    });

    if (user.isBlocked) throw new UnauthorizedException('Account is blocked');

    const token = this.jwt.sign({ sub: user.id, telegramId: user.telegramId, role: user.role });
    return { token, user };
  }

  private assertDevLoginEnabled(): void {
    const enabled = this.config.get<string>('ENABLE_DEV_LOGIN') === 'true';
    const isProduction = (this.config.get<string>('NODE_ENV') ?? process.env.NODE_ENV) === 'production';
    if (!enabled || isProduction) {
      throw new NotFoundException('Not found');
    }
  }
}
