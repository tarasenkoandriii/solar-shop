"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
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
exports.UpdateOrderStatusDto = exports.BuyNowDto = exports.DeliveryContactDto = void 0;
var class_validator_1 = require("class-validator");
// Общие поля доставки/контакта для чекаута из корзины и "Купить в 1 клик"
// (ТЗ п.22.1) — согласие на обработку ПД обязательно (ТЗ п.28.6).
var DeliveryContactDto = function () {
    var _a;
    var _contactName_decorators;
    var _contactName_initializers = [];
    var _contactName_extraInitializers = [];
    var _contactPhone_decorators;
    var _contactPhone_initializers = [];
    var _contactPhone_extraInitializers = [];
    var _comment_decorators;
    var _comment_initializers = [];
    var _comment_extraInitializers = [];
    var _npCityRef_decorators;
    var _npCityRef_initializers = [];
    var _npCityRef_extraInitializers = [];
    var _npCityName_decorators;
    var _npCityName_initializers = [];
    var _npCityName_extraInitializers = [];
    var _npWarehouseRef_decorators;
    var _npWarehouseRef_initializers = [];
    var _npWarehouseRef_extraInitializers = [];
    var _npWarehouseName_decorators;
    var _npWarehouseName_initializers = [];
    var _npWarehouseName_extraInitializers = [];
    var _consentGiven_decorators;
    var _consentGiven_initializers = [];
    var _consentGiven_extraInitializers = [];
    var _source_decorators;
    var _source_initializers = [];
    var _source_extraInitializers = [];
    var _sessionId_decorators;
    var _sessionId_initializers = [];
    var _sessionId_extraInitializers = [];
    return _a = /** @class */ (function () {
            function DeliveryContactDto() {
                this.contactName = __runInitializers(this, _contactName_initializers, void 0);
                this.contactPhone = (__runInitializers(this, _contactName_extraInitializers), __runInitializers(this, _contactPhone_initializers, void 0));
                this.comment = (__runInitializers(this, _contactPhone_extraInitializers), __runInitializers(this, _comment_initializers, void 0));
                this.npCityRef = (__runInitializers(this, _comment_extraInitializers), __runInitializers(this, _npCityRef_initializers, void 0));
                // Требуется адаптером Nova Poshta (RecipientCityName в InternetDocument/
                // save — Ref города недостаточно, нужно и текстовое имя), см.
                // NovaPoshtaService.createTtn.
                this.npCityName = (__runInitializers(this, _npCityRef_extraInitializers), __runInitializers(this, _npCityName_initializers, void 0));
                this.npWarehouseRef = (__runInitializers(this, _npCityName_extraInitializers), __runInitializers(this, _npWarehouseRef_initializers, void 0));
                // Фолбэк для createTtn, если по какой-то причине нет Ref отделения
                this.npWarehouseName = (__runInitializers(this, _npWarehouseRef_extraInitializers), __runInitializers(this, _npWarehouseName_initializers, void 0));
                this.consentGiven = (__runInitializers(this, _npWarehouseName_extraInitializers), __runInitializers(this, _consentGiven_initializers, void 0));
                this.source = (__runInitializers(this, _consentGiven_extraInitializers), __runInitializers(this, _source_initializers, void 0));
                // Для гостя (не авторизован через Telegram) — та же гостевая сессия, что
                // и у корзины, нужна чтобы найти/очистить Cart после оформления.
                this.sessionId = (__runInitializers(this, _source_extraInitializers), __runInitializers(this, _sessionId_initializers, void 0));
                __runInitializers(this, _sessionId_extraInitializers);
            }
            return DeliveryContactDto;
        }()),
        (function () {
            var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            _contactName_decorators = [(0, class_validator_1.IsString)(), (0, class_validator_1.MinLength)(2)];
            _contactPhone_decorators = [(0, class_validator_1.IsString)(), (0, class_validator_1.MinLength)(5)];
            _comment_decorators = [(0, class_validator_1.IsOptional)(), (0, class_validator_1.IsString)()];
            _npCityRef_decorators = [(0, class_validator_1.IsOptional)(), (0, class_validator_1.IsString)()];
            _npCityName_decorators = [(0, class_validator_1.IsOptional)(), (0, class_validator_1.IsString)()];
            _npWarehouseRef_decorators = [(0, class_validator_1.IsOptional)(), (0, class_validator_1.IsString)()];
            _npWarehouseName_decorators = [(0, class_validator_1.IsOptional)(), (0, class_validator_1.IsString)()];
            _consentGiven_decorators = [(0, class_validator_1.IsBoolean)()];
            _source_decorators = [(0, class_validator_1.IsIn)(['web', 'tma'])];
            _sessionId_decorators = [(0, class_validator_1.IsOptional)(), (0, class_validator_1.IsString)()];
            __esDecorate(null, null, _contactName_decorators, { kind: "field", name: "contactName", static: false, private: false, access: { has: function (obj) { return "contactName" in obj; }, get: function (obj) { return obj.contactName; }, set: function (obj, value) { obj.contactName = value; } }, metadata: _metadata }, _contactName_initializers, _contactName_extraInitializers);
            __esDecorate(null, null, _contactPhone_decorators, { kind: "field", name: "contactPhone", static: false, private: false, access: { has: function (obj) { return "contactPhone" in obj; }, get: function (obj) { return obj.contactPhone; }, set: function (obj, value) { obj.contactPhone = value; } }, metadata: _metadata }, _contactPhone_initializers, _contactPhone_extraInitializers);
            __esDecorate(null, null, _comment_decorators, { kind: "field", name: "comment", static: false, private: false, access: { has: function (obj) { return "comment" in obj; }, get: function (obj) { return obj.comment; }, set: function (obj, value) { obj.comment = value; } }, metadata: _metadata }, _comment_initializers, _comment_extraInitializers);
            __esDecorate(null, null, _npCityRef_decorators, { kind: "field", name: "npCityRef", static: false, private: false, access: { has: function (obj) { return "npCityRef" in obj; }, get: function (obj) { return obj.npCityRef; }, set: function (obj, value) { obj.npCityRef = value; } }, metadata: _metadata }, _npCityRef_initializers, _npCityRef_extraInitializers);
            __esDecorate(null, null, _npCityName_decorators, { kind: "field", name: "npCityName", static: false, private: false, access: { has: function (obj) { return "npCityName" in obj; }, get: function (obj) { return obj.npCityName; }, set: function (obj, value) { obj.npCityName = value; } }, metadata: _metadata }, _npCityName_initializers, _npCityName_extraInitializers);
            __esDecorate(null, null, _npWarehouseRef_decorators, { kind: "field", name: "npWarehouseRef", static: false, private: false, access: { has: function (obj) { return "npWarehouseRef" in obj; }, get: function (obj) { return obj.npWarehouseRef; }, set: function (obj, value) { obj.npWarehouseRef = value; } }, metadata: _metadata }, _npWarehouseRef_initializers, _npWarehouseRef_extraInitializers);
            __esDecorate(null, null, _npWarehouseName_decorators, { kind: "field", name: "npWarehouseName", static: false, private: false, access: { has: function (obj) { return "npWarehouseName" in obj; }, get: function (obj) { return obj.npWarehouseName; }, set: function (obj, value) { obj.npWarehouseName = value; } }, metadata: _metadata }, _npWarehouseName_initializers, _npWarehouseName_extraInitializers);
            __esDecorate(null, null, _consentGiven_decorators, { kind: "field", name: "consentGiven", static: false, private: false, access: { has: function (obj) { return "consentGiven" in obj; }, get: function (obj) { return obj.consentGiven; }, set: function (obj, value) { obj.consentGiven = value; } }, metadata: _metadata }, _consentGiven_initializers, _consentGiven_extraInitializers);
            __esDecorate(null, null, _source_decorators, { kind: "field", name: "source", static: false, private: false, access: { has: function (obj) { return "source" in obj; }, get: function (obj) { return obj.source; }, set: function (obj, value) { obj.source = value; } }, metadata: _metadata }, _source_initializers, _source_extraInitializers);
            __esDecorate(null, null, _sessionId_decorators, { kind: "field", name: "sessionId", static: false, private: false, access: { has: function (obj) { return "sessionId" in obj; }, get: function (obj) { return obj.sessionId; }, set: function (obj, value) { obj.sessionId = value; } }, metadata: _metadata }, _sessionId_initializers, _sessionId_extraInitializers);
            if (_metadata) Object.defineProperty(_a, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        })(),
        _a;
}();
exports.DeliveryContactDto = DeliveryContactDto;
var BuyNowDto = function () {
    var _a;
    var _classSuper = DeliveryContactDto;
    var _productId_decorators;
    var _productId_initializers = [];
    var _productId_extraInitializers = [];
    var _quantity_decorators;
    var _quantity_initializers = [];
    var _quantity_extraInitializers = [];
    return _a = /** @class */ (function (_super) {
            __extends(BuyNowDto, _super);
            function BuyNowDto() {
                var _this = _super !== null && _super.apply(this, arguments) || this;
                _this.productId = __runInitializers(_this, _productId_initializers, void 0);
                _this.quantity = (__runInitializers(_this, _productId_extraInitializers), __runInitializers(_this, _quantity_initializers, void 0));
                __runInitializers(_this, _quantity_extraInitializers);
                return _this;
            }
            return BuyNowDto;
        }(_classSuper)),
        (function () {
            var _b;
            var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create((_b = _classSuper[Symbol.metadata]) !== null && _b !== void 0 ? _b : null) : void 0;
            _productId_decorators = [(0, class_validator_1.IsString)()];
            _quantity_decorators = [(0, class_validator_1.IsOptional)(), (0, class_validator_1.IsInt)(), (0, class_validator_1.Min)(1)];
            __esDecorate(null, null, _productId_decorators, { kind: "field", name: "productId", static: false, private: false, access: { has: function (obj) { return "productId" in obj; }, get: function (obj) { return obj.productId; }, set: function (obj, value) { obj.productId = value; } }, metadata: _metadata }, _productId_initializers, _productId_extraInitializers);
            __esDecorate(null, null, _quantity_decorators, { kind: "field", name: "quantity", static: false, private: false, access: { has: function (obj) { return "quantity" in obj; }, get: function (obj) { return obj.quantity; }, set: function (obj, value) { obj.quantity = value; } }, metadata: _metadata }, _quantity_initializers, _quantity_extraInitializers);
            if (_metadata) Object.defineProperty(_a, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        })(),
        _a;
}();
exports.BuyNowDto = BuyNowDto;
var UpdateOrderStatusDto = function () {
    var _a;
    var _status_decorators;
    var _status_initializers = [];
    var _status_extraInitializers = [];
    return _a = /** @class */ (function () {
            function UpdateOrderStatusDto() {
                this.status = __runInitializers(this, _status_initializers, void 0);
                __runInitializers(this, _status_extraInitializers);
            }
            return UpdateOrderStatusDto;
        }()),
        (function () {
            var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            _status_decorators = [(0, class_validator_1.IsIn)(['NEW', 'INVOICED', 'PAID', 'SHIPPED', 'CANCELLED'])];
            __esDecorate(null, null, _status_decorators, { kind: "field", name: "status", static: false, private: false, access: { has: function (obj) { return "status" in obj; }, get: function (obj) { return obj.status; }, set: function (obj, value) { obj.status = value; } }, metadata: _metadata }, _status_initializers, _status_extraInitializers);
            if (_metadata) Object.defineProperty(_a, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        })(),
        _a;
}();
exports.UpdateOrderStatusDto = UpdateOrderStatusDto;
