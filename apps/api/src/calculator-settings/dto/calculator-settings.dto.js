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
exports.ApplyScalingThresholdDto = exports.ApplyPowerRangeThresholdDto = exports.UpsertTariffDto = void 0;
var class_validator_1 = require("class-validator");
var UpsertTariffDto = function () {
    var _a;
    var _key_decorators;
    var _key_initializers = [];
    var _key_extraInitializers = [];
    var _label_decorators;
    var _label_initializers = [];
    var _label_extraInitializers = [];
    var _rateUahPerKwh_decorators;
    var _rateUahPerKwh_initializers = [];
    var _rateUahPerKwh_extraInitializers = [];
    var _sourceUrl_decorators;
    var _sourceUrl_initializers = [];
    var _sourceUrl_extraInitializers = [];
    return _a = /** @class */ (function () {
            function UpsertTariffDto() {
                this.key = __runInitializers(this, _key_initializers, void 0);
                this.label = (__runInitializers(this, _key_extraInitializers), __runInitializers(this, _label_initializers, void 0));
                this.rateUahPerKwh = (__runInitializers(this, _label_extraInitializers), __runInitializers(this, _rateUahPerKwh_initializers, void 0));
                this.sourceUrl = (__runInitializers(this, _rateUahPerKwh_extraInitializers), __runInitializers(this, _sourceUrl_initializers, void 0));
                __runInitializers(this, _sourceUrl_extraInitializers);
            }
            return UpsertTariffDto;
        }()),
        (function () {
            var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            _key_decorators = [(0, class_validator_1.IsString)()];
            _label_decorators = [(0, class_validator_1.IsString)()];
            _rateUahPerKwh_decorators = [(0, class_validator_1.IsNumber)(), (0, class_validator_1.Min)(0)];
            _sourceUrl_decorators = [(0, class_validator_1.IsOptional)(), (0, class_validator_1.IsUrl)()];
            __esDecorate(null, null, _key_decorators, { kind: "field", name: "key", static: false, private: false, access: { has: function (obj) { return "key" in obj; }, get: function (obj) { return obj.key; }, set: function (obj, value) { obj.key = value; } }, metadata: _metadata }, _key_initializers, _key_extraInitializers);
            __esDecorate(null, null, _label_decorators, { kind: "field", name: "label", static: false, private: false, access: { has: function (obj) { return "label" in obj; }, get: function (obj) { return obj.label; }, set: function (obj, value) { obj.label = value; } }, metadata: _metadata }, _label_initializers, _label_extraInitializers);
            __esDecorate(null, null, _rateUahPerKwh_decorators, { kind: "field", name: "rateUahPerKwh", static: false, private: false, access: { has: function (obj) { return "rateUahPerKwh" in obj; }, get: function (obj) { return obj.rateUahPerKwh; }, set: function (obj, value) { obj.rateUahPerKwh = value; } }, metadata: _metadata }, _rateUahPerKwh_initializers, _rateUahPerKwh_extraInitializers);
            __esDecorate(null, null, _sourceUrl_decorators, { kind: "field", name: "sourceUrl", static: false, private: false, access: { has: function (obj) { return "sourceUrl" in obj; }, get: function (obj) { return obj.sourceUrl; }, set: function (obj, value) { obj.sourceUrl = value; } }, metadata: _metadata }, _sourceUrl_initializers, _sourceUrl_extraInitializers);
            if (_metadata) Object.defineProperty(_a, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        })(),
        _a;
}();
exports.UpsertTariffDto = UpsertTariffDto;
var ApplyPowerRangeThresholdDto = function () {
    var _a;
    var _tag_decorators;
    var _tag_initializers = [];
    var _tag_extraInitializers = [];
    var _minPanelsWattW_decorators;
    var _minPanelsWattW_initializers = [];
    var _minPanelsWattW_extraInitializers = [];
    var _maxPanelsWattW_decorators;
    var _maxPanelsWattW_initializers = [];
    var _maxPanelsWattW_extraInitializers = [];
    return _a = /** @class */ (function () {
            function ApplyPowerRangeThresholdDto() {
                this.tag = __runInitializers(this, _tag_initializers, void 0);
                this.minPanelsWattW = (__runInitializers(this, _tag_extraInitializers), __runInitializers(this, _minPanelsWattW_initializers, void 0));
                this.maxPanelsWattW = (__runInitializers(this, _minPanelsWattW_extraInitializers), __runInitializers(this, _maxPanelsWattW_initializers, void 0));
                __runInitializers(this, _maxPanelsWattW_extraInitializers);
            }
            return ApplyPowerRangeThresholdDto;
        }()),
        (function () {
            var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            _tag_decorators = [(0, class_validator_1.IsIn)(['SMALL', 'MEDIUM', 'LARGE', 'COMMERCIAL'])];
            _minPanelsWattW_decorators = [(0, class_validator_1.IsNumber)(), (0, class_validator_1.Min)(0)];
            _maxPanelsWattW_decorators = [(0, class_validator_1.IsOptional)(), (0, class_validator_1.IsNumber)(), (0, class_validator_1.Min)(0)];
            __esDecorate(null, null, _tag_decorators, { kind: "field", name: "tag", static: false, private: false, access: { has: function (obj) { return "tag" in obj; }, get: function (obj) { return obj.tag; }, set: function (obj, value) { obj.tag = value; } }, metadata: _metadata }, _tag_initializers, _tag_extraInitializers);
            __esDecorate(null, null, _minPanelsWattW_decorators, { kind: "field", name: "minPanelsWattW", static: false, private: false, access: { has: function (obj) { return "minPanelsWattW" in obj; }, get: function (obj) { return obj.minPanelsWattW; }, set: function (obj, value) { obj.minPanelsWattW = value; } }, metadata: _metadata }, _minPanelsWattW_initializers, _minPanelsWattW_extraInitializers);
            __esDecorate(null, null, _maxPanelsWattW_decorators, { kind: "field", name: "maxPanelsWattW", static: false, private: false, access: { has: function (obj) { return "maxPanelsWattW" in obj; }, get: function (obj) { return obj.maxPanelsWattW; }, set: function (obj, value) { obj.maxPanelsWattW = value; } }, metadata: _metadata }, _maxPanelsWattW_initializers, _maxPanelsWattW_extraInitializers);
            if (_metadata) Object.defineProperty(_a, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        })(),
        _a;
}();
exports.ApplyPowerRangeThresholdDto = ApplyPowerRangeThresholdDto;
var ApplyScalingThresholdDto = function () {
    var _a;
    var _headroomMaxPricePercent_decorators;
    var _headroomMaxPricePercent_initializers = [];
    var _headroomMaxPricePercent_extraInitializers = [];
    return _a = /** @class */ (function () {
            function ApplyScalingThresholdDto() {
                this.headroomMaxPricePercent = __runInitializers(this, _headroomMaxPricePercent_initializers, void 0);
                __runInitializers(this, _headroomMaxPricePercent_extraInitializers);
            }
            return ApplyScalingThresholdDto;
        }()),
        (function () {
            var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            _headroomMaxPricePercent_decorators = [(0, class_validator_1.IsNumber)(), (0, class_validator_1.Min)(0)];
            __esDecorate(null, null, _headroomMaxPricePercent_decorators, { kind: "field", name: "headroomMaxPricePercent", static: false, private: false, access: { has: function (obj) { return "headroomMaxPricePercent" in obj; }, get: function (obj) { return obj.headroomMaxPricePercent; }, set: function (obj, value) { obj.headroomMaxPricePercent = value; } }, metadata: _metadata }, _headroomMaxPricePercent_initializers, _headroomMaxPricePercent_extraInitializers);
            if (_metadata) Object.defineProperty(_a, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        })(),
        _a;
}();
exports.ApplyScalingThresholdDto = ApplyScalingThresholdDto;
