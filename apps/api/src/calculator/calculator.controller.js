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
exports.CalculatorController = void 0;
var common_1 = require("@nestjs/common");
var db_1 = require("@solar-shop/db");
var optional_auth_guard_1 = require("../auth/guards/optional-auth.guard");
var not_restricted_guard_1 = require("../auth/guards/not-restricted.guard");
var jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
var roles_guard_1 = require("../auth/guards/roles.guard");
var roles_decorator_1 = require("../auth/decorators/roles.decorator");
var rate_limit_guard_1 = require("../rate-limit/guards/rate-limit.guard");
var rate_limit_decorator_1 = require("../rate-limit/decorators/rate-limit.decorator");
var CalculatorController = function () {
    var _classDecorators = [(0, common_1.Controller)()];
    var _classDescriptor;
    var _classExtraInitializers = [];
    var _classThis;
    var _instanceExtraInitializers = [];
    var _start_decorators;
    var _findById_decorators;
    var _refine_decorators;
    var _updateSpec_decorators;
    var _finalize_decorators;
    var _requestDocuments_decorators;
    var _addToCart_decorators;
    var _exportPackage_decorators;
    var _send_decorators;
    var _mergeGuestEstimates_decorators;
    var _findMine_decorators;
    var _findAllForAdmin_decorators;
    var _findAllDeliveries_decorators;
    var _convertToOrder_decorators;
    var CalculatorController = _classThis = /** @class */ (function () {
        function CalculatorController_1(service) {
            this.service = (__runInitializers(this, _instanceExtraInitializers), service);
        }
        // ТЗ п.31.1 — старт квиза, доступен и гостю
        CalculatorController_1.prototype.start = function (user, dto) {
            var _a;
            return this.service.start((_a = user === null || user === void 0 ? void 0 : user.sub) !== null && _a !== void 0 ? _a : null, dto);
        };
        CalculatorController_1.prototype.findById = function (user, id, sessionId) {
            var _a;
            return this.service.findById(id, (_a = user === null || user === void 0 ? void 0 : user.sub) !== null && _a !== void 0 ? _a : null, sessionId !== null && sessionId !== void 0 ? sessionId : null);
        };
        // Rate limit на уровне конкретного estimateId — внутри сервиса
        // (RateLimitService.checkAndIncrement с ключом по id), см. ТЗ п.31.9.
        CalculatorController_1.prototype.refine = function (user, id, dto, sessionId) {
            var _a;
            return this.service.refine(id, (_a = user === null || user === void 0 ? void 0 : user.sub) !== null && _a !== void 0 ? _a : null, sessionId !== null && sessionId !== void 0 ? sessionId : null, dto);
        };
        CalculatorController_1.prototype.updateSpec = function (user, id, dto, sessionId) {
            var _a;
            return this.service.updateSpec(id, (_a = user === null || user === void 0 ? void 0 : user.sub) !== null && _a !== void 0 ? _a : null, sessionId !== null && sessionId !== void 0 ? sessionId : null, dto);
        };
        CalculatorController_1.prototype.finalize = function (user, id, sessionId) {
            var _a;
            return this.service.finalize(id, (_a = user === null || user === void 0 ? void 0 : user.sub) !== null && _a !== void 0 ? _a : null, sessionId !== null && sessionId !== void 0 ? sessionId : null);
        };
        // ТЗ п.31.11.0 — чек-лист документов, ставит в очередь batch-генерации
        CalculatorController_1.prototype.requestDocuments = function (user, id, dto, sessionId) {
            var _a;
            return this.service.requestDocuments(id, (_a = user === null || user === void 0 ? void 0 : user.sub) !== null && _a !== void 0 ? _a : null, sessionId !== null && sessionId !== void 0 ? sessionId : null, dto);
        };
        CalculatorController_1.prototype.addToCart = function (user, id, dto, sessionId) {
            var _a;
            return this.service.addToCart(id, (_a = user === null || user === void 0 ? void 0 : user.sub) !== null && _a !== void 0 ? _a : null, sessionId !== null && sessionId !== void 0 ? sessionId : null, dto.productIds);
        };
        CalculatorController_1.prototype.exportPackage = function (user, id, sessionId) {
            var _a;
            return this.service.exportPackage(id, (_a = user === null || user === void 0 ? void 0 : user.sub) !== null && _a !== void 0 ? _a : null, sessionId !== null && sessionId !== void 0 ? sessionId : null);
        };
        CalculatorController_1.prototype.send = function (user, id, dto, sessionId) {
            var _a;
            return this.service.send(id, (_a = user === null || user === void 0 ? void 0 : user.sub) !== null && _a !== void 0 ? _a : null, sessionId !== null && sessionId !== void 0 ? sessionId : null, dto);
        };
        // ТЗ п.31.7 — вызывается фронтендом сразу после успешного Telegram-логина,
        // тот же паттерн, что CartController.mergeGuestCart
        CalculatorController_1.prototype.mergeGuestEstimates = function (user, sessionId) {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    if (!sessionId)
                        return [2 /*return*/, { merged: 0 }];
                    return [2 /*return*/, this.service.mergeGuestEstimates(sessionId, user.sub)];
                });
            });
        };
        // ТЗ п.31.7 — /account/projects
        CalculatorController_1.prototype.findMine = function (user) {
            return this.service.findMine(user.sub);
        };
        // ---- Admin (ТЗ п.31.8) ----
        CalculatorController_1.prototype.findAllForAdmin = function () {
            return this.service.findAllForAdmin();
        };
        // По запросу — отдельная вкладка «Контакти доставки»: куда/когда/статус
        // отправки материалов (email/telegram/whatsapp/viber)
        CalculatorController_1.prototype.findAllDeliveries = function () {
            return this.service.findAllDeliveries();
        };
        CalculatorController_1.prototype.convertToOrder = function (id) {
            return this.service.convertToOrder(id);
        };
        return CalculatorController_1;
    }());
    __setFunctionName(_classThis, "CalculatorController");
    (function () {
        var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        _start_decorators = [(0, common_1.UseGuards)(optional_auth_guard_1.OptionalAuthGuard, not_restricted_guard_1.NotRestrictedGuard, rate_limit_guard_1.RateLimitGuard), (0, rate_limit_decorator_1.RateLimit)({ limit: 10, windowSeconds: 60 }), (0, common_1.Post)('calculator/start')];
        _findById_decorators = [(0, common_1.UseGuards)(optional_auth_guard_1.OptionalAuthGuard), (0, common_1.Get)('calculator/:id')];
        _refine_decorators = [(0, common_1.UseGuards)(optional_auth_guard_1.OptionalAuthGuard, not_restricted_guard_1.NotRestrictedGuard), (0, common_1.Post)('calculator/:id/refine')];
        _updateSpec_decorators = [(0, common_1.UseGuards)(optional_auth_guard_1.OptionalAuthGuard), (0, common_1.Put)('calculator/:id/spec')];
        _finalize_decorators = [(0, common_1.UseGuards)(optional_auth_guard_1.OptionalAuthGuard), (0, common_1.Post)('calculator/:id/finalize')];
        _requestDocuments_decorators = [(0, common_1.UseGuards)(optional_auth_guard_1.OptionalAuthGuard, not_restricted_guard_1.NotRestrictedGuard), (0, common_1.Post)('calculator/:id/request-documents')];
        _addToCart_decorators = [(0, common_1.UseGuards)(optional_auth_guard_1.OptionalAuthGuard), (0, common_1.Post)('calculator/:id/add-to-cart')];
        _exportPackage_decorators = [(0, common_1.UseGuards)(optional_auth_guard_1.OptionalAuthGuard, not_restricted_guard_1.NotRestrictedGuard, rate_limit_guard_1.RateLimitGuard), (0, rate_limit_decorator_1.RateLimit)({ limit: 5, windowSeconds: 60 }), (0, common_1.Post)('calculator/:id/export')];
        _send_decorators = [(0, common_1.UseGuards)(optional_auth_guard_1.OptionalAuthGuard, not_restricted_guard_1.NotRestrictedGuard, rate_limit_guard_1.RateLimitGuard), (0, rate_limit_decorator_1.RateLimit)({ limit: 5, windowSeconds: 60 }), (0, common_1.Post)('calculator/:id/send')];
        _mergeGuestEstimates_decorators = [(0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard), (0, common_1.Post)('calculator/merge')];
        _findMine_decorators = [(0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard), (0, common_1.Get)('account/projects')];
        _findAllForAdmin_decorators = [(0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard), (0, roles_decorator_1.Roles)(db_1.UserRole.ADMIN, db_1.UserRole.MANAGER), (0, common_1.Get)('admin/calculator/estimates')];
        _findAllDeliveries_decorators = [(0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard), (0, roles_decorator_1.Roles)(db_1.UserRole.ADMIN, db_1.UserRole.MANAGER), (0, common_1.Get)('admin/calculator/deliveries')];
        _convertToOrder_decorators = [(0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard), (0, roles_decorator_1.Roles)(db_1.UserRole.ADMIN, db_1.UserRole.MANAGER), (0, common_1.Post)('admin/calculator/estimates/:id/convert-to-order')];
        __esDecorate(_classThis, null, _start_decorators, { kind: "method", name: "start", static: false, private: false, access: { has: function (obj) { return "start" in obj; }, get: function (obj) { return obj.start; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _findById_decorators, { kind: "method", name: "findById", static: false, private: false, access: { has: function (obj) { return "findById" in obj; }, get: function (obj) { return obj.findById; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _refine_decorators, { kind: "method", name: "refine", static: false, private: false, access: { has: function (obj) { return "refine" in obj; }, get: function (obj) { return obj.refine; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _updateSpec_decorators, { kind: "method", name: "updateSpec", static: false, private: false, access: { has: function (obj) { return "updateSpec" in obj; }, get: function (obj) { return obj.updateSpec; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _finalize_decorators, { kind: "method", name: "finalize", static: false, private: false, access: { has: function (obj) { return "finalize" in obj; }, get: function (obj) { return obj.finalize; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _requestDocuments_decorators, { kind: "method", name: "requestDocuments", static: false, private: false, access: { has: function (obj) { return "requestDocuments" in obj; }, get: function (obj) { return obj.requestDocuments; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _addToCart_decorators, { kind: "method", name: "addToCart", static: false, private: false, access: { has: function (obj) { return "addToCart" in obj; }, get: function (obj) { return obj.addToCart; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _exportPackage_decorators, { kind: "method", name: "exportPackage", static: false, private: false, access: { has: function (obj) { return "exportPackage" in obj; }, get: function (obj) { return obj.exportPackage; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _send_decorators, { kind: "method", name: "send", static: false, private: false, access: { has: function (obj) { return "send" in obj; }, get: function (obj) { return obj.send; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _mergeGuestEstimates_decorators, { kind: "method", name: "mergeGuestEstimates", static: false, private: false, access: { has: function (obj) { return "mergeGuestEstimates" in obj; }, get: function (obj) { return obj.mergeGuestEstimates; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _findMine_decorators, { kind: "method", name: "findMine", static: false, private: false, access: { has: function (obj) { return "findMine" in obj; }, get: function (obj) { return obj.findMine; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _findAllForAdmin_decorators, { kind: "method", name: "findAllForAdmin", static: false, private: false, access: { has: function (obj) { return "findAllForAdmin" in obj; }, get: function (obj) { return obj.findAllForAdmin; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _findAllDeliveries_decorators, { kind: "method", name: "findAllDeliveries", static: false, private: false, access: { has: function (obj) { return "findAllDeliveries" in obj; }, get: function (obj) { return obj.findAllDeliveries; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _convertToOrder_decorators, { kind: "method", name: "convertToOrder", static: false, private: false, access: { has: function (obj) { return "convertToOrder" in obj; }, get: function (obj) { return obj.convertToOrder; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        CalculatorController = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return CalculatorController = _classThis;
}();
exports.CalculatorController = CalculatorController;
