import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

// Корзина/чекаут доступны и гостю, и авторизованному через Telegram (ТЗ
// п.19.2) — в отличие от JwtAuthGuard не бросает 401, если токена нет,
// просто оставляет request.user пустым. Если токен есть, но невалиден —
// тоже не бросает (истёкшая сессия не должна ломать гостевой чекаут).
@Injectable()
export class OptionalAuthGuard implements CanActivate {
  constructor(private readonly jwt: JwtService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const token = this.extractToken(request);
    if (token) {
      try {
        request.user = this.jwt.verify(token);
      } catch {
        // истёкший/невалидный токен — просто гостевой сценарий
      }
    }
    return true;
  }

  private extractToken(request: any): string | null {
    const authHeader = request.headers?.authorization;
    if (authHeader?.startsWith('Bearer ')) return authHeader.slice(7);
    if (request.cookies?.session) return request.cookies.session;
    return null;
  }
}
