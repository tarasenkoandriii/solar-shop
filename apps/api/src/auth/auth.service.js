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
exports.AuthService = void 0;
var common_1 = require("@nestjs/common");
var db_1 = require("@solar-shop/db");
var telegram_util_1 = require("./telegram.util");
var telegram_init_data_util_1 = require("./telegram-init-data.util");
var AuthService = function () {
    var _classDecorators = [(0, common_1.Injectable)()];
    var _classDescriptor;
    var _classExtraInitializers = [];
    var _classThis;
    var AuthService = _classThis = /** @class */ (function () {
        function AuthService_1(prisma, jwt, config) {
            this.prisma = prisma;
            this.jwt = jwt;
            this.config = config;
        }
        // Логин через Telegram Login Widget — сайт и админка теперь используют
        // РАЗНЫХ ботов (у официального Login Widget домен привязывается через
        // @BotFather /setdomain только к одному домену на бота), поэтому нужно
        // проверять подпись против соответствующего токена. Модель User общая —
        // роль (CUSTOMER/MANAGER/ADMIN) не зависит от того, через какого бота
        // прошёл логин, назначается вручную в БД (ТЗ п.20.3), самостоятельная
        // регистрация в привилегированные роли невозможна в любом случае.
        AuthService_1.prototype.loginWithTelegram = function (payload_1) {
            return __awaiter(this, arguments, void 0, function (payload, surface) {
                var envKey, botToken, isValid, telegramId, user, token;
                if (surface === void 0) { surface = 'site'; }
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            envKey = surface === 'admin' ? 'TELEGRAM_ADMIN_BOT_TOKEN' : 'TELEGRAM_BOT_TOKEN';
                            botToken = this.config.get(envKey);
                            if (!botToken)
                                throw new common_1.BadRequestException("".concat(envKey, " not configured"));
                            isValid = (0, telegram_util_1.verifyTelegramLoginPayload)(payload, botToken);
                            if (!isValid)
                                throw new common_1.UnauthorizedException('Invalid Telegram signature');
                            telegramId = String(payload.id);
                            return [4 /*yield*/, this.prisma.client.user.upsert({
                                    where: { telegramId: telegramId },
                                    create: {
                                        telegramId: telegramId,
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
                                })];
                        case 1:
                            user = _a.sent();
                            if (user.isBlocked)
                                throw new common_1.UnauthorizedException('Account is blocked');
                            token = this.jwt.sign({
                                sub: user.id,
                                telegramId: user.telegramId,
                                role: user.role,
                            });
                            return [2 /*return*/, { token: token, user: user }];
                    }
                });
            });
        };
        AuthService_1.prototype.me = function (userId) {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    return [2 /*return*/, this.prisma.client.user.findUnique({ where: { id: userId } })];
                });
            });
        };
        // /bootstrap для TMA (ТЗ п.7/п.20.4) — initData резолвится в ту же таблицу
        // User, что и сайт/админка, единый профиль независимо от точки входа.
        AuthService_1.prototype.bootstrapFromInitData = function (initData) {
            return __awaiter(this, void 0, void 0, function () {
                var botToken, parsed, telegramId, user, token;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            botToken = this.config.get('TELEGRAM_BOT_TOKEN');
                            if (!botToken)
                                throw new common_1.BadRequestException('TELEGRAM_BOT_TOKEN not configured');
                            parsed = (0, telegram_init_data_util_1.verifyTelegramInitData)(initData, botToken);
                            if (!parsed || !parsed.user)
                                throw new common_1.UnauthorizedException('Invalid Telegram initData');
                            telegramId = String(parsed.user.id);
                            return [4 /*yield*/, this.prisma.client.user.upsert({
                                    where: { telegramId: telegramId },
                                    create: {
                                        telegramId: telegramId,
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
                                })];
                        case 1:
                            user = _a.sent();
                            if (user.isBlocked)
                                throw new common_1.UnauthorizedException('Account is blocked');
                            token = this.jwt.sign({ sub: user.id, telegramId: user.telegramId, role: user.role });
                            return [2 /*return*/, { token: token, user: user }];
                    }
                });
            });
        };
        // Dev-логин без Telegram (для локальной разработки под Docker) — жёстко
        // требует ДВЕ независимые проверки: ENABLE_DEV_LOGIN=true И
        // NODE_ENV !== 'production'. Даже если кто-то случайно оставит
        // ENABLE_DEV_LOGIN=true в проде, вторая проверка всё равно заблокирует
        // эндпоинт. 404 вместо 403 — не выдаём даже сам факт существования
        // маршрута в окружениях, где он выключен.
        AuthService_1.prototype.devLogin = function () {
            return __awaiter(this, arguments, void 0, function (role) {
                var telegramId, user, token;
                if (role === void 0) { role = db_1.UserRole.ADMIN; }
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            this.assertDevLoginEnabled();
                            telegramId = "dev-".concat(role.toLowerCase());
                            return [4 /*yield*/, this.prisma.client.user.upsert({
                                    where: { telegramId: telegramId },
                                    create: {
                                        telegramId: telegramId,
                                        username: "dev_".concat(role.toLowerCase()),
                                        firstName: "Dev ".concat(role),
                                        role: role,
                                    },
                                    update: {},
                                })];
                        case 1:
                            user = _a.sent();
                            if (user.isBlocked)
                                throw new common_1.UnauthorizedException('Account is blocked');
                            token = this.jwt.sign({ sub: user.id, telegramId: user.telegramId, role: user.role });
                            return [2 /*return*/, { token: token, user: user }];
                    }
                });
            });
        };
        AuthService_1.prototype.assertDevLoginEnabled = function () {
            var _a;
            var enabled = this.config.get('ENABLE_DEV_LOGIN') === 'true';
            var isProduction = ((_a = this.config.get('NODE_ENV')) !== null && _a !== void 0 ? _a : process.env.NODE_ENV) === 'production';
            if (!enabled || isProduction) {
                throw new common_1.NotFoundException('Not found');
            }
        };
        return AuthService_1;
    }());
    __setFunctionName(_classThis, "AuthService");
    (function () {
        var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        AuthService = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return AuthService = _classThis;
}();
exports.AuthService = AuthService;
