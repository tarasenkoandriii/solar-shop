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
exports.UpdateVendorDto = exports.CreateVendorDto = void 0;
var mapped_types_1 = require("@nestjs/mapped-types");
var class_validator_1 = require("class-validator");
var CreateVendorDto = function () {
    var _a;
    var _name_decorators;
    var _name_initializers = [];
    var _name_extraInitializers = [];
    var _website_decorators;
    var _website_initializers = [];
    var _website_extraInitializers = [];
    var _warehouseCities_decorators;
    var _warehouseCities_initializers = [];
    var _warehouseCities_extraInitializers = [];
    var _contactPhone_decorators;
    var _contactPhone_initializers = [];
    var _contactPhone_extraInitializers = [];
    var _contactAddress_decorators;
    var _contactAddress_initializers = [];
    var _contactAddress_extraInitializers = [];
    var _contactPersonName_decorators;
    var _contactPersonName_initializers = [];
    var _contactPersonName_extraInitializers = [];
    var _contractStatus_decorators;
    var _contractStatus_initializers = [];
    var _contractStatus_extraInitializers = [];
    var _contractNote_decorators;
    var _contractNote_initializers = [];
    var _contractNote_extraInitializers = [];
    return _a = /** @class */ (function () {
            function CreateVendorDto() {
                this.name = __runInitializers(this, _name_initializers, void 0);
                this.website = (__runInitializers(this, _name_extraInitializers), __runInitializers(this, _website_initializers, void 0));
                this.warehouseCities = (__runInitializers(this, _website_extraInitializers), __runInitializers(this, _warehouseCities_initializers, void 0));
                this.contactPhone = (__runInitializers(this, _warehouseCities_extraInitializers), __runInitializers(this, _contactPhone_initializers, void 0));
                this.contactAddress = (__runInitializers(this, _contactPhone_extraInitializers), __runInitializers(this, _contactAddress_initializers, void 0));
                this.contactPersonName = (__runInitializers(this, _contactAddress_extraInitializers), __runInitializers(this, _contactPersonName_initializers, void 0));
                this.contractStatus = (__runInitializers(this, _contactPersonName_extraInitializers), __runInitializers(this, _contractStatus_initializers, void 0));
                this.contractNote = (__runInitializers(this, _contractStatus_extraInitializers), __runInitializers(this, _contractNote_initializers, void 0));
                __runInitializers(this, _contractNote_extraInitializers);
            }
            return CreateVendorDto;
        }()),
        (function () {
            var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            _name_decorators = [(0, class_validator_1.IsString)(), (0, class_validator_1.MinLength)(2)];
            _website_decorators = [(0, class_validator_1.IsString)()];
            _warehouseCities_decorators = [(0, class_validator_1.IsArray)(), (0, class_validator_1.IsString)({ each: true })];
            _contactPhone_decorators = [(0, class_validator_1.IsOptional)(), (0, class_validator_1.IsString)()];
            _contactAddress_decorators = [(0, class_validator_1.IsOptional)(), (0, class_validator_1.IsString)()];
            _contactPersonName_decorators = [(0, class_validator_1.IsOptional)(), (0, class_validator_1.IsString)()];
            _contractStatus_decorators = [(0, class_validator_1.IsOptional)(), (0, class_validator_1.IsIn)(['NOT_CONTACTED', 'NEGOTIATING', 'SIGNED', 'DECLINED'])];
            _contractNote_decorators = [(0, class_validator_1.IsOptional)(), (0, class_validator_1.IsString)()];
            __esDecorate(null, null, _name_decorators, { kind: "field", name: "name", static: false, private: false, access: { has: function (obj) { return "name" in obj; }, get: function (obj) { return obj.name; }, set: function (obj, value) { obj.name = value; } }, metadata: _metadata }, _name_initializers, _name_extraInitializers);
            __esDecorate(null, null, _website_decorators, { kind: "field", name: "website", static: false, private: false, access: { has: function (obj) { return "website" in obj; }, get: function (obj) { return obj.website; }, set: function (obj, value) { obj.website = value; } }, metadata: _metadata }, _website_initializers, _website_extraInitializers);
            __esDecorate(null, null, _warehouseCities_decorators, { kind: "field", name: "warehouseCities", static: false, private: false, access: { has: function (obj) { return "warehouseCities" in obj; }, get: function (obj) { return obj.warehouseCities; }, set: function (obj, value) { obj.warehouseCities = value; } }, metadata: _metadata }, _warehouseCities_initializers, _warehouseCities_extraInitializers);
            __esDecorate(null, null, _contactPhone_decorators, { kind: "field", name: "contactPhone", static: false, private: false, access: { has: function (obj) { return "contactPhone" in obj; }, get: function (obj) { return obj.contactPhone; }, set: function (obj, value) { obj.contactPhone = value; } }, metadata: _metadata }, _contactPhone_initializers, _contactPhone_extraInitializers);
            __esDecorate(null, null, _contactAddress_decorators, { kind: "field", name: "contactAddress", static: false, private: false, access: { has: function (obj) { return "contactAddress" in obj; }, get: function (obj) { return obj.contactAddress; }, set: function (obj, value) { obj.contactAddress = value; } }, metadata: _metadata }, _contactAddress_initializers, _contactAddress_extraInitializers);
            __esDecorate(null, null, _contactPersonName_decorators, { kind: "field", name: "contactPersonName", static: false, private: false, access: { has: function (obj) { return "contactPersonName" in obj; }, get: function (obj) { return obj.contactPersonName; }, set: function (obj, value) { obj.contactPersonName = value; } }, metadata: _metadata }, _contactPersonName_initializers, _contactPersonName_extraInitializers);
            __esDecorate(null, null, _contractStatus_decorators, { kind: "field", name: "contractStatus", static: false, private: false, access: { has: function (obj) { return "contractStatus" in obj; }, get: function (obj) { return obj.contractStatus; }, set: function (obj, value) { obj.contractStatus = value; } }, metadata: _metadata }, _contractStatus_initializers, _contractStatus_extraInitializers);
            __esDecorate(null, null, _contractNote_decorators, { kind: "field", name: "contractNote", static: false, private: false, access: { has: function (obj) { return "contractNote" in obj; }, get: function (obj) { return obj.contractNote; }, set: function (obj, value) { obj.contractNote = value; } }, metadata: _metadata }, _contractNote_initializers, _contractNote_extraInitializers);
            if (_metadata) Object.defineProperty(_a, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        })(),
        _a;
}();
exports.CreateVendorDto = CreateVendorDto;
var UpdateVendorDto = /** @class */ (function (_super) {
    __extends(UpdateVendorDto, _super);
    function UpdateVendorDto() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    return UpdateVendorDto;
}((0, mapped_types_1.PartialType)(CreateVendorDto)));
exports.UpdateVendorDto = UpdateVendorDto;
