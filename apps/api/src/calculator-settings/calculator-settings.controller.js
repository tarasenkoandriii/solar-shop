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
exports.CalculatorSettingsController = void 0;
var common_1 = require("@nestjs/common");
var db_1 = require("@solar-shop/db");
var jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
var roles_guard_1 = require("../auth/guards/roles.guard");
var roles_decorator_1 = require("../auth/decorators/roles.decorator");
var rate_limit_guard_1 = require("../rate-limit/guards/rate-limit.guard");
var rate_limit_decorator_1 = require("../rate-limit/decorators/rate-limit.decorator");
var CalculatorSettingsController = function () {
    var _classDecorators = [(0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard), (0, roles_decorator_1.Roles)(db_1.UserRole.ADMIN), (0, common_1.Controller)('admin/calculator-settings')];
    var _classDescriptor;
    var _classExtraInitializers = [];
    var _classThis;
    var _instanceExtraInitializers = [];
    var _findTariffs_decorators;
    var _upsertTariff_decorators;
    var _findPowerRangeThresholds_decorators;
    var _suggestPowerRangeThresholds_decorators;
    var _applyPowerRangeThreshold_decorators;
    var _findScalingThresholds_decorators;
    var _suggestScalingThreshold_decorators;
    var _applyScalingThreshold_decorators;
    var CalculatorSettingsController = _classThis = /** @class */ (function () {
        function CalculatorSettingsController_1(service) {
            this.service = (__runInitializers(this, _instanceExtraInitializers), service);
        }
        CalculatorSettingsController_1.prototype.findTariffs = function () {
            return this.service.findAllTariffs();
        };
        CalculatorSettingsController_1.prototype.upsertTariff = function (dto) {
            return this.service.upsertTariff(dto.key, dto.label, dto.rateUahPerKwh, dto.sourceUrl);
        };
        CalculatorSettingsController_1.prototype.findPowerRangeThresholds = function () {
            return this.service.findAllPowerRangeThresholds();
        };
        CalculatorSettingsController_1.prototype.suggestPowerRangeThresholds = function () {
            return this.service.suggestPowerRangeThresholds();
        };
        CalculatorSettingsController_1.prototype.applyPowerRangeThreshold = function (dto) {
            var _a;
            return this.service.applyPowerRangeThreshold(dto.tag, dto.minPanelsWattW, (_a = dto.maxPanelsWattW) !== null && _a !== void 0 ? _a : null);
        };
        CalculatorSettingsController_1.prototype.findScalingThresholds = function () {
            return this.service.findAllScalingThresholds();
        };
        CalculatorSettingsController_1.prototype.suggestScalingThreshold = function () {
            return this.service.suggestScalingThreshold('CONTROLLER');
        };
        CalculatorSettingsController_1.prototype.applyScalingThreshold = function (dto) {
            return this.service.applyScalingThreshold('CONTROLLER', dto.headroomMaxPricePercent);
        };
        return CalculatorSettingsController_1;
    }());
    __setFunctionName(_classThis, "CalculatorSettingsController");
    (function () {
        var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        _findTariffs_decorators = [(0, common_1.Get)('tariffs')];
        _upsertTariff_decorators = [(0, common_1.Post)('tariffs')];
        _findPowerRangeThresholds_decorators = [(0, common_1.Get)('power-range-thresholds')];
        _suggestPowerRangeThresholds_decorators = [(0, common_1.UseGuards)(rate_limit_guard_1.RateLimitGuard), (0, rate_limit_decorator_1.RateLimit)({ limit: 1, windowSeconds: 180 }), (0, common_1.Post)('power-range-thresholds/suggest-ai')];
        _applyPowerRangeThreshold_decorators = [(0, common_1.Post)('power-range-thresholds/apply')];
        _findScalingThresholds_decorators = [(0, common_1.Get)('scaling-thresholds')];
        _suggestScalingThreshold_decorators = [(0, common_1.UseGuards)(rate_limit_guard_1.RateLimitGuard), (0, rate_limit_decorator_1.RateLimit)({ limit: 1, windowSeconds: 180 }), (0, common_1.Post)('scaling-thresholds/suggest-ai')];
        _applyScalingThreshold_decorators = [(0, common_1.Post)('scaling-thresholds/apply')];
        __esDecorate(_classThis, null, _findTariffs_decorators, { kind: "method", name: "findTariffs", static: false, private: false, access: { has: function (obj) { return "findTariffs" in obj; }, get: function (obj) { return obj.findTariffs; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _upsertTariff_decorators, { kind: "method", name: "upsertTariff", static: false, private: false, access: { has: function (obj) { return "upsertTariff" in obj; }, get: function (obj) { return obj.upsertTariff; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _findPowerRangeThresholds_decorators, { kind: "method", name: "findPowerRangeThresholds", static: false, private: false, access: { has: function (obj) { return "findPowerRangeThresholds" in obj; }, get: function (obj) { return obj.findPowerRangeThresholds; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _suggestPowerRangeThresholds_decorators, { kind: "method", name: "suggestPowerRangeThresholds", static: false, private: false, access: { has: function (obj) { return "suggestPowerRangeThresholds" in obj; }, get: function (obj) { return obj.suggestPowerRangeThresholds; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _applyPowerRangeThreshold_decorators, { kind: "method", name: "applyPowerRangeThreshold", static: false, private: false, access: { has: function (obj) { return "applyPowerRangeThreshold" in obj; }, get: function (obj) { return obj.applyPowerRangeThreshold; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _findScalingThresholds_decorators, { kind: "method", name: "findScalingThresholds", static: false, private: false, access: { has: function (obj) { return "findScalingThresholds" in obj; }, get: function (obj) { return obj.findScalingThresholds; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _suggestScalingThreshold_decorators, { kind: "method", name: "suggestScalingThreshold", static: false, private: false, access: { has: function (obj) { return "suggestScalingThreshold" in obj; }, get: function (obj) { return obj.suggestScalingThreshold; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _applyScalingThreshold_decorators, { kind: "method", name: "applyScalingThreshold", static: false, private: false, access: { has: function (obj) { return "applyScalingThreshold" in obj; }, get: function (obj) { return obj.applyScalingThreshold; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        CalculatorSettingsController = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return CalculatorSettingsController = _classThis;
}();
exports.CalculatorSettingsController = CalculatorSettingsController;
