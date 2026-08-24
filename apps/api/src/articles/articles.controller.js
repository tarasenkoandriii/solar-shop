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
exports.ArticlesController = void 0;
var common_1 = require("@nestjs/common");
var db_1 = require("@solar-shop/db");
var jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
var roles_guard_1 = require("../auth/guards/roles.guard");
var roles_decorator_1 = require("../auth/decorators/roles.decorator");
// Запуск парсера статей (article_parser) — только через CronModule (см.
// комментарий в ParserController) — здесь только чтение + модерация.
var ArticlesController = function () {
    var _classDecorators = [(0, common_1.Controller)()];
    var _classDescriptor;
    var _classExtraInitializers = [];
    var _classThis;
    var _instanceExtraInitializers = [];
    var _findPublished_decorators;
    var _findBySlug_decorators;
    var _findAllForAdmin_decorators;
    var _updateArticle_decorators;
    var _updateTranslation_decorators;
    var ArticlesController = _classThis = /** @class */ (function () {
        function ArticlesController_1(service) {
            this.service = (__runInitializers(this, _instanceExtraInitializers), service);
        }
        ArticlesController_1.prototype.findPublished = function (locale) {
            if (locale === void 0) { locale = 'uk'; }
            return this.service.findPublished(locale);
        };
        ArticlesController_1.prototype.findBySlug = function (slug, locale) {
            if (locale === void 0) { locale = 'uk'; }
            return this.service.findBySlug(locale, slug);
        };
        ArticlesController_1.prototype.findAllForAdmin = function () {
            return this.service.findAllForAdmin();
        };
        ArticlesController_1.prototype.updateArticle = function (id, dto) {
            return this.service.updateArticle(id, dto);
        };
        ArticlesController_1.prototype.updateTranslation = function (id, dto) {
            return this.service.updateTranslation(id, dto);
        };
        return ArticlesController_1;
    }());
    __setFunctionName(_classThis, "ArticlesController");
    (function () {
        var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        _findPublished_decorators = [(0, common_1.Get)('articles')];
        _findBySlug_decorators = [(0, common_1.Get)('articles/:slug')];
        _findAllForAdmin_decorators = [(0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard), (0, roles_decorator_1.Roles)(db_1.UserRole.ADMIN), (0, common_1.Get)('admin/articles')];
        _updateArticle_decorators = [(0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard), (0, roles_decorator_1.Roles)(db_1.UserRole.ADMIN), (0, common_1.Put)('admin/articles/:id')];
        _updateTranslation_decorators = [(0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard), (0, roles_decorator_1.Roles)(db_1.UserRole.ADMIN), (0, common_1.Put)('admin/articles/translations/:id')];
        __esDecorate(_classThis, null, _findPublished_decorators, { kind: "method", name: "findPublished", static: false, private: false, access: { has: function (obj) { return "findPublished" in obj; }, get: function (obj) { return obj.findPublished; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _findBySlug_decorators, { kind: "method", name: "findBySlug", static: false, private: false, access: { has: function (obj) { return "findBySlug" in obj; }, get: function (obj) { return obj.findBySlug; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _findAllForAdmin_decorators, { kind: "method", name: "findAllForAdmin", static: false, private: false, access: { has: function (obj) { return "findAllForAdmin" in obj; }, get: function (obj) { return obj.findAllForAdmin; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _updateArticle_decorators, { kind: "method", name: "updateArticle", static: false, private: false, access: { has: function (obj) { return "updateArticle" in obj; }, get: function (obj) { return obj.updateArticle; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _updateTranslation_decorators, { kind: "method", name: "updateTranslation", static: false, private: false, access: { has: function (obj) { return "updateTranslation" in obj; }, get: function (obj) { return obj.updateTranslation; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        ArticlesController = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return ArticlesController = _classThis;
}();
exports.ArticlesController = ArticlesController;
