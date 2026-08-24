import { Global, Module } from '@nestjs/common';
import { RateLimitService } from './rate-limit.service';
import { RateLimitGuard } from './guards/rate-limit.guard';

// @Global — гвард используется точечно на конкретных хендлерах через
// @UseGuards(RateLimitGuard) + @RateLimit(...) в разных модулях (leads,
// orders, auth), удобнее не импортировать модуль каждый раз.
@Global()
@Module({
  providers: [RateLimitService, RateLimitGuard],
  exports: [RateLimitService, RateLimitGuard],
})
export class RateLimitModule {}
