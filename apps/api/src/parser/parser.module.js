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
exports.ParserModule = void 0;
var common_1 = require("@nestjs/common");
var auth_module_1 = require("../auth/auth.module");
var grok_module_1 = require("../grok/grok.module");
var products_module_1 = require("../products/products.module");
var parser_controller_1 = require("./parser.controller");
var parser_service_1 = require("./parser.service");
var matching_service_1 = require("./matching.service");
var siblings_service_1 = require("./siblings.service");
var source_listings_service_1 = require("./source-listings.service");
var vendor_data_transfer_service_1 = require("./vendor-data-transfer.service");
var adapter_registry_1 = require("./adapter-registry");
var ParserModule = function () {
    var _classDecorators = [(0, common_1.Module)({
            imports: [auth_module_1.AuthModule, grok_module_1.GrokModule, products_module_1.ProductsModule],
            controllers: [parser_controller_1.ParserController],
            providers: [parser_service_1.ParserService, matching_service_1.MatchingService, siblings_service_1.SiblingsService, source_listings_service_1.SourceListingsService, vendor_data_transfer_service_1.VendorDataTransferService, adapter_registry_1.AdapterRegistry],
            exports: [parser_service_1.ParserService], // ParserService всё ещё нужен CronModule для запуска джоба
        })];
    var _classDescriptor;
    var _classExtraInitializers = [];
    var _classThis;
    var ParserModule = _classThis = /** @class */ (function () {
        function ParserModule_1() {
        }
        return ParserModule_1;
    }());
    __setFunctionName(_classThis, "ParserModule");
    (function () {
        var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        ParserModule = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return ParserModule = _classThis;
}();
exports.ParserModule = ParserModule;
