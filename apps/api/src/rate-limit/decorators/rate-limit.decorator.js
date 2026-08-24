"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RateLimit = exports.RATE_LIMIT_KEY = void 0;
var common_1 = require("@nestjs/common");
exports.RATE_LIMIT_KEY = 'rateLimit';
// Использование: @RateLimit({ limit: 5, windowSeconds: 60 }) на хендлере.
// Ключ строится из route + IP (см. RateLimitGuard) — этого достаточно для
// защиты публичных эндпоинтов Фазы 2 (ТЗ п.28.3), не требует Redis.
var RateLimit = function (options) { return (0, common_1.SetMetadata)(exports.RATE_LIMIT_KEY, options); };
exports.RateLimit = RateLimit;
