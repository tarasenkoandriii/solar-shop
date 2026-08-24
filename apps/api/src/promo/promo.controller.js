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
var __setFunctionName = (this && this.__setFunctionName) || function (f, name, prefix) {
    if (typeof name === "symbol") name = name.description ? "[".concat(name.description, "]") : "";
    return Object.defineProperty(f, "name", { configurable: true, value: prefix ? "".concat(prefix, " ", name) : name });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PromoController = void 0;
var common_1 = require("@nestjs/common");
var db_1 = require("@solar-shop/db");
var jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
var roles_guard_1 = require("../auth/guards/roles.guard");
var roles_decorator_1 = require("../auth/decorators/roles.decorator");
var PromoController = function () {
    var _classDecorators = [(0, common_1.Controller)()];
    var _classDescriptor;
    var _classExtraInitializers = [];
    var _classThis;
    var _instanceExtraInitializers = [];
    var _getPromoProducts_decorators;
    var _getSettings_decorators;
    var _upsertSettings_decorators;
    var _recalculate_decorators;
    var PromoController = _classThis = /** @class */ (function () {
        function PromoController_1(service) {
            this.service = (__runInitializers(this, _instanceExtraInitializers), service);
        }
        // Публично — бейджи "Акция" на витрине читают Product.cachedIsPromo
        // напрямую через ProductsController, здесь только список для отдельного
        // маркетингового блока/страницы, если понадобится (ТЗ п.18.4).
        PromoController_1.prototype.getPromoProducts = function () {
            return this.service.getPromoProducts();
        };
        PromoController_1.prototype.getSettings = function () {
            return this.service.getSettings();
        };
        PromoController_1.prototype.upsertSettings = function (dto) {
            return this.service.upsertSettings(dto);
        };
        PromoController_1.prototype.recalculate = function () {
            return this.service.recalculateAll();
        };
        return PromoController_1;
    }());
    __setFunctionName(_classThis, "PromoController");
    (function () {
        var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        _getPromoProducts_decorators = [(0, common_1.Get)('promo/products')];
        _getSettings_decorators = [(0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard), (0, roles_decorator_1.Roles)(db_1.UserRole.ADMIN), (0, common_1.Get)('admin/promo/settings')];
        _upsertSettings_decorators = [(0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard), (0, roles_decorator_1.Roles)(db_1.UserRole.ADMIN), (0, common_1.Post)('admin/promo/settings')];
        _recalculate_decorators = [(0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard), (0, roles_decorator_1.Roles)(db_1.UserRole.ADMIN), (0, common_1.Post)('admin/promo/recalculate')];
        __esDecorate(_classThis, null, _getPromoProducts_decorators, { kind: "method", name: "getPromoProducts", static: false, private: false, access: { has: function (obj) { return "getPromoProducts" in obj; }, get: function (obj) { return obj.getPromoProducts; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _getSettings_decorators, { kind: "method", name: "getSettings", static: false, private: false, access: { has: function (obj) { return "getSettings" in obj; }, get: function (obj) { return obj.getSettings; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _upsertSettings_decorators, { kind: "method", name: "upsertSettings", static: false, private: false, access: { has: function (obj) { return "upsertSettings" in obj; }, get: function (obj) { return obj.upsertSettings; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _recalculate_decorators, { kind: "method", name: "recalculate", static: false, private: false, access: { has: function (obj) { return "recalculate" in obj; }, get: function (obj) { return obj.recalculate; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        PromoController = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return PromoController = _classThis;
}();
exports.PromoController = PromoController;
