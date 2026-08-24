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
exports.UpdateLoyaltyTierDto = exports.CreateLoyaltyTierDto = void 0;
var mapped_types_1 = require("@nestjs/mapped-types");
var class_validator_1 = require("class-validator");
var CreateLoyaltyTierDto = function () {
    var _a;
    var _minSpendUah_decorators;
    var _minSpendUah_initializers = [];
    var _minSpendUah_extraInitializers = [];
    var _discountPercent_decorators;
    var _discountPercent_initializers = [];
    var _discountPercent_extraInitializers = [];
    return _a = /** @class */ (function () {
            function CreateLoyaltyTierDto() {
                this.minSpendUah = __runInitializers(this, _minSpendUah_initializers, void 0);
                this.discountPercent = (__runInitializers(this, _minSpendUah_extraInitializers), __runInitializers(this, _discountPercent_initializers, void 0));
                __runInitializers(this, _discountPercent_extraInitializers);
            }
            return CreateLoyaltyTierDto;
        }()),
        (function () {
            var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            _minSpendUah_decorators = [(0, class_validator_1.IsNumber)(), (0, class_validator_1.Min)(0)];
            _discountPercent_decorators = [(0, class_validator_1.IsNumber)(), (0, class_validator_1.Min)(0)];
            __esDecorate(null, null, _minSpendUah_decorators, { kind: "field", name: "minSpendUah", static: false, private: false, access: { has: function (obj) { return "minSpendUah" in obj; }, get: function (obj) { return obj.minSpendUah; }, set: function (obj, value) { obj.minSpendUah = value; } }, metadata: _metadata }, _minSpendUah_initializers, _minSpendUah_extraInitializers);
            __esDecorate(null, null, _discountPercent_decorators, { kind: "field", name: "discountPercent", static: false, private: false, access: { has: function (obj) { return "discountPercent" in obj; }, get: function (obj) { return obj.discountPercent; }, set: function (obj, value) { obj.discountPercent = value; } }, metadata: _metadata }, _discountPercent_initializers, _discountPercent_extraInitializers);
            if (_metadata) Object.defineProperty(_a, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        })(),
        _a;
}();
exports.CreateLoyaltyTierDto = CreateLoyaltyTierDto;
var UpdateLoyaltyTierDto = /** @class */ (function (_super) {
    __extends(UpdateLoyaltyTierDto, _super);
    function UpdateLoyaltyTierDto() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    return UpdateLoyaltyTierDto;
}((0, mapped_types_1.PartialType)(CreateLoyaltyTierDto)));
exports.UpdateLoyaltyTierDto = UpdateLoyaltyTierDto;
