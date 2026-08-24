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
exports.UpdateProductDto = exports.CreateProductDto = void 0;
var mapped_types_1 = require("@nestjs/mapped-types");
var class_transformer_1 = require("class-transformer");
var class_validator_1 = require("class-validator");
var CreateProductDto = function () {
    var _a;
    var _category_decorators;
    var _category_initializers = [];
    var _category_extraInitializers = [];
    var _name_decorators;
    var _name_initializers = [];
    var _name_extraInitializers = [];
    var _manufacturerId_decorators;
    var _manufacturerId_initializers = [];
    var _manufacturerId_extraInitializers = [];
    var _manufacturerSku_decorators;
    var _manufacturerSku_initializers = [];
    var _manufacturerSku_extraInitializers = [];
    var _images_decorators;
    var _images_initializers = [];
    var _images_extraInitializers = [];
    var _shortDescription_decorators;
    var _shortDescription_initializers = [];
    var _shortDescription_extraInitializers = [];
    var _description_decorators;
    var _description_initializers = [];
    var _description_extraInitializers = [];
    var _specs_decorators;
    var _specs_initializers = [];
    var _specs_extraInitializers = [];
    var _status_decorators;
    var _status_initializers = [];
    var _status_extraInitializers = [];
    var _isNew_decorators;
    var _isNew_initializers = [];
    var _isNew_extraInitializers = [];
    var _metaTitle_decorators;
    var _metaTitle_initializers = [];
    var _metaTitle_extraInitializers = [];
    var _metaDescription_decorators;
    var _metaDescription_initializers = [];
    var _metaDescription_extraInitializers = [];
    return _a = /** @class */ (function () {
            function CreateProductDto() {
                this.category = __runInitializers(this, _category_initializers, void 0);
                this.name = (__runInitializers(this, _category_extraInitializers), __runInitializers(this, _name_initializers, void 0));
                this.manufacturerId = (__runInitializers(this, _name_extraInitializers), __runInitializers(this, _manufacturerId_initializers, void 0));
                this.manufacturerSku = (__runInitializers(this, _manufacturerId_extraInitializers), __runInitializers(this, _manufacturerSku_initializers, void 0));
                // По одному URL на элемент — сервис пересоздаёт ProductImage-галерею
                // целиком при каждом update (ТЗ п.26.2: первый элемент = обложка).
                this.images = (__runInitializers(this, _manufacturerSku_extraInitializers), __runInitializers(this, _images_initializers, void 0));
                this.shortDescription = (__runInitializers(this, _images_extraInitializers), __runInitializers(this, _shortDescription_initializers, void 0));
                this.description = (__runInitializers(this, _shortDescription_extraInitializers), __runInitializers(this, _description_initializers, void 0));
                this.specs = (__runInitializers(this, _description_extraInitializers), __runInitializers(this, _specs_initializers, void 0));
                this.status = (__runInitializers(this, _specs_extraInitializers), __runInitializers(this, _status_initializers, void 0));
                // Маркетинговый флаг "новинка" — вручную в админке, парсер это не определяет.
                this.isNew = (__runInitializers(this, _status_extraInitializers), __runInitializers(this, _isNew_initializers, void 0));
                this.metaTitle = (__runInitializers(this, _isNew_extraInitializers), __runInitializers(this, _metaTitle_initializers, void 0));
                this.metaDescription = (__runInitializers(this, _metaTitle_extraInitializers), __runInitializers(this, _metaDescription_initializers, void 0));
                __runInitializers(this, _metaDescription_extraInitializers);
            }
            return CreateProductDto;
        }()),
        (function () {
            var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            _category_decorators = [(0, class_validator_1.IsIn)(['SOLAR_PANEL', 'BATTERY', 'CONTROLLER'])];
            _name_decorators = [(0, class_validator_1.IsString)(), (0, class_validator_1.MinLength)(2)];
            _manufacturerId_decorators = [(0, class_validator_1.IsOptional)(), (0, class_validator_1.IsString)()];
            _manufacturerSku_decorators = [(0, class_validator_1.IsOptional)(), (0, class_validator_1.IsString)()];
            _images_decorators = [(0, class_validator_1.IsArray)(), (0, class_validator_1.IsString)({ each: true })];
            _shortDescription_decorators = [(0, class_validator_1.IsString)()];
            _description_decorators = [(0, class_validator_1.IsString)()];
            _specs_decorators = [(0, class_validator_1.IsObject)()];
            _status_decorators = [(0, class_validator_1.IsOptional)(), (0, class_validator_1.IsIn)(['DRAFT', 'PUBLISHED', 'ARCHIVED'])];
            _isNew_decorators = [(0, class_validator_1.IsOptional)(), (0, class_validator_1.IsBoolean)(), (0, class_transformer_1.Type)(function () { return Boolean; })];
            _metaTitle_decorators = [(0, class_validator_1.IsOptional)(), (0, class_validator_1.IsString)()];
            _metaDescription_decorators = [(0, class_validator_1.IsOptional)(), (0, class_validator_1.IsString)()];
            __esDecorate(null, null, _category_decorators, { kind: "field", name: "category", static: false, private: false, access: { has: function (obj) { return "category" in obj; }, get: function (obj) { return obj.category; }, set: function (obj, value) { obj.category = value; } }, metadata: _metadata }, _category_initializers, _category_extraInitializers);
            __esDecorate(null, null, _name_decorators, { kind: "field", name: "name", static: false, private: false, access: { has: function (obj) { return "name" in obj; }, get: function (obj) { return obj.name; }, set: function (obj, value) { obj.name = value; } }, metadata: _metadata }, _name_initializers, _name_extraInitializers);
            __esDecorate(null, null, _manufacturerId_decorators, { kind: "field", name: "manufacturerId", static: false, private: false, access: { has: function (obj) { return "manufacturerId" in obj; }, get: function (obj) { return obj.manufacturerId; }, set: function (obj, value) { obj.manufacturerId = value; } }, metadata: _metadata }, _manufacturerId_initializers, _manufacturerId_extraInitializers);
            __esDecorate(null, null, _manufacturerSku_decorators, { kind: "field", name: "manufacturerSku", static: false, private: false, access: { has: function (obj) { return "manufacturerSku" in obj; }, get: function (obj) { return obj.manufacturerSku; }, set: function (obj, value) { obj.manufacturerSku = value; } }, metadata: _metadata }, _manufacturerSku_initializers, _manufacturerSku_extraInitializers);
            __esDecorate(null, null, _images_decorators, { kind: "field", name: "images", static: false, private: false, access: { has: function (obj) { return "images" in obj; }, get: function (obj) { return obj.images; }, set: function (obj, value) { obj.images = value; } }, metadata: _metadata }, _images_initializers, _images_extraInitializers);
            __esDecorate(null, null, _shortDescription_decorators, { kind: "field", name: "shortDescription", static: false, private: false, access: { has: function (obj) { return "shortDescription" in obj; }, get: function (obj) { return obj.shortDescription; }, set: function (obj, value) { obj.shortDescription = value; } }, metadata: _metadata }, _shortDescription_initializers, _shortDescription_extraInitializers);
            __esDecorate(null, null, _description_decorators, { kind: "field", name: "description", static: false, private: false, access: { has: function (obj) { return "description" in obj; }, get: function (obj) { return obj.description; }, set: function (obj, value) { obj.description = value; } }, metadata: _metadata }, _description_initializers, _description_extraInitializers);
            __esDecorate(null, null, _specs_decorators, { kind: "field", name: "specs", static: false, private: false, access: { has: function (obj) { return "specs" in obj; }, get: function (obj) { return obj.specs; }, set: function (obj, value) { obj.specs = value; } }, metadata: _metadata }, _specs_initializers, _specs_extraInitializers);
            __esDecorate(null, null, _status_decorators, { kind: "field", name: "status", static: false, private: false, access: { has: function (obj) { return "status" in obj; }, get: function (obj) { return obj.status; }, set: function (obj, value) { obj.status = value; } }, metadata: _metadata }, _status_initializers, _status_extraInitializers);
            __esDecorate(null, null, _isNew_decorators, { kind: "field", name: "isNew", static: false, private: false, access: { has: function (obj) { return "isNew" in obj; }, get: function (obj) { return obj.isNew; }, set: function (obj, value) { obj.isNew = value; } }, metadata: _metadata }, _isNew_initializers, _isNew_extraInitializers);
            __esDecorate(null, null, _metaTitle_decorators, { kind: "field", name: "metaTitle", static: false, private: false, access: { has: function (obj) { return "metaTitle" in obj; }, get: function (obj) { return obj.metaTitle; }, set: function (obj, value) { obj.metaTitle = value; } }, metadata: _metadata }, _metaTitle_initializers, _metaTitle_extraInitializers);
            __esDecorate(null, null, _metaDescription_decorators, { kind: "field", name: "metaDescription", static: false, private: false, access: { has: function (obj) { return "metaDescription" in obj; }, get: function (obj) { return obj.metaDescription; }, set: function (obj, value) { obj.metaDescription = value; } }, metadata: _metadata }, _metaDescription_initializers, _metaDescription_extraInitializers);
            if (_metadata) Object.defineProperty(_a, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        })(),
        _a;
}();
exports.CreateProductDto = CreateProductDto;
var UpdateProductDto = /** @class */ (function (_super) {
    __extends(UpdateProductDto, _super);
    function UpdateProductDto() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    return UpdateProductDto;
}((0, mapped_types_1.PartialType)((0, mapped_types_1.OmitType)(CreateProductDto, ['category']))));
exports.UpdateProductDto = UpdateProductDto;
