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
exports.CronModule = void 0;
var common_1 = require("@nestjs/common");
var auth_module_1 = require("../auth/auth.module");
var parser_module_1 = require("../parser/parser.module");
var articles_module_1 = require("../articles/articles.module");
var currency_module_1 = require("../currency/currency.module");
var nova_poshta_module_1 = require("../nova-poshta/nova-poshta.module");
var promo_module_1 = require("../promo/promo.module");
var notify_module_1 = require("../notify/notify.module");
var financing_module_1 = require("../financing/financing.module");
var business_plan_module_1 = require("../business-plan/business-plan.module");
var cron_controller_1 = require("./cron.controller");
var cron_service_1 = require("./cron.service");
var CronModule = function () {
    var _classDecorators = [(0, common_1.Module)({
            imports: [
                auth_module_1.AuthModule,
                parser_module_1.ParserModule,
                articles_module_1.ArticlesModule,
                currency_module_1.CurrencyModule,
                nova_poshta_module_1.NovaPoshtaModule,
                promo_module_1.PromoModule,
                notify_module_1.NotifyModule,
                financing_module_1.FinancingModule,
                business_plan_module_1.BusinessPlanModule,
            ],
            controllers: [cron_controller_1.CronController, cron_controller_1.InternalCronController],
            providers: [cron_service_1.CronService],
        })];
    var _classDescriptor;
    var _classExtraInitializers = [];
    var _classThis;
    var CronModule = _classThis = /** @class */ (function () {
        function CronModule_1() {
        }
        return CronModule_1;
    }());
    __setFunctionName(_classThis, "CronModule");
    (function () {
        var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        CronModule = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return CronModule = _classThis;
}();
exports.CronModule = CronModule;
