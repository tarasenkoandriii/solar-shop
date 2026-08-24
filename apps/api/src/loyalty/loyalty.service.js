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
exports.LoyaltyService = void 0;
var common_1 = require("@nestjs/common");
// ТЗ п.23.3-23.4 — накопительная скидка, действует только у авторизованных
// через Telegram (лишний стимул логиниться).
var LoyaltyService = function () {
    var _classDecorators = [(0, common_1.Injectable)()];
    var _classDescriptor;
    var _classExtraInitializers = [];
    var _classThis;
    var LoyaltyService = _classThis = /** @class */ (function () {
        function LoyaltyService_1(prisma) {
            this.prisma = prisma;
        }
        LoyaltyService_1.prototype.getTiers = function () {
            return this.prisma.client.loyaltyTier.findMany({ orderBy: { minSpendUah: 'asc' } });
        };
        LoyaltyService_1.prototype.createTier = function (dto) {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.validateOrdering(dto.minSpendUah, dto.discountPercent)];
                        case 1:
                            _a.sent();
                            return [2 /*return*/, this.prisma.client.loyaltyTier.create({ data: dto })];
                    }
                });
            });
        };
        LoyaltyService_1.prototype.updateTier = function (id, dto) {
            return __awaiter(this, void 0, void 0, function () {
                var existing, minSpendUah, discountPercent;
                var _a, _b;
                return __generator(this, function (_c) {
                    switch (_c.label) {
                        case 0: return [4 /*yield*/, this.prisma.client.loyaltyTier.findUnique({ where: { id: id } })];
                        case 1:
                            existing = _c.sent();
                            if (!existing)
                                throw new common_1.NotFoundException('Tier not found');
                            minSpendUah = (_a = dto.minSpendUah) !== null && _a !== void 0 ? _a : Number(existing.minSpendUah);
                            discountPercent = (_b = dto.discountPercent) !== null && _b !== void 0 ? _b : existing.discountPercent;
                            return [4 /*yield*/, this.validateOrdering(minSpendUah, discountPercent, id)];
                        case 2:
                            _c.sent();
                            return [2 /*return*/, this.prisma.client.loyaltyTier.update({ where: { id: id }, data: dto })];
                    }
                });
            });
        };
        LoyaltyService_1.prototype.removeTier = function (id) {
            return __awaiter(this, void 0, void 0, function () {
                var existing;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.prisma.client.loyaltyTier.findUnique({ where: { id: id } })];
                        case 1:
                            existing = _a.sent();
                            if (!existing)
                                throw new common_1.NotFoundException('Tier not found');
                            return [4 /*yield*/, this.prisma.client.loyaltyTier.delete({ where: { id: id } })];
                        case 2:
                            _a.sent();
                            return [2 /*return*/, { ok: true }];
                    }
                });
            });
        };
        // Действующая скидка = максимальный discountPercent среди уровней, чей
        // minSpendUah <= lifetimeSpendUah (ТЗ п.23.3). Только для авторизованных.
        LoyaltyService_1.prototype.getDiscountForUser = function (userId) {
            return __awaiter(this, void 0, void 0, function () {
                var user, tiers;
                var _a, _b;
                return __generator(this, function (_c) {
                    switch (_c.label) {
                        case 0:
                            if (!userId)
                                return [2 /*return*/, 0];
                            return [4 /*yield*/, this.prisma.client.user.findUnique({ where: { id: userId } })];
                        case 1:
                            user = _c.sent();
                            if (!user)
                                return [2 /*return*/, 0];
                            return [4 /*yield*/, this.prisma.client.loyaltyTier.findMany({
                                    where: { minSpendUah: { lte: user.lifetimeSpendUah } },
                                    orderBy: { discountPercent: 'desc' },
                                    take: 1,
                                })];
                        case 2:
                            tiers = _c.sent();
                            return [2 /*return*/, (_b = (_a = tiers[0]) === null || _a === void 0 ? void 0 : _a.discountPercent) !== null && _b !== void 0 ? _b : 0];
                    }
                });
            });
        };
        // Пересчёт кэша lifetimeSpendUah — вызывается OrdersService при переходе
        // заказа в PAID (ТЗ п.23.3, считаем с момента PAID, не SHIPPED).
        LoyaltyService_1.prototype.recalculateLifetimeSpend = function (userId) {
            return __awaiter(this, void 0, void 0, function () {
                var paidOrders, total;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.prisma.client.order.findMany({
                                where: { userId: userId, status: { in: ['PAID', 'SHIPPED'] } },
                                select: { totalUah: true },
                            })];
                        case 1:
                            paidOrders = _a.sent();
                            total = paidOrders.reduce(function (sum, o) { return sum + Number(o.totalUah); }, 0);
                            return [4 /*yield*/, this.prisma.client.user.update({ where: { id: userId }, data: { lifetimeSpendUah: total } })];
                        case 2:
                            _a.sent();
                            return [2 /*return*/];
                    }
                });
            });
        };
        // Валидация формы (ТЗ п.23.4): пороги уникальны и упорядочены — нельзя
        // задать более высокую скидку на более низком пороге, чем на высоком.
        LoyaltyService_1.prototype.validateOrdering = function (minSpendUah, discountPercent, excludeId) {
            return __awaiter(this, void 0, void 0, function () {
                var others, _i, others_1, other, otherMin;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.prisma.client.loyaltyTier.findMany({ where: { id: { not: excludeId } } })];
                        case 1:
                            others = _a.sent();
                            for (_i = 0, others_1 = others; _i < others_1.length; _i++) {
                                other = others_1[_i];
                                otherMin = Number(other.minSpendUah);
                                if (otherMin < minSpendUah && other.discountPercent > discountPercent) {
                                    throw new common_1.BadRequestException("\u041F\u043E\u0440\u043E\u0433 ".concat(minSpendUah, "\u20B4 \u0441\u043E \u0441\u043A\u0438\u0434\u043A\u043E\u0439 ").concat(discountPercent, "% \u043D\u0438\u0436\u0435, \u0447\u0435\u043C \u0443\u0436\u0435 \u0441\u0443\u0449\u0435\u0441\u0442\u0432\u0443\u044E\u0449\u0438\u0439 \u043F\u043E\u0440\u043E\u0433 ").concat(otherMin, "\u20B4 (").concat(other.discountPercent, "%) \u2014 \u0443\u0440\u043E\u0432\u043D\u0438 \u0434\u043E\u043B\u0436\u043D\u044B \u0431\u044B\u0442\u044C \u043C\u043E\u043D\u043E\u0442\u043E\u043D\u043D\u043E \u0432\u043E\u0437\u0440\u0430\u0441\u0442\u0430\u044E\u0449\u0438\u043C\u0438"));
                                }
                                if (otherMin > minSpendUah && other.discountPercent < discountPercent) {
                                    throw new common_1.BadRequestException("\u041F\u043E\u0440\u043E\u0433 ".concat(minSpendUah, "\u20B4 \u0441\u043E \u0441\u043A\u0438\u0434\u043A\u043E\u0439 ").concat(discountPercent, "% \u0432\u044B\u0448\u0435, \u0447\u0435\u043C \u0443\u0436\u0435 \u0441\u0443\u0449\u0435\u0441\u0442\u0432\u0443\u044E\u0449\u0438\u0439 \u0431\u043E\u043B\u0435\u0435 \u0432\u044B\u0441\u043E\u043A\u0438\u0439 \u043F\u043E\u0440\u043E\u0433 ").concat(otherMin, "\u20B4 (").concat(other.discountPercent, "%) \u2014 \u0443\u0440\u043E\u0432\u043D\u0438 \u0434\u043E\u043B\u0436\u043D\u044B \u0431\u044B\u0442\u044C \u043C\u043E\u043D\u043E\u0442\u043E\u043D\u043D\u043E \u0432\u043E\u0437\u0440\u0430\u0441\u0442\u0430\u044E\u0449\u0438\u043C\u0438"));
                                }
                            }
                            return [2 /*return*/];
                    }
                });
            });
        };
        return LoyaltyService_1;
    }());
    __setFunctionName(_classThis, "LoyaltyService");
    (function () {
        var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        LoyaltyService = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return LoyaltyService = _classThis;
}();
exports.LoyaltyService = LoyaltyService;
