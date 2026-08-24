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
exports.FinancingController = void 0;
var common_1 = require("@nestjs/common");
var db_1 = require("@solar-shop/db");
var jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
var roles_guard_1 = require("../auth/guards/roles.guard");
var roles_decorator_1 = require("../auth/decorators/roles.decorator");
var FinancingController = function () {
    var _classDecorators = [(0, common_1.Controller)()];
    var _classDescriptor;
    var _classExtraInitializers = [];
    var _classThis;
    var _instanceExtraInitializers = [];
    var _findPublished_decorators;
    var _findAllForAdmin_decorators;
    var _update_decorators;
    var _publish_decorators;
    var _archive_decorators;
    var FinancingController = _classThis = /** @class */ (function () {
        function FinancingController_1(service) {
            this.service = (__runInitializers(this, _instanceExtraInitializers), service);
        }
        // ТЗ п.32.3 — публичная страница /financing
        FinancingController_1.prototype.findPublished = function (eligibility, minAmountUsd, maxAmountUsd, sort) {
            return this.service.findPublished({
                eligibility: eligibility,
                minAmountUsd: minAmountUsd ? Number(minAmountUsd) : undefined,
                maxAmountUsd: maxAmountUsd ? Number(maxAmountUsd) : undefined,
                sort: sort,
            });
        };
        FinancingController_1.prototype.findAllForAdmin = function (status) {
            return this.service.findAllForAdmin(status);
        };
        FinancingController_1.prototype.update = function (id, dto) {
            return this.service.update(id, dto);
        };
        FinancingController_1.prototype.publish = function (id) {
            return this.service.publish(id);
        };
        FinancingController_1.prototype.archive = function (id) {
            return this.service.archive(id);
        };
        return FinancingController_1;
    }());
    __setFunctionName(_classThis, "FinancingController");
    (function () {
        var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        _findPublished_decorators = [(0, common_1.Get)('financing-programs')];
        _findAllForAdmin_decorators = [(0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard), (0, roles_decorator_1.Roles)(db_1.UserRole.ADMIN), (0, common_1.Get)('admin/financing-programs')];
        _update_decorators = [(0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard), (0, roles_decorator_1.Roles)(db_1.UserRole.ADMIN), (0, common_1.Put)('admin/financing-programs/:id')];
        _publish_decorators = [(0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard), (0, roles_decorator_1.Roles)(db_1.UserRole.ADMIN), (0, common_1.Post)('admin/financing-programs/:id/publish')];
        _archive_decorators = [(0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard), (0, roles_decorator_1.Roles)(db_1.UserRole.ADMIN), (0, common_1.Post)('admin/financing-programs/:id/archive')];
        __esDecorate(_classThis, null, _findPublished_decorators, { kind: "method", name: "findPublished", static: false, private: false, access: { has: function (obj) { return "findPublished" in obj; }, get: function (obj) { return obj.findPublished; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _findAllForAdmin_decorators, { kind: "method", name: "findAllForAdmin", static: false, private: false, access: { has: function (obj) { return "findAllForAdmin" in obj; }, get: function (obj) { return obj.findAllForAdmin; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _update_decorators, { kind: "method", name: "update", static: false, private: false, access: { has: function (obj) { return "update" in obj; }, get: function (obj) { return obj.update; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _publish_decorators, { kind: "method", name: "publish", static: false, private: false, access: { has: function (obj) { return "publish" in obj; }, get: function (obj) { return obj.publish; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _archive_decorators, { kind: "method", name: "archive", static: false, private: false, access: { has: function (obj) { return "archive" in obj; }, get: function (obj) { return obj.archive; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        FinancingController = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return FinancingController = _classThis;
}();
exports.FinancingController = FinancingController;
