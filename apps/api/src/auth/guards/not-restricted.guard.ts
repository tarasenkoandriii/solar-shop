import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

// ТЗ п.28.4 — заблокированный User не может создавать Order/Lead, но
// история заказов остаётся видна (блокировка не равна удалению). Навешивается
// на эндпоинты создания заказа/заявки. Работает только для авторизованных
// через Telegram (request.user из JwtAuthGuard) — гостевой чекаут не имеет
// User для проверки, что осознанно допустимо: у гостя просто нет истории
// покупок, которую можно было бы злоупотреблять по накопительной, а сама
// защита от спама на гостевом чекауте — RateLimitGuard.
@Injectable()
export class NotRestrictedGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const jwtUser = request.user as { sub: string } | undefined;
    if (!jwtUser) return true; // нет сессии — гостевой сценарий, пропускаем

    const user = await this.prisma.client.user.findUnique({ where: { id: jwtUser.sub } });
    if (user?.isBlocked) {
      throw new ForbiddenException('Account is blocked');
    }
    return true;
  }
}
