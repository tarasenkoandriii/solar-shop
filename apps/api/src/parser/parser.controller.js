"use strict";
var __runInitializers = (this && this.__runInitializers) || function (thisArg, initializers, value) {
    var useValue = arguments.length > 2;
    for (var i = 0; i < initializers.length; i++) {
        value = useValue ? initializers[i].call(thisArg, value) : initializers[i].call(thisArg);
    }
    return useValue ? value : void 0;
};
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
var __setFunctionName = (this && this.__setFunctionName) || function (f, name, prefix) {
    if (typeof name === "symbol") name = name.description ? "[".concat(name.description, "]") : "";
    return Object.defineProperty(f, "name", { configurable: true, value: prefix ? "".concat(prefix, " ", name) : name });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ParserController = void 0;
var common_1 = require("@nestjs/common");
var db_1 = require("@solar-shop/db");
var jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
var roles_guard_1 = require("../auth/guards/roles.guard");
var roles_decorator_1 = require("../auth/decorators/roles.decorator");
// Запуск парсера (product_parser) — только через единую точку CronModule
// (ТЗ п.27.3: "тот же внутренний эндпоинт, что и pg_cron"), см.
// /admin/cron/product_parser/run и /internal/cron/product_parser/run.
// Здесь остаются только экраны "Листинги" и "Кандидаты в siblings", плюс
// экспорт/импорт данных парсера по Vendor для миграции между окружениями.
var ParserController = function () {
    var _classDecorators = [(0, common_1.Controller)()];
    var _classDescriptor;
    var _classExtraInitializers = [];
    var _classThis;
    var _instanceExtraInitializers = [];
    var _listListings_decorators;
    var _getCandidates_decorators;
    var _confirm_decorators;
    var _reject_decorators;
    var _exportVendor_decorators;
    var _importVendor_decorators;
    var ParserController = _classThis = /** @class */ (function () {
        function ParserController_1(siblings, sourceListings, dataTransfer) {
            this.siblings = (__runInitializers(this, _instanceExtraInitializers), siblings);
            this.sourceListings = sourceListings;
            this.dataTransfer = dataTransfer;
        }
        ParserController_1.prototype.listListings = function (vendorId, inStockOnly) {
            return this.sourceListings.findAll({ vendorId: vendorId, inStockOnly: inStockOnly === 'true' });
        };
        ParserController_1.prototype.getCandidates = function () {
            return this.siblings.getCandidates();
        };
        ParserController_1.prototype.confirm = function (sourceListingId, productId) {
            return this.siblings.confirmMatch(sourceListingId, productId);
        };
        ParserController_1.prototype.reject = function (sourceListingId, productId) {
            return this.siblings.rejectMatch(sourceListingId, productId);
        };
        // Миграция данных парсера между окружениями — экспорт по одному Vendor
        // в JSON (скачивается как файл в браузере), импорт того же формата
        // идемпотентно применяется в целевом окружении.
        ParserController_1.prototype.exportVendor = function (id) {
            return this.dataTransfer.exportVendor(id);
        };
        ParserController_1.prototype.importVendor = function (payload) {
            return this.dataTransfer.importVendorData(payload);
        };
        return ParserController_1;
    }());
    __setFunctionName(_classThis, "ParserController");
    (function () {
        var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        _listListings_decorators = [(0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard), (0, roles_decorator_1.Roles)(db_1.UserRole.ADMIN, db_1.UserRole.MANAGER), (0, common_1.Get)('admin/listings')];
        _getCandidates_decorators = [(0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard), (0, roles_decorator_1.Roles)(db_1.UserRole.ADMIN), (0, common_1.Get)('admin/siblings/candidates')];
        _confirm_decorators = [(0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard), (0, roles_decorator_1.Roles)(db_1.UserRole.ADMIN), (0, common_1.Post)('admin/siblings/:sourceListingId/confirm/:productId')];
        _reject_decorators = [(0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard), (0, roles_decorator_1.Roles)(db_1.UserRole.ADMIN), (0, common_1.Post)('admin/siblings/:sourceListingId/reject/:productId')];
        _exportVendor_decorators = [(0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard), (0, roles_decorator_1.Roles)(db_1.UserRole.ADMIN), (0, common_1.Get)('admin/vendors/:id/export')];
        _importVendor_decorators = [(0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard), (0, roles_decorator_1.Roles)(db_1.UserRole.ADMIN), (0, common_1.Post)('admin/vendors/import')];
        __esDecorate(_classThis, null, _listListings_decorators, { kind: "method", name: "listListings", static: false, private: false, access: { has: function (obj) { return "listListings" in obj; }, get: function (obj) { return obj.listListings; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _getCandidates_decorators, { kind: "method", name: "getCandidates", static: false, private: false, access: { has: function (obj) { return "getCandidates" in obj; }, get: function (obj) { return obj.getCandidates; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _confirm_decorators, { kind: "method", name: "confirm", static: false, private: false, access: { has: function (obj) { return "confirm" in obj; }, get: function (obj) { return obj.confirm; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _reject_decorators, { kind: "method", name: "reject", static: false, private: false, access: { has: function (obj) { return "reject" in obj; }, get: function (obj) { return obj.reject; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _exportVendor_decorators, { kind: "method", name: "exportVendor", static: false, private: false, access: { has: function (obj) { return "exportVendor" in obj; }, get: function (obj) { return obj.exportVendor; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _importVendor_decorators, { kind: "method", name: "importVendor", static: false, private: false, access: { has: function (obj) { return "importVendor" in obj; }, get: function (obj) { return obj.importVendor; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        ParserController = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return ParserController = _classThis;
}();
exports.ParserController = ParserController;
