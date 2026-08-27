import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RateLimitService } from '../rate-limit.service';
import { RATE_LIMIT_KEY, RateLimitOptions } from '../decorators/rate-limit.decorator';
import { resolveClientIp } from '../client-ip';

@Injectable()
export class RateLimitGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly rateLimit: RateLimitService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const options = this.reflector.get<RateLimitOptions>(RATE_LIMIT_KEY, context.getHandler());
    if (!options) return true;

    const request = context.switchToHttp().getRequest();

    // Аудит 27.08.2026: тут читався X-Forwarded-For напряму, тобто ліміт
    // обходився підробкою заголовка. Чому це НЕ лікується вмиканням
    // `trust proxy` — розписано в resolveClientIp(); коротко: там була ще
    // одна пастка, в яку я спершу й потрапив.
    const ip = resolveClientIp(request);
    const key = `${request.route?.path ?? request.url}:${ip}`;

    await this.rateLimit.checkAndIncrement(key, options.limit, options.windowSeconds);
    return true;
  }
}
