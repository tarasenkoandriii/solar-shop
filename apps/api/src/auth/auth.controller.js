"use strict";
var __runInitializers = (this && this.__runInitializers) || function (thisArg, initializers, value) {
    var useValue = arguments.length > 2;
    for (var i = 0; i < initializers.length; i++) {
        value = useValue ? initializers[i].call(thisArg, value) : initializers[i].call(thisArg);
    }
    return useValue ? value : void 0;
};
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
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __setFunctionName = (this && this.__setFunctionName) || function (f, name, prefix) {
    if (typeof name === "symbol") name = name.description ? "[".concat(name.description, "]") : "";
    return Object.defineProperty(f, "name", { configurable: true, value: prefix ? "".concat(prefix, " ", name) : name });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthController = void 0;
var common_1 = require("@nestjs/common");
var db_1 = require("@solar-shop/db");
var jwt_auth_guard_1 = require("./guards/jwt-auth.guard");
var rate_limit_guard_1 = require("../rate-limit/guards/rate-limit.guard");
var rate_limit_decorator_1 = require("../rate-limit/decorators/rate-limit.decorator");
var AuthController = function () {
    var _classDecorators = [(0, common_1.Controller)('auth')];
    var _classDescriptor;
    var _classExtraInitializers = [];
    var _classThis;
    var _instanceExtraInitializers = [];
    var _telegramLogin_decorators;
    var _telegramLoginAdmin_decorators;
    var _me_decorators;
    var _logout_decorators;
    var _devLogin_decorators;
    var _bootstrap_decorators;
    var AuthController = _classThis = /** @class */ (function () {
        function AuthController_1(authService) {
            this.authService = (__runInitializers(this, _instanceExtraInitializers), authService);
        }
        // ТЗ п.28.3 — Login Widget callback защищён от подбора/спама подписанных данных
        AuthController_1.prototype.telegramLogin = function (dto, res) {
            return __awaiter(this, void 0, void 0, function () {
                var _a, token, user;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0: return [4 /*yield*/, this.authService.loginWithTelegram(dto, 'site')];
                        case 1:
                            _a = _b.sent(), token = _a.token, user = _a.user;
                            res.cookie('session', token, {
                                httpOnly: true,
                                sameSite: 'lax',
                                secure: process.env.NODE_ENV === 'production',
                                maxAge: 30 * 24 * 60 * 60 * 1000,
                            });
                            return [2 /*return*/, { user: user }];
                    }
                });
            });
        };
        // Отдельный бот для админки (у Login Widget домен привязывается через
        // @BotFather /setdomain только к одному домену на бота — если apps/web и
        // apps/admin живут на разных доменах, одним ботом не обойтись). Cookie —
        // тоже отдельная (домен admin), схема идентична /auth/telegram.
        AuthController_1.prototype.telegramLoginAdmin = function (dto, res) {
            return __awaiter(this, void 0, void 0, function () {
                var _a, token, user;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0: return [4 /*yield*/, this.authService.loginWithTelegram(dto, 'admin')];
                        case 1:
                            _a = _b.sent(), token = _a.token, user = _a.user;
                            res.cookie('session', token, {
                                httpOnly: true,
                                sameSite: 'lax',
                                secure: process.env.NODE_ENV === 'production',
                                maxAge: 30 * 24 * 60 * 60 * 1000,
                            });
                            return [2 /*return*/, { user: user }];
                    }
                });
            });
        };
        AuthController_1.prototype.me = function (jwtUser) {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    return [2 /*return*/, this.authService.me(jwtUser.sub)];
                });
            });
        };
        AuthController_1.prototype.logout = function (res) {
            res.clearCookie('session');
            return { ok: true };
        };
        // Dev-вход без Telegram — работает только если ENABLE_DEV_LOGIN=true И
        // NODE_ENV !== 'production' (двойная защита, см. AuthService.devLogin).
        // Cookie ставится точно так же, как при обычном логине — фронтенд-код
        // (AuthGate) после этого ведёт себя идентично реальному входу.
        AuthController_1.prototype.devLogin = function (dto, res) {
            return __awaiter(this, void 0, void 0, function () {
                var _a, token, user;
                var _b;
                return __generator(this, function (_c) {
                    switch (_c.label) {
                        case 0: return [4 /*yield*/, this.authService.devLogin((_b = dto.role) !== null && _b !== void 0 ? _b : db_1.UserRole.ADMIN)];
                        case 1:
                            _a = _c.sent(), token = _a.token, user = _a.user;
                            res.cookie('session', token, {
                                httpOnly: true,
                                sameSite: 'lax',
                                secure: process.env.NODE_ENV === 'production',
                                maxAge: 30 * 24 * 60 * 60 * 1000,
                            });
                            return [2 /*return*/, { user: user }];
                    }
                });
            });
        };
        // Инициализация сессии TMA (ТЗ п.7) — принимает сырую initData строку в
        // заголовке X-Telegram-Init-Data, отдаёт JWT телу ответа (не cookie,
        // Telegram WebView иногда режет third-party cookies) — фронтенд TMA сам
        // решает, хранить ли токен в памяти/localStorage на время сессии.
        AuthController_1.prototype.bootstrap = function (initData) {
            return __awaiter(this, void 0, void 0, function () {
                var _a, token, user;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            if (!initData)
                                return [2 /*return*/, { error: 'Missing X-Telegram-Init-Data header' }];
                            return [4 /*yield*/, this.authService.bootstrapFromInitData(initData)];
                        case 1:
                            _a = _b.sent(), token = _a.token, user = _a.user;
                            return [2 /*return*/, { token: token, user: user }];
                    }
                });
            });
        };
        return AuthController_1;
    }());
    __setFunctionName(_classThis, "AuthController");
    (function () {
        var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        _telegramLogin_decorators = [(0, common_1.UseGuards)(rate_limit_guard_1.RateLimitGuard), (0, rate_limit_decorator_1.RateLimit)({ limit: 10, windowSeconds: 60 }), (0, common_1.Post)('telegram')];
        _telegramLoginAdmin_decorators = [(0, common_1.UseGuards)(rate_limit_guard_1.RateLimitGuard), (0, rate_limit_decorator_1.RateLimit)({ limit: 10, windowSeconds: 60 }), (0, common_1.Post)('telegram/admin')];
        _me_decorators = [(0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard), (0, common_1.Get)('me')];
        _logout_decorators = [(0, common_1.Post)('logout')];
        _devLogin_decorators = [(0, common_1.Post)('dev-login')];
        _bootstrap_decorators = [(0, common_1.UseGuards)(rate_limit_guard_1.RateLimitGuard), (0, rate_limit_decorator_1.RateLimit)({ limit: 20, windowSeconds: 60 }), (0, common_1.Post)('bootstrap')];
        __esDecorate(_classThis, null, _telegramLogin_decorators, { kind: "method", name: "telegramLogin", static: false, private: false, access: { has: function (obj) { return "telegramLogin" in obj; }, get: function (obj) { return obj.telegramLogin; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _telegramLoginAdmin_decorators, { kind: "method", name: "telegramLoginAdmin", static: false, private: false, access: { has: function (obj) { return "telegramLoginAdmin" in obj; }, get: function (obj) { return obj.telegramLoginAdmin; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _me_decorators, { kind: "method", name: "me", static: false, private: false, access: { has: function (obj) { return "me" in obj; }, get: function (obj) { return obj.me; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _logout_decorators, { kind: "method", name: "logout", static: false, private: false, access: { has: function (obj) { return "logout" in obj; }, get: function (obj) { return obj.logout; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _devLogin_decorators, { kind: "method", name: "devLogin", static: false, private: false, access: { has: function (obj) { return "devLogin" in obj; }, get: function (obj) { return obj.devLogin; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _bootstrap_decorators, { kind: "method", name: "bootstrap", static: false, private: false, access: { has: function (obj) { return "bootstrap" in obj; }, get: function (obj) { return obj.bootstrap; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        AuthController = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return AuthController = _classThis;
}();
exports.AuthController = AuthController;
