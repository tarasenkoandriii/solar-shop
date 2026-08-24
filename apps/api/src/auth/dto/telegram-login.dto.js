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
exports.TelegramLoginDto = void 0;
var class_validator_1 = require("class-validator");
var TelegramLoginDto = function () {
    var _a;
    var _id_decorators;
    var _id_initializers = [];
    var _id_extraInitializers = [];
    var _first_name_decorators;
    var _first_name_initializers = [];
    var _first_name_extraInitializers = [];
    var _last_name_decorators;
    var _last_name_initializers = [];
    var _last_name_extraInitializers = [];
    var _username_decorators;
    var _username_initializers = [];
    var _username_extraInitializers = [];
    var _photo_url_decorators;
    var _photo_url_initializers = [];
    var _photo_url_extraInitializers = [];
    var _auth_date_decorators;
    var _auth_date_initializers = [];
    var _auth_date_extraInitializers = [];
    var _hash_decorators;
    var _hash_initializers = [];
    var _hash_extraInitializers = [];
    return _a = /** @class */ (function () {
            function TelegramLoginDto() {
                this.id = __runInitializers(this, _id_initializers, void 0);
                this.first_name = (__runInitializers(this, _id_extraInitializers), __runInitializers(this, _first_name_initializers, void 0));
                this.last_name = (__runInitializers(this, _first_name_extraInitializers), __runInitializers(this, _last_name_initializers, void 0));
                this.username = (__runInitializers(this, _last_name_extraInitializers), __runInitializers(this, _username_initializers, void 0));
                this.photo_url = (__runInitializers(this, _username_extraInitializers), __runInitializers(this, _photo_url_initializers, void 0));
                this.auth_date = (__runInitializers(this, _photo_url_extraInitializers), __runInitializers(this, _auth_date_initializers, void 0));
                this.hash = (__runInitializers(this, _auth_date_extraInitializers), __runInitializers(this, _hash_initializers, void 0));
                __runInitializers(this, _hash_extraInitializers);
            }
            return TelegramLoginDto;
        }()),
        (function () {
            var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            _id_decorators = [(0, class_validator_1.IsInt)()];
            _first_name_decorators = [(0, class_validator_1.IsOptional)(), (0, class_validator_1.IsString)()];
            _last_name_decorators = [(0, class_validator_1.IsOptional)(), (0, class_validator_1.IsString)()];
            _username_decorators = [(0, class_validator_1.IsOptional)(), (0, class_validator_1.IsString)()];
            _photo_url_decorators = [(0, class_validator_1.IsOptional)(), (0, class_validator_1.IsString)()];
            _auth_date_decorators = [(0, class_validator_1.IsNumber)()];
            _hash_decorators = [(0, class_validator_1.IsString)()];
            __esDecorate(null, null, _id_decorators, { kind: "field", name: "id", static: false, private: false, access: { has: function (obj) { return "id" in obj; }, get: function (obj) { return obj.id; }, set: function (obj, value) { obj.id = value; } }, metadata: _metadata }, _id_initializers, _id_extraInitializers);
            __esDecorate(null, null, _first_name_decorators, { kind: "field", name: "first_name", static: false, private: false, access: { has: function (obj) { return "first_name" in obj; }, get: function (obj) { return obj.first_name; }, set: function (obj, value) { obj.first_name = value; } }, metadata: _metadata }, _first_name_initializers, _first_name_extraInitializers);
            __esDecorate(null, null, _last_name_decorators, { kind: "field", name: "last_name", static: false, private: false, access: { has: function (obj) { return "last_name" in obj; }, get: function (obj) { return obj.last_name; }, set: function (obj, value) { obj.last_name = value; } }, metadata: _metadata }, _last_name_initializers, _last_name_extraInitializers);
            __esDecorate(null, null, _username_decorators, { kind: "field", name: "username", static: false, private: false, access: { has: function (obj) { return "username" in obj; }, get: function (obj) { return obj.username; }, set: function (obj, value) { obj.username = value; } }, metadata: _metadata }, _username_initializers, _username_extraInitializers);
            __esDecorate(null, null, _photo_url_decorators, { kind: "field", name: "photo_url", static: false, private: false, access: { has: function (obj) { return "photo_url" in obj; }, get: function (obj) { return obj.photo_url; }, set: function (obj, value) { obj.photo_url = value; } }, metadata: _metadata }, _photo_url_initializers, _photo_url_extraInitializers);
            __esDecorate(null, null, _auth_date_decorators, { kind: "field", name: "auth_date", static: false, private: false, access: { has: function (obj) { return "auth_date" in obj; }, get: function (obj) { return obj.auth_date; }, set: function (obj, value) { obj.auth_date = value; } }, metadata: _metadata }, _auth_date_initializers, _auth_date_extraInitializers);
            __esDecorate(null, null, _hash_decorators, { kind: "field", name: "hash", static: false, private: false, access: { has: function (obj) { return "hash" in obj; }, get: function (obj) { return obj.hash; }, set: function (obj, value) { obj.hash = value; } }, metadata: _metadata }, _hash_initializers, _hash_extraInitializers);
            if (_metadata) Object.defineProperty(_a, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        })(),
        _a;
}();
exports.TelegramLoginDto = TelegramLoginDto;
