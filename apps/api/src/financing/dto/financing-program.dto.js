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
exports.UpdateFinancingProgramDto = void 0;
var class_validator_1 = require("class-validator");
// Найдено при полном аудите (AUDIT-FULL.md): раньше контроллер принимал
// `Record<string, unknown>` напрямую в Prisma update — mass-assignment
// риск (можно было передать произвольные поля, включая не предназначенные
// для ручного редактирования). Явный DTO со списком разрешённых полей.
var UpdateFinancingProgramDto = function () {
    var _a;
    var _name_decorators;
    var _name_initializers = [];
    var _name_extraInitializers = [];
    var _eligibility_decorators;
    var _eligibility_initializers = [];
    var _eligibility_extraInitializers = [];
    var _description_decorators;
    var _description_initializers = [];
    var _description_extraInitializers = [];
    var _url_decorators;
    var _url_initializers = [];
    var _url_extraInitializers = [];
    var _minLoanUsd_decorators;
    var _minLoanUsd_initializers = [];
    var _minLoanUsd_extraInitializers = [];
    var _maxLoanUsd_decorators;
    var _maxLoanUsd_initializers = [];
    var _maxLoanUsd_extraInitializers = [];
    return _a = /** @class */ (function () {
            function UpdateFinancingProgramDto() {
                this.name = __runInitializers(this, _name_initializers, void 0);
                this.eligibility = (__runInitializers(this, _name_extraInitializers), __runInitializers(this, _eligibility_initializers, void 0));
                this.description = (__runInitializers(this, _eligibility_extraInitializers), __runInitializers(this, _description_initializers, void 0));
                this.url = (__runInitializers(this, _description_extraInitializers), __runInitializers(this, _url_initializers, void 0));
                this.minLoanUsd = (__runInitializers(this, _url_extraInitializers), __runInitializers(this, _minLoanUsd_initializers, void 0));
                this.maxLoanUsd = (__runInitializers(this, _minLoanUsd_extraInitializers), __runInitializers(this, _maxLoanUsd_initializers, void 0));
                __runInitializers(this, _maxLoanUsd_extraInitializers);
            }
            return UpdateFinancingProgramDto;
        }()),
        (function () {
            var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            _name_decorators = [(0, class_validator_1.IsOptional)(), (0, class_validator_1.IsString)(), (0, class_validator_1.MinLength)(2)];
            _eligibility_decorators = [(0, class_validator_1.IsOptional)(), (0, class_validator_1.IsString)()];
            _description_decorators = [(0, class_validator_1.IsOptional)(), (0, class_validator_1.IsString)()];
            _url_decorators = [(0, class_validator_1.IsOptional)(), (0, class_validator_1.IsUrl)()];
            _minLoanUsd_decorators = [(0, class_validator_1.IsOptional)(), (0, class_validator_1.IsNumber)()];
            _maxLoanUsd_decorators = [(0, class_validator_1.IsOptional)(), (0, class_validator_1.IsNumber)()];
            __esDecorate(null, null, _name_decorators, { kind: "field", name: "name", static: false, private: false, access: { has: function (obj) { return "name" in obj; }, get: function (obj) { return obj.name; }, set: function (obj, value) { obj.name = value; } }, metadata: _metadata }, _name_initializers, _name_extraInitializers);
            __esDecorate(null, null, _eligibility_decorators, { kind: "field", name: "eligibility", static: false, private: false, access: { has: function (obj) { return "eligibility" in obj; }, get: function (obj) { return obj.eligibility; }, set: function (obj, value) { obj.eligibility = value; } }, metadata: _metadata }, _eligibility_initializers, _eligibility_extraInitializers);
            __esDecorate(null, null, _description_decorators, { kind: "field", name: "description", static: false, private: false, access: { has: function (obj) { return "description" in obj; }, get: function (obj) { return obj.description; }, set: function (obj, value) { obj.description = value; } }, metadata: _metadata }, _description_initializers, _description_extraInitializers);
            __esDecorate(null, null, _url_decorators, { kind: "field", name: "url", static: false, private: false, access: { has: function (obj) { return "url" in obj; }, get: function (obj) { return obj.url; }, set: function (obj, value) { obj.url = value; } }, metadata: _metadata }, _url_initializers, _url_extraInitializers);
            __esDecorate(null, null, _minLoanUsd_decorators, { kind: "field", name: "minLoanUsd", static: false, private: false, access: { has: function (obj) { return "minLoanUsd" in obj; }, get: function (obj) { return obj.minLoanUsd; }, set: function (obj, value) { obj.minLoanUsd = value; } }, metadata: _metadata }, _minLoanUsd_initializers, _minLoanUsd_extraInitializers);
            __esDecorate(null, null, _maxLoanUsd_decorators, { kind: "field", name: "maxLoanUsd", static: false, private: false, access: { has: function (obj) { return "maxLoanUsd" in obj; }, get: function (obj) { return obj.maxLoanUsd; }, set: function (obj, value) { obj.maxLoanUsd = value; } }, metadata: _metadata }, _maxLoanUsd_initializers, _maxLoanUsd_extraInitializers);
            if (_metadata) Object.defineProperty(_a, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        })(),
        _a;
}();
exports.UpdateFinancingProgramDto = UpdateFinancingProgramDto;
