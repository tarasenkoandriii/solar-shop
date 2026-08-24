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
exports.SolarMapController = void 0;
var common_1 = require("@nestjs/common");
var db_1 = require("@solar-shop/db");
var jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
var roles_guard_1 = require("../auth/guards/roles.guard");
var roles_decorator_1 = require("../auth/decorators/roles.decorator");
var rate_limit_guard_1 = require("../rate-limit/guards/rate-limit.guard");
var rate_limit_decorator_1 = require("../rate-limit/decorators/rate-limit.decorator");
var SolarMapController = function () {
    var _classDecorators = [(0, common_1.Controller)()];
    var _classDescriptor;
    var _classExtraInitializers = [];
    var _classThis;
    var _instanceExtraInitializers = [];
    var _getGrid_decorators;
    var _logEmbedView_decorators;
    var _recomputeGrid_decorators;
    var _recomputeInterpolation_decorators;
    var _getStats_decorators;
    var _exportData_decorators;
    var _importData_decorators;
    var SolarMapController = _classThis = /** @class */ (function () {
        function SolarMapController_1(solarMap, embedViews) {
            this.solarMap = (__runInitializers(this, _instanceExtraInitializers), solarMap);
            this.embedViews = embedViews;
        }
        SolarMapController_1.prototype.getGrid = function () {
            return this.solarMap.getGridPoints();
        };
        // Публичный, но rate-limited — вызывается с любой страницы, встраивающей
        // виджет, потенциальная точка злоупотребления (накрутка EmbedView).
        SolarMapController_1.prototype.logEmbedView = function (dto) {
            var _a, _b;
            return this.embedViews.logView((_a = dto.widgetKey) !== null && _a !== void 0 ? _a : 'solar-map', (_b = dto.refererHost) !== null && _b !== void 0 ? _b : null);
        };
        SolarMapController_1.prototype.recomputeGrid = function (dto) {
            return this.solarMap.recomputeGrid(dto.stepDegrees);
        };
        SolarMapController_1.prototype.recomputeInterpolation = function (dto) {
            return this.solarMap.recomputeInterpolation(dto.resolution);
        };
        SolarMapController_1.prototype.getStats = function (widgetKey, period) {
            if (widgetKey === void 0) { widgetKey = 'solar-map'; }
            if (period === void 0) { period = 'week'; }
            return this.embedViews.getStats(widgetKey, period);
        };
        // Міграція даних карти між оточеннями — той самий паттерн, що
        // VendorDataTransferService (Фаза 2): експорт сирих точок PVGIS +
        // закешованих інтерпольованих сіток разом, ідемпотентний імпорт.
        // Body типізовано як `unknown`, не inline-об'єктом — валідація формату
        // вручну всередині сервісу (та сама причина, що й у
        // VendorDataTransferService.importVendorData: глибоко вкладена
        // динамічна структура, DTO-класи були б громіздкі без додаткової
        // користі; `unknown` коректно проходить через global ValidationPipe,
        // не обходить його мовчки, на відміну від inline-об'єктних типів,
        // знайдених у AUDIT-FULL.md).
        SolarMapController_1.prototype.exportData = function () {
            return this.solarMap.exportData();
        };
        SolarMapController_1.prototype.importData = function (payload) {
            return this.solarMap.importData(payload);
        };
        return SolarMapController_1;
    }());
    __setFunctionName(_classThis, "SolarMapController");
    (function () {
        var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        _getGrid_decorators = [(0, common_1.Get)('solar-map/grid')];
        _logEmbedView_decorators = [(0, common_1.UseGuards)(rate_limit_guard_1.RateLimitGuard), (0, rate_limit_decorator_1.RateLimit)({ limit: 10, windowSeconds: 60 }), (0, common_1.Post)('solar-map/embed-view')];
        _recomputeGrid_decorators = [(0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard, rate_limit_guard_1.RateLimitGuard), (0, roles_decorator_1.Roles)(db_1.UserRole.ADMIN), (0, rate_limit_decorator_1.RateLimit)({ limit: 1, windowSeconds: 3600 }), (0, common_1.Post)('admin/solar-map/recompute-grid')];
        _recomputeInterpolation_decorators = [(0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard, rate_limit_guard_1.RateLimitGuard), (0, roles_decorator_1.Roles)(db_1.UserRole.ADMIN), (0, rate_limit_decorator_1.RateLimit)({ limit: 5, windowSeconds: 60 }), (0, common_1.Post)('admin/solar-map/recompute-interpolation')];
        _getStats_decorators = [(0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard), (0, roles_decorator_1.Roles)(db_1.UserRole.ADMIN), (0, common_1.Get)('admin/embed-views/stats')];
        _exportData_decorators = [(0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard), (0, roles_decorator_1.Roles)(db_1.UserRole.ADMIN), (0, common_1.Get)('admin/solar-map/export')];
        _importData_decorators = [(0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard), (0, roles_decorator_1.Roles)(db_1.UserRole.ADMIN), (0, common_1.Post)('admin/solar-map/import')];
        __esDecorate(_classThis, null, _getGrid_decorators, { kind: "method", name: "getGrid", static: false, private: false, access: { has: function (obj) { return "getGrid" in obj; }, get: function (obj) { return obj.getGrid; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _logEmbedView_decorators, { kind: "method", name: "logEmbedView", static: false, private: false, access: { has: function (obj) { return "logEmbedView" in obj; }, get: function (obj) { return obj.logEmbedView; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _recomputeGrid_decorators, { kind: "method", name: "recomputeGrid", static: false, private: false, access: { has: function (obj) { return "recomputeGrid" in obj; }, get: function (obj) { return obj.recomputeGrid; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _recomputeInterpolation_decorators, { kind: "method", name: "recomputeInterpolation", static: false, private: false, access: { has: function (obj) { return "recomputeInterpolation" in obj; }, get: function (obj) { return obj.recomputeInterpolation; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _getStats_decorators, { kind: "method", name: "getStats", static: false, private: false, access: { has: function (obj) { return "getStats" in obj; }, get: function (obj) { return obj.getStats; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _exportData_decorators, { kind: "method", name: "exportData", static: false, private: false, access: { has: function (obj) { return "exportData" in obj; }, get: function (obj) { return obj.exportData; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _importData_decorators, { kind: "method", name: "importData", static: false, private: false, access: { has: function (obj) { return "importData" in obj; }, get: function (obj) { return obj.importData; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        SolarMapController = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return SolarMapController = _classThis;
}();
exports.SolarMapController = SolarMapController;
