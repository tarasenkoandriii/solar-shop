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
exports.AppModule = void 0;
var common_1 = require("@nestjs/common");
var config_1 = require("@nestjs/config");
var prisma_module_1 = require("./prisma/prisma.module");
var auth_module_1 = require("./auth/auth.module");
var products_module_1 = require("./products/products.module");
var manufacturers_module_1 = require("./manufacturers/manufacturers.module");
var offices_module_1 = require("./offices/offices.module");
var leads_module_1 = require("./leads/leads.module");
var currency_module_1 = require("./currency/currency.module");
var vendors_module_1 = require("./vendors/vendors.module");
var parser_module_1 = require("./parser/parser.module");
var promo_module_1 = require("./promo/promo.module");
var grok_module_1 = require("./grok/grok.module");
var cart_module_1 = require("./cart/cart.module");
var orders_module_1 = require("./orders/orders.module");
var loyalty_module_1 = require("./loyalty/loyalty.module");
var nova_poshta_module_1 = require("./nova-poshta/nova-poshta.module");
var articles_module_1 = require("./articles/articles.module");
var cron_module_1 = require("./cron/cron.module");
var notify_module_1 = require("./notify/notify.module");
var rate_limit_module_1 = require("./rate-limit/rate-limit.module");
var email_module_1 = require("./email/email.module");
var calculator_module_1 = require("./calculator/calculator.module");
var project_goals_module_1 = require("./project-goals/project-goals.module");
var schema_templates_module_1 = require("./schema-templates/schema-templates.module");
var calculator_settings_module_1 = require("./calculator-settings/calculator-settings.module");
var financing_module_1 = require("./financing/financing.module");
var business_plan_module_1 = require("./business-plan/business-plan.module");
var solar_map_module_1 = require("./solar-map/solar-map.module");
var health_controller_1 = require("./common/health.controller");
var AppModule = function () {
    var _classDecorators = [(0, common_1.Module)({
            imports: [
                // Єдиний .env для всього монорепо (див. /.env.example у корені) —
                // спочатку шукає apps/api/.env (локальний override, якщо є), інакше
                // бере кореневий /.env. У проді (Vercel) жоден файл не читається,
                // process.env інжектиться напряму — envFilePath ігнорується, якщо
                // жоден з файлів фізично не існує (не помилка).
                config_1.ConfigModule.forRoot({ isGlobal: true, envFilePath: ['.env', '../../.env'] }),
                prisma_module_1.PrismaModule,
                auth_module_1.AuthModule,
                products_module_1.ProductsModule,
                manufacturers_module_1.ManufacturersModule,
                offices_module_1.OfficesModule,
                leads_module_1.LeadsModule,
                currency_module_1.CurrencyModule,
                vendors_module_1.VendorsModule,
                grok_module_1.GrokModule,
                parser_module_1.ParserModule,
                promo_module_1.PromoModule,
                nova_poshta_module_1.NovaPoshtaModule,
                cart_module_1.CartModule,
                orders_module_1.OrdersModule,
                loyalty_module_1.LoyaltyModule,
                articles_module_1.ArticlesModule,
                cron_module_1.CronModule,
                notify_module_1.NotifyModule,
                rate_limit_module_1.RateLimitModule,
                email_module_1.EmailModule,
                calculator_module_1.CalculatorModule,
                project_goals_module_1.ProjectGoalsModule,
                schema_templates_module_1.SchemaTemplatesModule,
                calculator_settings_module_1.CalculatorSettingsModule,
                financing_module_1.FinancingModule,
                business_plan_module_1.BusinessPlanModule,
                solar_map_module_1.SolarMapModule,
            ],
            controllers: [health_controller_1.HealthController],
        })];
    var _classDescriptor;
    var _classExtraInitializers = [];
    var _classThis;
    var AppModule = _classThis = /** @class */ (function () {
        function AppModule_1() {
        }
        return AppModule_1;
    }());
    __setFunctionName(_classThis, "AppModule");
    (function () {
        var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        AppModule = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return AppModule = _classThis;
}();
exports.AppModule = AppModule;
