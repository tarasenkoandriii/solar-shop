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
exports.OrdersController = void 0;
var common_1 = require("@nestjs/common");
var db_1 = require("@solar-shop/db");
var optional_auth_guard_1 = require("../auth/guards/optional-auth.guard");
var not_restricted_guard_1 = require("../auth/guards/not-restricted.guard");
var jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
var roles_guard_1 = require("../auth/guards/roles.guard");
var roles_decorator_1 = require("../auth/decorators/roles.decorator");
var rate_limit_guard_1 = require("../rate-limit/guards/rate-limit.guard");
var rate_limit_decorator_1 = require("../rate-limit/decorators/rate-limit.decorator");
var OrdersController = function () {
    var _classDecorators = [(0, common_1.Controller)()];
    var _classDescriptor;
    var _classExtraInitializers = [];
    var _classThis;
    var _instanceExtraInitializers = [];
    var _checkout_decorators;
    var _buyNow_decorators;
    var _myOrders_decorators;
    var _myOrderDetail_decorators;
    var _findAllForAdmin_decorators;
    var _findOneForAdmin_decorators;
    var _updateStatus_decorators;
    var _generateInvoice_decorators;
    var _createTtn_decorators;
    var _printLabel_decorators;
    var _cancelTtn_decorators;
    var OrdersController = _classThis = /** @class */ (function () {
        function OrdersController_1(service) {
            this.service = (__runInitializers(this, _instanceExtraInitializers), service);
        }
        // Чекаут из корзины — гость или авторизованный (ТЗ п.19.2). Rate limit +
        // блокировка (ТЗ п.28.3/28.4) — заказ дорогая операция (внешние вызовы NP/PDF).
        OrdersController_1.prototype.checkout = function (user, dto) {
            var _a, _b;
            return this.service.checkoutFromCart((_a = user === null || user === void 0 ? void 0 : user.sub) !== null && _a !== void 0 ? _a : null, (_b = dto.sessionId) !== null && _b !== void 0 ? _b : null, dto);
        };
        OrdersController_1.prototype.buyNow = function (user, dto) {
            var _a;
            return this.service.buyNow((_a = user === null || user === void 0 ? void 0 : user.sub) !== null && _a !== void 0 ? _a : null, dto);
        };
        OrdersController_1.prototype.myOrders = function (user) {
            return this.service.findMyOrders(user.sub);
        };
        OrdersController_1.prototype.myOrderDetail = function (user, id) {
            return __awaiter(this, void 0, void 0, function () {
                var order;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.service.findById(id)];
                        case 1:
                            order = _a.sent();
                            // Личный кабинет — только свои заказы, не проверка на уровне БД-запроса
                            // (findById переиспользуется и админкой), поэтому фильтр здесь.
                            if (order.userId !== user.sub)
                                return [2 /*return*/, { error: 'Not found' }];
                            return [2 /*return*/, order];
                    }
                });
            });
        };
        // ---- Admin ----
        OrdersController_1.prototype.findAllForAdmin = function (status) {
            return this.service.findAllForAdmin(status);
        };
        OrdersController_1.prototype.findOneForAdmin = function (id) {
            return this.service.findById(id);
        };
        OrdersController_1.prototype.updateStatus = function (id, dto) {
            return this.service.updateStatus(id, dto.status);
        };
        OrdersController_1.prototype.generateInvoice = function (id) {
            return this.service.generateInvoice(id);
        };
        OrdersController_1.prototype.createTtn = function (id) {
            return this.service.createTtnManually(id);
        };
        OrdersController_1.prototype.printLabel = function (id) {
            return this.service.printLabel(id);
        };
        OrdersController_1.prototype.cancelTtn = function (id) {
            return this.service.cancelTtn(id);
        };
        return OrdersController_1;
    }());
    __setFunctionName(_classThis, "OrdersController");
    (function () {
        var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        _checkout_decorators = [(0, common_1.UseGuards)(optional_auth_guard_1.OptionalAuthGuard, not_restricted_guard_1.NotRestrictedGuard, rate_limit_guard_1.RateLimitGuard), (0, rate_limit_decorator_1.RateLimit)({ limit: 10, windowSeconds: 60 }), (0, common_1.Post)('orders/checkout')];
        _buyNow_decorators = [(0, common_1.UseGuards)(optional_auth_guard_1.OptionalAuthGuard, not_restricted_guard_1.NotRestrictedGuard, rate_limit_guard_1.RateLimitGuard), (0, rate_limit_decorator_1.RateLimit)({ limit: 10, windowSeconds: 60 }), (0, common_1.Post)('orders/buy-now')];
        _myOrders_decorators = [(0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard), (0, common_1.Get)('account/orders')];
        _myOrderDetail_decorators = [(0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard), (0, common_1.Get)('account/orders/:id')];
        _findAllForAdmin_decorators = [(0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard), (0, roles_decorator_1.Roles)(db_1.UserRole.ADMIN, db_1.UserRole.MANAGER), (0, common_1.Get)('admin/orders')];
        _findOneForAdmin_decorators = [(0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard), (0, roles_decorator_1.Roles)(db_1.UserRole.ADMIN, db_1.UserRole.MANAGER), (0, common_1.Get)('admin/orders/:id')];
        _updateStatus_decorators = [(0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard), (0, roles_decorator_1.Roles)(db_1.UserRole.ADMIN, db_1.UserRole.MANAGER), (0, common_1.Put)('admin/orders/:id/status')];
        _generateInvoice_decorators = [(0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard), (0, roles_decorator_1.Roles)(db_1.UserRole.ADMIN, db_1.UserRole.MANAGER), (0, common_1.Post)('admin/orders/:id/invoice')];
        _createTtn_decorators = [(0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard), (0, roles_decorator_1.Roles)(db_1.UserRole.ADMIN, db_1.UserRole.MANAGER), (0, common_1.Post)('admin/orders/:id/ttn')];
        _printLabel_decorators = [(0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard), (0, roles_decorator_1.Roles)(db_1.UserRole.ADMIN, db_1.UserRole.MANAGER), (0, common_1.Post)('admin/orders/:id/ttn/print')];
        _cancelTtn_decorators = [(0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard), (0, roles_decorator_1.Roles)(db_1.UserRole.ADMIN, db_1.UserRole.MANAGER), (0, common_1.Post)('admin/orders/:id/ttn/cancel')];
        __esDecorate(_classThis, null, _checkout_decorators, { kind: "method", name: "checkout", static: false, private: false, access: { has: function (obj) { return "checkout" in obj; }, get: function (obj) { return obj.checkout; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _buyNow_decorators, { kind: "method", name: "buyNow", static: false, private: false, access: { has: function (obj) { return "buyNow" in obj; }, get: function (obj) { return obj.buyNow; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _myOrders_decorators, { kind: "method", name: "myOrders", static: false, private: false, access: { has: function (obj) { return "myOrders" in obj; }, get: function (obj) { return obj.myOrders; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _myOrderDetail_decorators, { kind: "method", name: "myOrderDetail", static: false, private: false, access: { has: function (obj) { return "myOrderDetail" in obj; }, get: function (obj) { return obj.myOrderDetail; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _findAllForAdmin_decorators, { kind: "method", name: "findAllForAdmin", static: false, private: false, access: { has: function (obj) { return "findAllForAdmin" in obj; }, get: function (obj) { return obj.findAllForAdmin; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _findOneForAdmin_decorators, { kind: "method", name: "findOneForAdmin", static: false, private: false, access: { has: function (obj) { return "findOneForAdmin" in obj; }, get: function (obj) { return obj.findOneForAdmin; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _updateStatus_decorators, { kind: "method", name: "updateStatus", static: false, private: false, access: { has: function (obj) { return "updateStatus" in obj; }, get: function (obj) { return obj.updateStatus; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _generateInvoice_decorators, { kind: "method", name: "generateInvoice", static: false, private: false, access: { has: function (obj) { return "generateInvoice" in obj; }, get: function (obj) { return obj.generateInvoice; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _createTtn_decorators, { kind: "method", name: "createTtn", static: false, private: false, access: { has: function (obj) { return "createTtn" in obj; }, get: function (obj) { return obj.createTtn; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _printLabel_decorators, { kind: "method", name: "printLabel", static: false, private: false, access: { has: function (obj) { return "printLabel" in obj; }, get: function (obj) { return obj.printLabel; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _cancelTtn_decorators, { kind: "method", name: "cancelTtn", static: false, private: false, access: { has: function (obj) { return "cancelTtn" in obj; }, get: function (obj) { return obj.cancelTtn; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        OrdersController = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return OrdersController = _classThis;
}();
exports.OrdersController = OrdersController;
