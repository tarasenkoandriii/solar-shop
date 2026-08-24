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
exports.SuggestProjectGoalsDto = exports.UpdateProjectGoalDto = exports.CreateProjectGoalDto = void 0;
var class_validator_1 = require("class-validator");
var TOPOLOGIES = ['OFF_GRID', 'BACKUP_UPS', 'GRID_TIE', 'COMMERCIAL'];
var CreateProjectGoalDto = function () {
    var _a;
    var _key_decorators;
    var _key_initializers = [];
    var _key_extraInitializers = [];
    var _label_decorators;
    var _label_initializers = [];
    var _label_extraInitializers = [];
    var _description_decorators;
    var _description_initializers = [];
    var _description_extraInitializers = [];
    var _defaultTopology_decorators;
    var _defaultTopology_initializers = [];
    var _defaultTopology_extraInitializers = [];
    return _a = /** @class */ (function () {
            function CreateProjectGoalDto() {
                this.key = __runInitializers(this, _key_initializers, void 0);
                this.label = (__runInitializers(this, _key_extraInitializers), __runInitializers(this, _label_initializers, void 0));
                this.description = (__runInitializers(this, _label_extraInitializers), __runInitializers(this, _description_initializers, void 0));
                this.defaultTopology = (__runInitializers(this, _description_extraInitializers), __runInitializers(this, _defaultTopology_initializers, void 0));
                __runInitializers(this, _defaultTopology_extraInitializers);
            }
            return CreateProjectGoalDto;
        }()),
        (function () {
            var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            _key_decorators = [(0, class_validator_1.IsString)(), (0, class_validator_1.Matches)(/^[A-Z][A-Z0-9_]*$/, { message: 'key має бути LATIN_SNAKE_CASE' })];
            _label_decorators = [(0, class_validator_1.IsString)(), (0, class_validator_1.MinLength)(2)];
            _description_decorators = [(0, class_validator_1.IsOptional)(), (0, class_validator_1.IsString)()];
            _defaultTopology_decorators = [(0, class_validator_1.IsOptional)(), (0, class_validator_1.IsIn)(TOPOLOGIES)];
            __esDecorate(null, null, _key_decorators, { kind: "field", name: "key", static: false, private: false, access: { has: function (obj) { return "key" in obj; }, get: function (obj) { return obj.key; }, set: function (obj, value) { obj.key = value; } }, metadata: _metadata }, _key_initializers, _key_extraInitializers);
            __esDecorate(null, null, _label_decorators, { kind: "field", name: "label", static: false, private: false, access: { has: function (obj) { return "label" in obj; }, get: function (obj) { return obj.label; }, set: function (obj, value) { obj.label = value; } }, metadata: _metadata }, _label_initializers, _label_extraInitializers);
            __esDecorate(null, null, _description_decorators, { kind: "field", name: "description", static: false, private: false, access: { has: function (obj) { return "description" in obj; }, get: function (obj) { return obj.description; }, set: function (obj, value) { obj.description = value; } }, metadata: _metadata }, _description_initializers, _description_extraInitializers);
            __esDecorate(null, null, _defaultTopology_decorators, { kind: "field", name: "defaultTopology", static: false, private: false, access: { has: function (obj) { return "defaultTopology" in obj; }, get: function (obj) { return obj.defaultTopology; }, set: function (obj, value) { obj.defaultTopology = value; } }, metadata: _metadata }, _defaultTopology_initializers, _defaultTopology_extraInitializers);
            if (_metadata) Object.defineProperty(_a, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        })(),
        _a;
}();
exports.CreateProjectGoalDto = CreateProjectGoalDto;
var UpdateProjectGoalDto = function () {
    var _a;
    var _label_decorators;
    var _label_initializers = [];
    var _label_extraInitializers = [];
    var _description_decorators;
    var _description_initializers = [];
    var _description_extraInitializers = [];
    var _defaultTopology_decorators;
    var _defaultTopology_initializers = [];
    var _defaultTopology_extraInitializers = [];
    var _isActive_decorators;
    var _isActive_initializers = [];
    var _isActive_extraInitializers = [];
    return _a = /** @class */ (function () {
            function UpdateProjectGoalDto() {
                this.label = __runInitializers(this, _label_initializers, void 0);
                this.description = (__runInitializers(this, _label_extraInitializers), __runInitializers(this, _description_initializers, void 0));
                this.defaultTopology = (__runInitializers(this, _description_extraInitializers), __runInitializers(this, _defaultTopology_initializers, void 0));
                this.isActive = (__runInitializers(this, _defaultTopology_extraInitializers), __runInitializers(this, _isActive_initializers, void 0));
                __runInitializers(this, _isActive_extraInitializers);
            }
            return UpdateProjectGoalDto;
        }()),
        (function () {
            var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            _label_decorators = [(0, class_validator_1.IsOptional)(), (0, class_validator_1.IsString)(), (0, class_validator_1.MinLength)(2)];
            _description_decorators = [(0, class_validator_1.IsOptional)(), (0, class_validator_1.IsString)()];
            _defaultTopology_decorators = [(0, class_validator_1.IsOptional)(), (0, class_validator_1.IsIn)(TOPOLOGIES)];
            _isActive_decorators = [(0, class_validator_1.IsOptional)(), (0, class_validator_1.IsBoolean)()];
            __esDecorate(null, null, _label_decorators, { kind: "field", name: "label", static: false, private: false, access: { has: function (obj) { return "label" in obj; }, get: function (obj) { return obj.label; }, set: function (obj, value) { obj.label = value; } }, metadata: _metadata }, _label_initializers, _label_extraInitializers);
            __esDecorate(null, null, _description_decorators, { kind: "field", name: "description", static: false, private: false, access: { has: function (obj) { return "description" in obj; }, get: function (obj) { return obj.description; }, set: function (obj, value) { obj.description = value; } }, metadata: _metadata }, _description_initializers, _description_extraInitializers);
            __esDecorate(null, null, _defaultTopology_decorators, { kind: "field", name: "defaultTopology", static: false, private: false, access: { has: function (obj) { return "defaultTopology" in obj; }, get: function (obj) { return obj.defaultTopology; }, set: function (obj, value) { obj.defaultTopology = value; } }, metadata: _metadata }, _defaultTopology_initializers, _defaultTopology_extraInitializers);
            __esDecorate(null, null, _isActive_decorators, { kind: "field", name: "isActive", static: false, private: false, access: { has: function (obj) { return "isActive" in obj; }, get: function (obj) { return obj.isActive; }, set: function (obj, value) { obj.isActive = value; } }, metadata: _metadata }, _isActive_initializers, _isActive_extraInitializers);
            if (_metadata) Object.defineProperty(_a, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        })(),
        _a;
}();
exports.UpdateProjectGoalDto = UpdateProjectGoalDto;
var SuggestProjectGoalsDto = function () {
    var _a;
    var _brief_decorators;
    var _brief_initializers = [];
    var _brief_extraInitializers = [];
    return _a = /** @class */ (function () {
            function SuggestProjectGoalsDto() {
                this.brief = __runInitializers(this, _brief_initializers, void 0);
                __runInitializers(this, _brief_extraInitializers);
            }
            return SuggestProjectGoalsDto;
        }()),
        (function () {
            var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            _brief_decorators = [(0, class_validator_1.IsOptional)(), (0, class_validator_1.IsString)()];
            __esDecorate(null, null, _brief_decorators, { kind: "field", name: "brief", static: false, private: false, access: { has: function (obj) { return "brief" in obj; }, get: function (obj) { return obj.brief; }, set: function (obj, value) { obj.brief = value; } }, metadata: _metadata }, _brief_initializers, _brief_extraInitializers);
            if (_metadata) Object.defineProperty(_a, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        })(),
        _a;
}();
exports.SuggestProjectGoalsDto = SuggestProjectGoalsDto;
