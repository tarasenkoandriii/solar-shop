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
exports.RecomputeInterpolationDto = exports.RecomputeGridDto = exports.LogEmbedViewDto = void 0;
var class_validator_1 = require("class-validator");
var LogEmbedViewDto = function () {
    var _a;
    var _widgetKey_decorators;
    var _widgetKey_initializers = [];
    var _widgetKey_extraInitializers = [];
    var _refererHost_decorators;
    var _refererHost_initializers = [];
    var _refererHost_extraInitializers = [];
    return _a = /** @class */ (function () {
            function LogEmbedViewDto() {
                this.widgetKey = __runInitializers(this, _widgetKey_initializers, void 0);
                this.refererHost = (__runInitializers(this, _widgetKey_extraInitializers), __runInitializers(this, _refererHost_initializers, void 0));
                __runInitializers(this, _refererHost_extraInitializers);
            }
            return LogEmbedViewDto;
        }()),
        (function () {
            var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            _widgetKey_decorators = [(0, class_validator_1.IsString)()];
            _refererHost_decorators = [(0, class_validator_1.IsOptional)(), (0, class_validator_1.IsString)()];
            __esDecorate(null, null, _widgetKey_decorators, { kind: "field", name: "widgetKey", static: false, private: false, access: { has: function (obj) { return "widgetKey" in obj; }, get: function (obj) { return obj.widgetKey; }, set: function (obj, value) { obj.widgetKey = value; } }, metadata: _metadata }, _widgetKey_initializers, _widgetKey_extraInitializers);
            __esDecorate(null, null, _refererHost_decorators, { kind: "field", name: "refererHost", static: false, private: false, access: { has: function (obj) { return "refererHost" in obj; }, get: function (obj) { return obj.refererHost; }, set: function (obj, value) { obj.refererHost = value; } }, metadata: _metadata }, _refererHost_initializers, _refererHost_extraInitializers);
            if (_metadata) Object.defineProperty(_a, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        })(),
        _a;
}();
exports.LogEmbedViewDto = LogEmbedViewDto;
var RecomputeGridDto = function () {
    var _a;
    var _stepDegrees_decorators;
    var _stepDegrees_initializers = [];
    var _stepDegrees_extraInitializers = [];
    return _a = /** @class */ (function () {
            function RecomputeGridDto() {
                this.stepDegrees = __runInitializers(this, _stepDegrees_initializers, void 0);
                __runInitializers(this, _stepDegrees_extraInitializers);
            }
            return RecomputeGridDto;
        }()),
        (function () {
            var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            _stepDegrees_decorators = [(0, class_validator_1.IsOptional)(), (0, class_validator_1.IsInt)(), (0, class_validator_1.Min)(1), (0, class_validator_1.Max)(5)];
            __esDecorate(null, null, _stepDegrees_decorators, { kind: "field", name: "stepDegrees", static: false, private: false, access: { has: function (obj) { return "stepDegrees" in obj; }, get: function (obj) { return obj.stepDegrees; }, set: function (obj, value) { obj.stepDegrees = value; } }, metadata: _metadata }, _stepDegrees_initializers, _stepDegrees_extraInitializers);
            if (_metadata) Object.defineProperty(_a, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        })(),
        _a;
}();
exports.RecomputeGridDto = RecomputeGridDto;
var RecomputeInterpolationDto = function () {
    var _a;
    var _resolution_decorators;
    var _resolution_initializers = [];
    var _resolution_extraInitializers = [];
    return _a = /** @class */ (function () {
            function RecomputeInterpolationDto() {
                this.resolution = __runInitializers(this, _resolution_initializers, void 0);
                __runInitializers(this, _resolution_extraInitializers);
            }
            return RecomputeInterpolationDto;
        }()),
        (function () {
            var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            _resolution_decorators = [(0, class_validator_1.IsOptional)(), (0, class_validator_1.IsInt)(), (0, class_validator_1.Min)(10), (0, class_validator_1.Max)(200)];
            __esDecorate(null, null, _resolution_decorators, { kind: "field", name: "resolution", static: false, private: false, access: { has: function (obj) { return "resolution" in obj; }, get: function (obj) { return obj.resolution; }, set: function (obj, value) { obj.resolution = value; } }, metadata: _metadata }, _resolution_initializers, _resolution_extraInitializers);
            if (_metadata) Object.defineProperty(_a, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        })(),
        _a;
}();
exports.RecomputeInterpolationDto = RecomputeInterpolationDto;
