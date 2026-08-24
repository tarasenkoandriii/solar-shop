"use strict";
var __esDecorate = (this && this.__esDecorate) || function (ctor, descriptorIn, decorators, contextIn, initializers, extraInitializers) {
    function accept(f) { if (f !== void 0 && typeof f !== "function") throw new TypeError("Function expected"); return f; }
    var kind = contextIn.kind, key = kind === "getter" ? "get" : kind === "setter" ? "set" : "value";
    var target = !descriptorIn && ctor ? contextIn["static"] ? ctor : ctor.prototype : null;
    var descriptor = descriptorIn || (target ? Object.getOwnPropertyDescriptor(target, contextIn.name) : {});
    var _, done = false;
    for (var i = decorators.length - 1; i >= 0; i--) {
        var context = {};
        for (var p in contextIn) context[p] = p === "access" ? {} : contextIn[p];
        for (var p in contextIn.access) context.access[p] = contextIn.access[p];
        context.addInitializer = function (f) { if (done) throw new TypeError("Cannot add initializers after decoration has completed"); extraInitializers.push(accept(f || null)); };
        var result = (0, decorators[i])(kind === "accessor" ? { get: descriptor.get, set: descriptor.set } : descriptor[key], context);
        if (kind === "accessor") {
            if (result === void 0) continue;
            if (result === null || typeof result !== "object") throw new TypeError("Object expected");
            if (_ = accept(result.get)) descriptor.get = _;
            if (_ = accept(result.set)) descriptor.set = _;
            if (_ = accept(result.init)) initializers.unshift(_);
        }
        else if (_ = accept(result)) {
            if (kind === "field") initializers.unshift(_);
            else descriptor[key] = _;
        }
    }
    if (target) Object.defineProperty(target, contextIn.name, descriptor);
    done = true;
};
var __runInitializers = (this && this.__runInitializers) || function (thisArg, initializers, value) {
    var useValue = arguments.length > 2;
    for (var i = 0; i < initializers.length; i++) {
        value = useValue ? initializers[i].call(thisArg, value) : initializers[i].call(thisArg);
    }
    return useValue ? value : void 0;
};
var __setFunctionName = (this && this.__setFunctionName) || function (f, name, prefix) {
    if (typeof name === "symbol") name = name.description ? "[".concat(name.description, "]") : "";
    return Object.defineProperty(f, "name", { configurable: true, value: prefix ? "".concat(prefix, " ", name) : name });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OptionalAuthGuard = void 0;
var common_1 = require("@nestjs/common");
// Корзина/чекаут доступны и гостю, и авторизованному через Telegram (ТЗ
// п.19.2) — в отличие от JwtAuthGuard не бросает 401, если токена нет,
// просто оставляет request.user пустым. Если токен есть, но невалиден —
// тоже не бросает (истёкшая сессия не должна ломать гостевой чекаут).
var OptionalAuthGuard = function () {
    var _classDecorators = [(0, common_1.Injectable)()];
    var _classDescriptor;
    var _classExtraInitializers = [];
    var _classThis;
    var OptionalAuthGuard = _classThis = /** @class */ (function () {
        function OptionalAuthGuard_1(jwt) {
            this.jwt = jwt;
        }
        OptionalAuthGuard_1.prototype.canActivate = function (context) {
            var request = context.switchToHttp().getRequest();
            var token = this.extractToken(request);
            if (token) {
                try {
                    request.user = this.jwt.verify(token);
                }
                catch (_a) {
                    // истёкший/невалидный токен — просто гостевой сценарий
                }
            }
            return true;
        };
        OptionalAuthGuard_1.prototype.extractToken = function (request) {
            var _a, _b;
            var authHeader = (_a = request.headers) === null || _a === void 0 ? void 0 : _a.authorization;
            if (authHeader === null || authHeader === void 0 ? void 0 : authHeader.startsWith('Bearer '))
                return authHeader.slice(7);
            if ((_b = request.cookies) === null || _b === void 0 ? void 0 : _b.session)
                return request.cookies.session;
            return null;
        };
        return OptionalAuthGuard_1;
    }());
    __setFunctionName(_classThis, "OptionalAuthGuard");
    (function () {
        var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        OptionalAuthGuard = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return OptionalAuthGuard = _classThis;
}();
exports.OptionalAuthGuard = OptionalAuthGuard;
