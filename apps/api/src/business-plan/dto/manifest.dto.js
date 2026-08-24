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
exports.GenerateManifestDto = exports.CreateManifestDto = void 0;
var class_validator_1 = require("class-validator");
var POWER_TAGS = ['SMALL', 'MEDIUM', 'LARGE', 'COMMERCIAL'];
var CreateManifestDto = function () {
    var _a;
    var _goalTags_decorators;
    var _goalTags_initializers = [];
    var _goalTags_extraInitializers = [];
    var _powerRangeTag_decorators;
    var _powerRangeTag_initializers = [];
    var _powerRangeTag_extraInitializers = [];
    var _content_decorators;
    var _content_initializers = [];
    var _content_extraInitializers = [];
    var _changeNote_decorators;
    var _changeNote_initializers = [];
    var _changeNote_extraInitializers = [];
    return _a = /** @class */ (function () {
            function CreateManifestDto() {
                this.goalTags = __runInitializers(this, _goalTags_initializers, void 0);
                this.powerRangeTag = (__runInitializers(this, _goalTags_extraInitializers), __runInitializers(this, _powerRangeTag_initializers, void 0));
                this.content = (__runInitializers(this, _powerRangeTag_extraInitializers), __runInitializers(this, _content_initializers, void 0));
                this.changeNote = (__runInitializers(this, _content_extraInitializers), __runInitializers(this, _changeNote_initializers, void 0));
                __runInitializers(this, _changeNote_extraInitializers);
            }
            return CreateManifestDto;
        }()),
        (function () {
            var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            _goalTags_decorators = [(0, class_validator_1.IsArray)(), (0, class_validator_1.IsString)({ each: true })];
            _powerRangeTag_decorators = [(0, class_validator_1.IsOptional)(), (0, class_validator_1.IsIn)(POWER_TAGS)];
            _content_decorators = [(0, class_validator_1.IsString)(), (0, class_validator_1.MinLength)(10)];
            _changeNote_decorators = [(0, class_validator_1.IsOptional)(), (0, class_validator_1.IsString)()];
            __esDecorate(null, null, _goalTags_decorators, { kind: "field", name: "goalTags", static: false, private: false, access: { has: function (obj) { return "goalTags" in obj; }, get: function (obj) { return obj.goalTags; }, set: function (obj, value) { obj.goalTags = value; } }, metadata: _metadata }, _goalTags_initializers, _goalTags_extraInitializers);
            __esDecorate(null, null, _powerRangeTag_decorators, { kind: "field", name: "powerRangeTag", static: false, private: false, access: { has: function (obj) { return "powerRangeTag" in obj; }, get: function (obj) { return obj.powerRangeTag; }, set: function (obj, value) { obj.powerRangeTag = value; } }, metadata: _metadata }, _powerRangeTag_initializers, _powerRangeTag_extraInitializers);
            __esDecorate(null, null, _content_decorators, { kind: "field", name: "content", static: false, private: false, access: { has: function (obj) { return "content" in obj; }, get: function (obj) { return obj.content; }, set: function (obj, value) { obj.content = value; } }, metadata: _metadata }, _content_initializers, _content_extraInitializers);
            __esDecorate(null, null, _changeNote_decorators, { kind: "field", name: "changeNote", static: false, private: false, access: { has: function (obj) { return "changeNote" in obj; }, get: function (obj) { return obj.changeNote; }, set: function (obj, value) { obj.changeNote = value; } }, metadata: _metadata }, _changeNote_initializers, _changeNote_extraInitializers);
            if (_metadata) Object.defineProperty(_a, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        })(),
        _a;
}();
exports.CreateManifestDto = CreateManifestDto;
var GenerateManifestDto = function () {
    var _a;
    var _goalTags_decorators;
    var _goalTags_initializers = [];
    var _goalTags_extraInitializers = [];
    var _powerRangeTag_decorators;
    var _powerRangeTag_initializers = [];
    var _powerRangeTag_extraInitializers = [];
    var _brief_decorators;
    var _brief_initializers = [];
    var _brief_extraInitializers = [];
    return _a = /** @class */ (function () {
            function GenerateManifestDto() {
                this.goalTags = __runInitializers(this, _goalTags_initializers, void 0);
                this.powerRangeTag = (__runInitializers(this, _goalTags_extraInitializers), __runInitializers(this, _powerRangeTag_initializers, void 0));
                this.brief = (__runInitializers(this, _powerRangeTag_extraInitializers), __runInitializers(this, _brief_initializers, void 0));
                __runInitializers(this, _brief_extraInitializers);
            }
            return GenerateManifestDto;
        }()),
        (function () {
            var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            _goalTags_decorators = [(0, class_validator_1.IsArray)(), (0, class_validator_1.IsString)({ each: true })];
            _powerRangeTag_decorators = [(0, class_validator_1.IsOptional)(), (0, class_validator_1.IsIn)(POWER_TAGS)];
            _brief_decorators = [(0, class_validator_1.IsOptional)(), (0, class_validator_1.IsString)()];
            __esDecorate(null, null, _goalTags_decorators, { kind: "field", name: "goalTags", static: false, private: false, access: { has: function (obj) { return "goalTags" in obj; }, get: function (obj) { return obj.goalTags; }, set: function (obj, value) { obj.goalTags = value; } }, metadata: _metadata }, _goalTags_initializers, _goalTags_extraInitializers);
            __esDecorate(null, null, _powerRangeTag_decorators, { kind: "field", name: "powerRangeTag", static: false, private: false, access: { has: function (obj) { return "powerRangeTag" in obj; }, get: function (obj) { return obj.powerRangeTag; }, set: function (obj, value) { obj.powerRangeTag = value; } }, metadata: _metadata }, _powerRangeTag_initializers, _powerRangeTag_extraInitializers);
            __esDecorate(null, null, _brief_decorators, { kind: "field", name: "brief", static: false, private: false, access: { has: function (obj) { return "brief" in obj; }, get: function (obj) { return obj.brief; }, set: function (obj, value) { obj.brief = value; } }, metadata: _metadata }, _brief_initializers, _brief_extraInitializers);
            if (_metadata) Object.defineProperty(_a, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        })(),
        _a;
}();
exports.GenerateManifestDto = GenerateManifestDto;
