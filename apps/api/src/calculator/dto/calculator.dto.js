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
Object.defineProperty(exports, "__esModule", { value: true });
exports.RequestDocumentsDto = exports.SendPackageDto = exports.AddToCartDto = exports.UpdateSpecDto = exports.RefineCalculatorDto = exports.StartCalculatorDto = void 0;
var class_transformer_1 = require("class-transformer");
var class_validator_1 = require("class-validator");
// ТЗ п.31.1 — шаги квиза (гео/бюджет/цели/мощность/финансирование)
var StartCalculatorDto = function () {
    var _a;
    var _city_decorators;
    var _city_initializers = [];
    var _city_extraInitializers = [];
    var _cityRef_decorators;
    var _cityRef_initializers = [];
    var _cityRef_extraInitializers = [];
    var _budgetUsd_decorators;
    var _budgetUsd_initializers = [];
    var _budgetUsd_extraInitializers = [];
    var _goals_decorators;
    var _goals_initializers = [];
    var _goals_extraInitializers = [];
    var _dailyConsumptionKwh_decorators;
    var _dailyConsumptionKwh_initializers = [];
    var _dailyConsumptionKwh_extraInitializers = [];
    var _financingNeeded_decorators;
    var _financingNeeded_initializers = [];
    var _financingNeeded_extraInitializers = [];
    var _ownFundsPercent_decorators;
    var _ownFundsPercent_initializers = [];
    var _ownFundsPercent_extraInitializers = [];
    var _sessionId_decorators;
    var _sessionId_initializers = [];
    var _sessionId_extraInitializers = [];
    return _a = /** @class */ (function () {
            function StartCalculatorDto() {
                this.city = __runInitializers(this, _city_initializers, void 0);
                this.cityRef = (__runInitializers(this, _city_extraInitializers), __runInitializers(this, _cityRef_initializers, void 0)); // Ref города НП — нужен для PVGIS lat/lng при экспорте
                this.budgetUsd = (__runInitializers(this, _cityRef_extraInitializers), __runInitializers(this, _budgetUsd_initializers, void 0));
                this.goals = (__runInitializers(this, _budgetUsd_extraInitializers), __runInitializers(this, _goals_initializers, void 0)); // ProjectGoal.key[]
                this.dailyConsumptionKwh = (__runInitializers(this, _goals_extraInitializers), __runInitializers(this, _dailyConsumptionKwh_initializers, void 0));
                this.financingNeeded = (__runInitializers(this, _dailyConsumptionKwh_extraInitializers), __runInitializers(this, _financingNeeded_initializers, void 0));
                this.ownFundsPercent = (__runInitializers(this, _financingNeeded_extraInitializers), __runInitializers(this, _ownFundsPercent_initializers, void 0));
                this.sessionId = (__runInitializers(this, _ownFundsPercent_extraInitializers), __runInitializers(this, _sessionId_initializers, void 0)); // гостевая сессия — тот же паттерн, что у Cart.sessionId
                __runInitializers(this, _sessionId_extraInitializers);
            }
            return StartCalculatorDto;
        }()),
        (function () {
            var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            _city_decorators = [(0, class_validator_1.IsOptional)(), (0, class_validator_1.IsString)()];
            _cityRef_decorators = [(0, class_validator_1.IsOptional)(), (0, class_validator_1.IsString)()];
            _budgetUsd_decorators = [(0, class_validator_1.IsOptional)(), (0, class_validator_1.IsNumber)(), (0, class_transformer_1.Type)(function () { return Number; })];
            _goals_decorators = [(0, class_validator_1.IsArray)(), (0, class_validator_1.IsString)({ each: true })];
            _dailyConsumptionKwh_decorators = [(0, class_validator_1.IsOptional)(), (0, class_validator_1.IsNumber)(), (0, class_transformer_1.Type)(function () { return Number; })];
            _financingNeeded_decorators = [(0, class_validator_1.IsOptional)(), (0, class_validator_1.IsBoolean)(), (0, class_transformer_1.Type)(function () { return Boolean; })];
            _ownFundsPercent_decorators = [(0, class_validator_1.IsOptional)(), (0, class_validator_1.IsNumber)(), (0, class_validator_1.Min)(0), (0, class_validator_1.Max)(100), (0, class_transformer_1.Type)(function () { return Number; })];
            _sessionId_decorators = [(0, class_validator_1.IsOptional)(), (0, class_validator_1.IsString)()];
            __esDecorate(null, null, _city_decorators, { kind: "field", name: "city", static: false, private: false, access: { has: function (obj) { return "city" in obj; }, get: function (obj) { return obj.city; }, set: function (obj, value) { obj.city = value; } }, metadata: _metadata }, _city_initializers, _city_extraInitializers);
            __esDecorate(null, null, _cityRef_decorators, { kind: "field", name: "cityRef", static: false, private: false, access: { has: function (obj) { return "cityRef" in obj; }, get: function (obj) { return obj.cityRef; }, set: function (obj, value) { obj.cityRef = value; } }, metadata: _metadata }, _cityRef_initializers, _cityRef_extraInitializers);
            __esDecorate(null, null, _budgetUsd_decorators, { kind: "field", name: "budgetUsd", static: false, private: false, access: { has: function (obj) { return "budgetUsd" in obj; }, get: function (obj) { return obj.budgetUsd; }, set: function (obj, value) { obj.budgetUsd = value; } }, metadata: _metadata }, _budgetUsd_initializers, _budgetUsd_extraInitializers);
            __esDecorate(null, null, _goals_decorators, { kind: "field", name: "goals", static: false, private: false, access: { has: function (obj) { return "goals" in obj; }, get: function (obj) { return obj.goals; }, set: function (obj, value) { obj.goals = value; } }, metadata: _metadata }, _goals_initializers, _goals_extraInitializers);
            __esDecorate(null, null, _dailyConsumptionKwh_decorators, { kind: "field", name: "dailyConsumptionKwh", static: false, private: false, access: { has: function (obj) { return "dailyConsumptionKwh" in obj; }, get: function (obj) { return obj.dailyConsumptionKwh; }, set: function (obj, value) { obj.dailyConsumptionKwh = value; } }, metadata: _metadata }, _dailyConsumptionKwh_initializers, _dailyConsumptionKwh_extraInitializers);
            __esDecorate(null, null, _financingNeeded_decorators, { kind: "field", name: "financingNeeded", static: false, private: false, access: { has: function (obj) { return "financingNeeded" in obj; }, get: function (obj) { return obj.financingNeeded; }, set: function (obj, value) { obj.financingNeeded = value; } }, metadata: _metadata }, _financingNeeded_initializers, _financingNeeded_extraInitializers);
            __esDecorate(null, null, _ownFundsPercent_decorators, { kind: "field", name: "ownFundsPercent", static: false, private: false, access: { has: function (obj) { return "ownFundsPercent" in obj; }, get: function (obj) { return obj.ownFundsPercent; }, set: function (obj, value) { obj.ownFundsPercent = value; } }, metadata: _metadata }, _ownFundsPercent_initializers, _ownFundsPercent_extraInitializers);
            __esDecorate(null, null, _sessionId_decorators, { kind: "field", name: "sessionId", static: false, private: false, access: { has: function (obj) { return "sessionId" in obj; }, get: function (obj) { return obj.sessionId; }, set: function (obj, value) { obj.sessionId = value; } }, metadata: _metadata }, _sessionId_initializers, _sessionId_extraInitializers);
            if (_metadata) Object.defineProperty(_a, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        })(),
        _a;
}();
exports.StartCalculatorDto = StartCalculatorDto;
// ТЗ п.31.2 — диалоговое уточнение поверх уже подобранной комплектации
var RefineCalculatorDto = function () {
    var _a;
    var _text_decorators;
    var _text_initializers = [];
    var _text_extraInitializers = [];
    return _a = /** @class */ (function () {
            function RefineCalculatorDto() {
                this.text = __runInitializers(this, _text_initializers, void 0);
                __runInitializers(this, _text_extraInitializers);
            }
            return RefineCalculatorDto;
        }()),
        (function () {
            var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            _text_decorators = [(0, class_validator_1.IsString)(), (0, class_validator_1.MinLength)(2)];
            __esDecorate(null, null, _text_decorators, { kind: "field", name: "text", static: false, private: false, access: { has: function (obj) { return "text" in obj; }, get: function (obj) { return obj.text; }, set: function (obj, value) { obj.text = value; } }, metadata: _metadata }, _text_initializers, _text_extraInitializers);
            if (_metadata) Object.defineProperty(_a, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        })(),
        _a;
}();
exports.RefineCalculatorDto = RefineCalculatorDto;
var SpecItemDto = function () {
    var _a;
    var _productId_decorators;
    var _productId_initializers = [];
    var _productId_extraInitializers = [];
    var _quantity_decorators;
    var _quantity_initializers = [];
    var _quantity_extraInitializers = [];
    return _a = /** @class */ (function () {
            function SpecItemDto() {
                this.productId = __runInitializers(this, _productId_initializers, void 0);
                this.quantity = (__runInitializers(this, _productId_extraInitializers), __runInitializers(this, _quantity_initializers, void 0));
                __runInitializers(this, _quantity_extraInitializers);
            }
            return SpecItemDto;
        }()),
        (function () {
            var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            _productId_decorators = [(0, class_validator_1.IsString)()];
            _quantity_decorators = [(0, class_validator_1.IsInt)(), (0, class_validator_1.Min)(1)];
            __esDecorate(null, null, _productId_decorators, { kind: "field", name: "productId", static: false, private: false, access: { has: function (obj) { return "productId" in obj; }, get: function (obj) { return obj.productId; }, set: function (obj, value) { obj.productId = value; } }, metadata: _metadata }, _productId_initializers, _productId_extraInitializers);
            __esDecorate(null, null, _quantity_decorators, { kind: "field", name: "quantity", static: false, private: false, access: { has: function (obj) { return "quantity" in obj; }, get: function (obj) { return obj.quantity; }, set: function (obj, value) { obj.quantity = value; } }, metadata: _metadata }, _quantity_initializers, _quantity_extraInitializers);
            if (_metadata) Object.defineProperty(_a, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        })(),
        _a;
}();
// ТЗ п.31.2.1 — правки степпера количества persist обратно в recommendedSpec
var UpdateSpecDto = function () {
    var _a;
    var _items_decorators;
    var _items_initializers = [];
    var _items_extraInitializers = [];
    return _a = /** @class */ (function () {
            function UpdateSpecDto() {
                this.items = __runInitializers(this, _items_initializers, void 0);
                __runInitializers(this, _items_extraInitializers);
            }
            return UpdateSpecDto;
        }()),
        (function () {
            var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            _items_decorators = [(0, class_validator_1.IsArray)(), (0, class_validator_1.ValidateNested)({ each: true }), (0, class_transformer_1.Type)(function () { return SpecItemDto; })];
            __esDecorate(null, null, _items_decorators, { kind: "field", name: "items", static: false, private: false, access: { has: function (obj) { return "items" in obj; }, get: function (obj) { return obj.items; }, set: function (obj, value) { obj.items = value; } }, metadata: _metadata }, _items_initializers, _items_extraInitializers);
            if (_metadata) Object.defineProperty(_a, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        })(),
        _a;
}();
exports.UpdateSpecDto = UpdateSpecDto;
// ТЗ п.31.2.1 — клик-в-корзину, батч-вызов
var AddToCartDto = function () {
    var _a;
    var _productIds_decorators;
    var _productIds_initializers = [];
    var _productIds_extraInitializers = [];
    return _a = /** @class */ (function () {
            function AddToCartDto() {
                this.productIds = __runInitializers(this, _productIds_initializers, void 0); // конкретные позиции; если не передано — вся спецификация целиком
                __runInitializers(this, _productIds_extraInitializers);
            }
            return AddToCartDto;
        }()),
        (function () {
            var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            _productIds_decorators = [(0, class_validator_1.IsOptional)(), (0, class_validator_1.IsArray)(), (0, class_validator_1.IsString)({ each: true })];
            __esDecorate(null, null, _productIds_decorators, { kind: "field", name: "productIds", static: false, private: false, access: { has: function (obj) { return "productIds" in obj; }, get: function (obj) { return obj.productIds; }, set: function (obj, value) { obj.productIds = value; } }, metadata: _metadata }, _productIds_initializers, _productIds_extraInitializers);
            if (_metadata) Object.defineProperty(_a, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        })(),
        _a;
}();
exports.AddToCartDto = AddToCartDto;
var SendPackageDto = function () {
    var _a;
    var _channel_decorators;
    var _channel_initializers = [];
    var _channel_extraInitializers = [];
    var _contactValue_decorators;
    var _contactValue_initializers = [];
    var _contactValue_extraInitializers = [];
    return _a = /** @class */ (function () {
            function SendPackageDto() {
                this.channel = __runInitializers(this, _channel_initializers, void 0);
                this.contactValue = (__runInitializers(this, _channel_extraInitializers), __runInitializers(this, _contactValue_initializers, void 0)); // email-адрес, телефон для wa.me/Viber-діплінку — Telegram бере chat_id з User, contactValue ігнорується
                __runInitializers(this, _contactValue_extraInitializers);
            }
            return SendPackageDto;
        }()),
        (function () {
            var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            _channel_decorators = [(0, class_validator_1.IsIn)(['telegram', 'whatsapp', 'viber', 'email'])];
            _contactValue_decorators = [(0, class_validator_1.IsString)()];
            __esDecorate(null, null, _channel_decorators, { kind: "field", name: "channel", static: false, private: false, access: { has: function (obj) { return "channel" in obj; }, get: function (obj) { return obj.channel; }, set: function (obj, value) { obj.channel = value; } }, metadata: _metadata }, _channel_initializers, _channel_extraInitializers);
            __esDecorate(null, null, _contactValue_decorators, { kind: "field", name: "contactValue", static: false, private: false, access: { has: function (obj) { return "contactValue" in obj; }, get: function (obj) { return obj.contactValue; }, set: function (obj, value) { obj.contactValue = value; } }, metadata: _metadata }, _contactValue_initializers, _contactValue_extraInitializers);
            if (_metadata) Object.defineProperty(_a, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        })(),
        _a;
}();
exports.SendPackageDto = SendPackageDto;
// ТЗ п.31.11.0 — чек-лист документів перед batch-генерацией. Найдено при
// полном аудите (AUDIT-FULL.md): раньше типизировался inline-объектом в
// контроллере, что полностью обходило global ValidationPipe (NestJS не
// видит рантайм-метаданные для TS-интерфейсов/inline-типов) — теперь
// настоящий класс с валидацией допустимых значений документов/каналов.
var RequestDocumentsDto = function () {
    var _a;
    var _requestedDocuments_decorators;
    var _requestedDocuments_initializers = [];
    var _requestedDocuments_extraInitializers = [];
    var _contactChannel_decorators;
    var _contactChannel_initializers = [];
    var _contactChannel_extraInitializers = [];
    var _contactValue_decorators;
    var _contactValue_initializers = [];
    var _contactValue_extraInitializers = [];
    var _scalingStrategy_decorators;
    var _scalingStrategy_initializers = [];
    var _scalingStrategy_extraInitializers = [];
    return _a = /** @class */ (function () {
            function RequestDocumentsDto() {
                this.requestedDocuments = __runInitializers(this, _requestedDocuments_initializers, void 0);
                this.contactChannel = (__runInitializers(this, _requestedDocuments_extraInitializers), __runInitializers(this, _contactChannel_initializers, void 0));
                this.contactValue = (__runInitializers(this, _contactChannel_extraInitializers), __runInitializers(this, _contactValue_initializers, void 0));
                this.scalingStrategy = (__runInitializers(this, _contactValue_extraInitializers), __runInitializers(this, _scalingStrategy_initializers, void 0));
                __runInitializers(this, _scalingStrategy_extraInitializers);
            }
            return RequestDocumentsDto;
        }()),
        (function () {
            var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            _requestedDocuments_decorators = [(0, class_validator_1.IsArray)(), (0, class_validator_1.IsIn)(['SPEC', 'ANNOTATION', 'BLOCK_DIAGRAM', 'PRINCIPAL_DIAGRAM', 'BUSINESS_PLAN'], { each: true })];
            _contactChannel_decorators = [(0, class_validator_1.IsIn)(['telegram', 'whatsapp', 'viber', 'email'])];
            _contactValue_decorators = [(0, class_validator_1.IsString)()];
            _scalingStrategy_decorators = [(0, class_validator_1.IsOptional)(), (0, class_validator_1.IsIn)(['HEADROOM', 'IDENTICAL_SEGMENTS'])];
            __esDecorate(null, null, _requestedDocuments_decorators, { kind: "field", name: "requestedDocuments", static: false, private: false, access: { has: function (obj) { return "requestedDocuments" in obj; }, get: function (obj) { return obj.requestedDocuments; }, set: function (obj, value) { obj.requestedDocuments = value; } }, metadata: _metadata }, _requestedDocuments_initializers, _requestedDocuments_extraInitializers);
            __esDecorate(null, null, _contactChannel_decorators, { kind: "field", name: "contactChannel", static: false, private: false, access: { has: function (obj) { return "contactChannel" in obj; }, get: function (obj) { return obj.contactChannel; }, set: function (obj, value) { obj.contactChannel = value; } }, metadata: _metadata }, _contactChannel_initializers, _contactChannel_extraInitializers);
            __esDecorate(null, null, _contactValue_decorators, { kind: "field", name: "contactValue", static: false, private: false, access: { has: function (obj) { return "contactValue" in obj; }, get: function (obj) { return obj.contactValue; }, set: function (obj, value) { obj.contactValue = value; } }, metadata: _metadata }, _contactValue_initializers, _contactValue_extraInitializers);
            __esDecorate(null, null, _scalingStrategy_decorators, { kind: "field", name: "scalingStrategy", static: false, private: false, access: { has: function (obj) { return "scalingStrategy" in obj; }, get: function (obj) { return obj.scalingStrategy; }, set: function (obj, value) { obj.scalingStrategy = value; } }, metadata: _metadata }, _scalingStrategy_initializers, _scalingStrategy_extraInitializers);
            if (_metadata) Object.defineProperty(_a, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        })(),
        _a;
}();
exports.RequestDocumentsDto = RequestDocumentsDto;
