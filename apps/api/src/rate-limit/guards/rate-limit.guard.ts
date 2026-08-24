import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RateLimitService } from '../rate-limit.service';
import { RATE_LIMIT_KEY, RateLimitOptions } from '../decorators/rate-limit.decorator';

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
    const ip = request.headers['x-forwarded-for']?.split(',')[0]?.trim() ?? request.ip ?? 'unknown';
    const key = `${request.route?.path ?? request.url}:${ip}`;

    await this.rateLimit.checkAndIncrement(key, options.limit, options.windowSeconds);
    return true;
  }
}
