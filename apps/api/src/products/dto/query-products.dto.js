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
exports.QueryProductsDto = void 0;
var class_transformer_1 = require("class-transformer");
var class_validator_1 = require("class-validator");
var QueryProductsDto = function () {
    var _a;
    var _category_decorators;
    var _category_initializers = [];
    var _category_extraInitializers = [];
    var _manufacturerId_decorators;
    var _manufacturerId_initializers = [];
    var _manufacturerId_extraInitializers = [];
    var _sort_decorators;
    var _sort_initializers = [];
    var _sort_extraInitializers = [];
    var _type_decorators;
    var _type_initializers = [];
    var _type_extraInitializers = [];
    var _chemistry_decorators;
    var _chemistry_initializers = [];
    var _chemistry_extraInitializers = [];
    var _controllerType_decorators;
    var _controllerType_initializers = [];
    var _controllerType_extraInitializers = [];
    var _page_decorators;
    var _page_initializers = [];
    var _page_extraInitializers = [];
    var _pageSize_decorators;
    var _pageSize_initializers = [];
    var _pageSize_extraInitializers = [];
    var _inStockOnly_decorators;
    var _inStockOnly_initializers = [];
    var _inStockOnly_extraInitializers = [];
    var _promoOnly_decorators;
    var _promoOnly_initializers = [];
    var _promoOnly_extraInitializers = [];
    var _q_decorators;
    var _q_initializers = [];
    var _q_extraInitializers = [];
    return _a = /** @class */ (function () {
            function QueryProductsDto() {
                this.category = __runInitializers(this, _category_initializers, void 0);
                this.manufacturerId = (__runInitializers(this, _category_extraInitializers), __runInitializers(this, _manufacturerId_initializers, void 0));
                this.sort = (__runInitializers(this, _manufacturerId_extraInitializers), __runInitializers(this, _sort_initializers, void 0));
                this.type = (__runInitializers(this, _sort_extraInitializers), __runInitializers(this, _type_initializers, void 0));
                this.chemistry = (__runInitializers(this, _type_extraInitializers), __runInitializers(this, _chemistry_initializers, void 0));
                this.controllerType = (__runInitializers(this, _chemistry_extraInitializers), __runInitializers(this, _controllerType_initializers, void 0));
                this.page = (__runInitializers(this, _controllerType_extraInitializers), __runInitializers(this, _page_initializers, 1));
                this.pageSize = (__runInitializers(this, _page_extraInitializers), __runInitializers(this, _pageSize_initializers, 12));
                this.inStockOnly = (__runInitializers(this, _pageSize_extraInitializers), __runInitializers(this, _inStockOnly_initializers, void 0));
                // ТЗ п.18.4: опциональный фильтр "Только акции"
                this.promoOnly = (__runInitializers(this, _inStockOnly_extraInitializers), __runInitializers(this, _promoOnly_initializers, void 0));
                // ТЗ п.30.2: базовый site search (pg_trgm) по name/articleNumber/manufacturerSku
                this.q = (__runInitializers(this, _promoOnly_extraInitializers), __runInitializers(this, _q_initializers, void 0));
                __runInitializers(this, _q_extraInitializers);
            }
            return QueryProductsDto;
        }()),
        (function () {
            var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            _category_decorators = [(0, class_validator_1.IsOptional)(), (0, class_validator_1.IsIn)(['SOLAR_PANEL', 'BATTERY', 'CONTROLLER'])];
            _manufacturerId_decorators = [(0, class_validator_1.IsOptional)(), (0, class_validator_1.IsArray)(), (0, class_transformer_1.Type)(function () { return String; })];
            _sort_decorators = [(0, class_validator_1.IsOptional)(), (0, class_validator_1.IsIn)(['price_asc', 'price_desc', 'newest'])];
            _type_decorators = [(0, class_validator_1.IsOptional)(), (0, class_validator_1.IsString)()];
            _chemistry_decorators = [(0, class_validator_1.IsOptional)(), (0, class_validator_1.IsString)()];
            _controllerType_decorators = [(0, class_validator_1.IsOptional)(), (0, class_validator_1.IsString)()];
            _page_decorators = [(0, class_validator_1.IsOptional)(), (0, class_transformer_1.Type)(function () { return Number; }), (0, class_validator_1.IsInt)(), (0, class_validator_1.Min)(1)];
            _pageSize_decorators = [(0, class_validator_1.IsOptional)(), (0, class_transformer_1.Type)(function () { return Number; }), (0, class_validator_1.IsInt)(), (0, class_validator_1.Min)(1)];
            _inStockOnly_decorators = [(0, class_validator_1.IsOptional)(), (0, class_validator_1.IsBoolean)(), (0, class_transformer_1.Type)(function () { return Boolean; })];
            _promoOnly_decorators = [(0, class_validator_1.IsOptional)(), (0, class_validator_1.IsBoolean)(), (0, class_transformer_1.Type)(function () { return Boolean; })];
            _q_decorators = [(0, class_validator_1.IsOptional)(), (0, class_validator_1.IsString)()];
            __esDecorate(null, null, _category_decorators, { kind: "field", name: "category", static: false, private: false, access: { has: function (obj) { return "category" in obj; }, get: function (obj) { return obj.category; }, set: function (obj, value) { obj.category = value; } }, metadata: _metadata }, _category_initializers, _category_extraInitializers);
            __esDecorate(null, null, _manufacturerId_decorators, { kind: "field", name: "manufacturerId", static: false, private: false, access: { has: function (obj) { return "manufacturerId" in obj; }, get: function (obj) { return obj.manufacturerId; }, set: function (obj, value) { obj.manufacturerId = value; } }, metadata: _metadata }, _manufacturerId_initializers, _manufacturerId_extraInitializers);
            __esDecorate(null, null, _sort_decorators, { kind: "field", name: "sort", static: false, private: false, access: { has: function (obj) { return "sort" in obj; }, get: function (obj) { return obj.sort; }, set: function (obj, value) { obj.sort = value; } }, metadata: _metadata }, _sort_initializers, _sort_extraInitializers);
            __esDecorate(null, null, _type_decorators, { kind: "field", name: "type", static: false, private: false, access: { has: function (obj) { return "type" in obj; }, get: function (obj) { return obj.type; }, set: function (obj, value) { obj.type = value; } }, metadata: _metadata }, _type_initializers, _type_extraInitializers);
            __esDecorate(null, null, _chemistry_decorators, { kind: "field", name: "chemistry", static: false, private: false, access: { has: function (obj) { return "chemistry" in obj; }, get: function (obj) { return obj.chemistry; }, set: function (obj, value) { obj.chemistry = value; } }, metadata: _metadata }, _chemistry_initializers, _chemistry_extraInitializers);
            __esDecorate(null, null, _controllerType_decorators, { kind: "field", name: "controllerType", static: false, private: false, access: { has: function (obj) { return "controllerType" in obj; }, get: function (obj) { return obj.controllerType; }, set: function (obj, value) { obj.controllerType = value; } }, metadata: _metadata }, _controllerType_initializers, _controllerType_extraInitializers);
            __esDecorate(null, null, _page_decorators, { kind: "field", name: "page", static: false, private: false, access: { has: function (obj) { return "page" in obj; }, get: function (obj) { return obj.page; }, set: function (obj, value) { obj.page = value; } }, metadata: _metadata }, _page_initializers, _page_extraInitializers);
            __esDecorate(null, null, _pageSize_decorators, { kind: "field", name: "pageSize", static: false, private: false, access: { has: function (obj) { return "pageSize" in obj; }, get: function (obj) { return obj.pageSize; }, set: function (obj, value) { obj.pageSize = value; } }, metadata: _metadata }, _pageSize_initializers, _pageSize_extraInitializers);
            __esDecorate(null, null, _inStockOnly_decorators, { kind: "field", name: "inStockOnly", static: false, private: false, access: { has: function (obj) { return "inStockOnly" in obj; }, get: function (obj) { return obj.inStockOnly; }, set: function (obj, value) { obj.inStockOnly = value; } }, metadata: _metadata }, _inStockOnly_initializers, _inStockOnly_extraInitializers);
            __esDecorate(null, null, _promoOnly_decorators, { kind: "field", name: "promoOnly", static: false, private: false, access: { has: function (obj) { return "promoOnly" in obj; }, get: function (obj) { return obj.promoOnly; }, set: function (obj, value) { obj.promoOnly = value; } }, metadata: _metadata }, _promoOnly_initializers, _promoOnly_extraInitializers);
            __esDecorate(null, null, _q_decorators, { kind: "field", name: "q", static: false, private: false, access: { has: function (obj) { return "q" in obj; }, get: function (obj) { return obj.q; }, set: function (obj, value) { obj.q = value; } }, metadata: _metadata }, _q_initializers, _q_extraInitializers);
            if (_metadata) Object.defineProperty(_a, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        })(),
        _a;
}();
exports.QueryProductsDto = QueryProductsDto;
