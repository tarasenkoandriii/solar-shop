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
exports.BusinessPlanModule = void 0;
var common_1 = require("@nestjs/common");
var auth_module_1 = require("../auth/auth.module");
var grok_module_1 = require("../grok/grok.module");
var invoice_module_1 = require("../invoice/invoice.module");
var email_module_1 = require("../email/email.module");
var notify_module_1 = require("../notify/notify.module");
var calculator_settings_module_1 = require("../calculator-settings/calculator-settings.module");
var financing_module_1 = require("../financing/financing.module");
var calculator_module_1 = require("../calculator/calculator.module");
var business_plan_controller_1 = require("./business-plan.controller");
var business_plan_manifest_service_1 = require("./business-plan-manifest.service");
var business_plan_generation_service_1 = require("./business-plan-generation.service");
var payback_service_1 = require("./payback.service");
var BusinessPlanModule = function () {
    var _classDecorators = [(0, common_1.Module)({
            imports: [auth_module_1.AuthModule, grok_module_1.GrokModule, invoice_module_1.InvoiceModule, email_module_1.EmailModule, notify_module_1.NotifyModule, calculator_settings_module_1.CalculatorSettingsModule, financing_module_1.FinancingModule, calculator_module_1.CalculatorModule],
            controllers: [business_plan_controller_1.BusinessPlanController],
            providers: [business_plan_manifest_service_1.BusinessPlanManifestService, business_plan_generation_service_1.BusinessPlanGenerationService, payback_service_1.PaybackService],
            exports: [business_plan_generation_service_1.BusinessPlanGenerationService, business_plan_manifest_service_1.BusinessPlanManifestService, payback_service_1.PaybackService],
        })];
    var _classDescriptor;
    var _classExtraInitializers = [];
    var _classThis;
    var BusinessPlanModule = _classThis = /** @class */ (function () {
        function BusinessPlanModule_1() {
        }
        return BusinessPlanModule_1;
    }());
    __setFunctionName(_classThis, "BusinessPlanModule");
    (function () {
        var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        BusinessPlanModule = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return BusinessPlanModule = _classThis;
}();
exports.BusinessPlanModule = BusinessPlanModule;
