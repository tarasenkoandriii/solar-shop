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
exports.AdapterRegistry = void 0;
var common_1 = require("@nestjs/common");
var sunshop_adapter_1 = require("./adapters/sunshop.adapter");
var akumulyator_center_adapter_1 = require("./adapters/akumulyator-center.adapter");
var voltmarket_adapter_1 = require("./adapters/voltmarket.adapter");
var vencon_adapter_1 = require("./adapters/vencon.adapter");
// Реестр адаптеров — новый Vendor подключается добавлением сюда новой
// реализации ISourceAdapter (ТЗ п.13.4). 4 из 5 приоритетных поставщиков
// ТЗ п.12 покрыты (sunshop.com.ua, akumulyator.center, voltmarket.ua,
// vencon.ua) — saen.com.ua сознательно не реализован: при исследовании
// сайта на этапе написания кода выяснилось, что это в первую очередь
// сайт монтажной компании (лендинги услуг/проектов), а не витрина с
// фиксированной сеткой товаров, как у остальных 4 — прямая ссылка на
// прайс-лист вернула 404, структура каталога не подтвердилась. Нужно
// либо найти у него реальный каталог другим способом при следующей
// сессии с доступом к сайту, либо исключить из списка источников
// (см. AUDIT-PHASE-2.md).
var AdapterRegistry = function () {
    var _classDecorators = [(0, common_1.Injectable)()];
    var _classDescriptor;
    var _classExtraInitializers = [];
    var _classThis;
    var AdapterRegistry = _classThis = /** @class */ (function () {
        function AdapterRegistry_1() {
            this.adapters = [
                new sunshop_adapter_1.SunshopAdapter(),
                new akumulyator_center_adapter_1.AkumulyatorCenterAdapter(),
                new voltmarket_adapter_1.VoltmarketAdapter(),
                new vencon_adapter_1.VenconAdapter(),
            ];
        }
        AdapterRegistry_1.prototype.getAll = function () {
            return this.adapters;
        };
        AdapterRegistry_1.prototype.getByVendorName = function (vendorName) {
            return this.adapters.find(function (a) { return a.vendorName === vendorName; });
        };
        return AdapterRegistry_1;
    }());
    __setFunctionName(_classThis, "AdapterRegistry");
    (function () {
        var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        AdapterRegistry = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return AdapterRegistry = _classThis;
}();
exports.AdapterRegistry = AdapterRegistry;
