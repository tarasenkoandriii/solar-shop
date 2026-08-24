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
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __setFunctionName = (this && this.__setFunctionName) || function (f, name, prefix) {
    if (typeof name === "symbol") name = name.description ? "[".concat(name.description, "]") : "";
    return Object.defineProperty(f, "name", { configurable: true, value: prefix ? "".concat(prefix, " ", name) : name });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProjectGoalsService = void 0;
var common_1 = require("@nestjs/common");
// ТЗ п.31.1.1/31.1.2 — справочник целей проекта калькулятора, не хардкод.
// AI-кандидаты создаются с isActive: false — не появляются в квизе
// автоматически, ждут ручного review в админке.
var ProjectGoalsService = function () {
    var _classDecorators = [(0, common_1.Injectable)()];
    var _classDescriptor;
    var _classExtraInitializers = [];
    var _classThis;
    var ProjectGoalsService = _classThis = /** @class */ (function () {
        function ProjectGoalsService_1(prisma, grok) {
            this.prisma = prisma;
            this.grok = grok;
        }
        ProjectGoalsService_1.prototype.findAll = function () {
            return this.prisma.client.projectGoal.findMany({ orderBy: { createdAt: 'desc' } });
        };
        // Публичный список для квиза калькулятора — только активные
        ProjectGoalsService_1.prototype.findActive = function () {
            return this.prisma.client.projectGoal.findMany({ where: { isActive: true }, orderBy: { createdAt: 'asc' } });
        };
        ProjectGoalsService_1.prototype.create = function (dto) {
            return __awaiter(this, void 0, void 0, function () {
                var existing;
                var _a;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0: return [4 /*yield*/, this.prisma.client.projectGoal.findUnique({ where: { key: dto.key } })];
                        case 1:
                            existing = _b.sent();
                            if (existing)
                                throw new common_1.BadRequestException("\u0426\u0456\u043B\u044C \u0437 key=\"".concat(dto.key, "\" \u0432\u0436\u0435 \u0456\u0441\u043D\u0443\u0454"));
                            return [2 /*return*/, this.prisma.client.projectGoal.create({
                                    data: {
                                        key: dto.key,
                                        label: dto.label,
                                        description: dto.description,
                                        defaultTopology: (_a = dto.defaultTopology) !== null && _a !== void 0 ? _a : undefined,
                                        generatedBy: 'manual',
                                        isActive: true,
                                    },
                                })];
                    }
                });
            });
        };
        ProjectGoalsService_1.prototype.update = function (id, dto) {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.getOr404(id)];
                        case 1:
                            _a.sent();
                            return [2 /*return*/, this.prisma.client.projectGoal.update({
                                    where: { id: id },
                                    data: dto,
                                })];
                    }
                });
            });
        };
        ProjectGoalsService_1.prototype.remove = function (id) {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.getOr404(id)];
                        case 1:
                            _a.sent();
                            return [4 /*yield*/, this.prisma.client.projectGoal.delete({ where: { id: id } })];
                        case 2:
                            _a.sent();
                            return [2 /*return*/, { ok: true }];
                    }
                });
            });
        };
        // ТЗ п.31.1.2 шаги 1-3 — Grok получает полный текущий список активных
        // целей (обязательно, чтобы не предлагать дубли), возвращает кандидатов
        // с isActive: false.
        ProjectGoalsService_1.prototype.suggestViaAi = function (brief) {
            return __awaiter(this, void 0, void 0, function () {
                var existing, candidates, created, _i, candidates_1, candidate, alreadyExists, _a, _b;
                var _c;
                return __generator(this, function (_d) {
                    switch (_d.label) {
                        case 0: return [4 /*yield*/, this.prisma.client.projectGoal.findMany({
                                select: { key: true, label: true, description: true, defaultTopology: true },
                            })];
                        case 1:
                            existing = _d.sent();
                            return [4 /*yield*/, this.grok.suggestProjectGoals(existing, brief)];
                        case 2:
                            candidates = _d.sent();
                            if (!candidates || candidates.length === 0) {
                                throw new common_1.BadRequestException('Grok не повернув кандидатів (можливо, GROK_API_KEY не налаштований)');
                            }
                            created = [];
                            _i = 0, candidates_1 = candidates;
                            _d.label = 3;
                        case 3:
                            if (!(_i < candidates_1.length)) return [3 /*break*/, 7];
                            candidate = candidates_1[_i];
                            return [4 /*yield*/, this.prisma.client.projectGoal.findUnique({ where: { key: candidate.key } })];
                        case 4:
                            alreadyExists = _d.sent();
                            if (alreadyExists)
                                return [3 /*break*/, 6]; // на всякий випадок, якщо Grok всё же предложил дубль по key
                            _b = (_a = created).push;
                            return [4 /*yield*/, this.prisma.client.projectGoal.create({
                                    data: {
                                        key: candidate.key,
                                        label: candidate.label,
                                        description: "".concat(candidate.description, "\n\n[\u0406\u0406-\u043E\u0431\u0491\u0440\u0443\u043D\u0442\u0443\u0432\u0430\u043D\u043D\u044F \u0443\u043D\u0456\u043A\u0430\u043B\u044C\u043D\u043E\u0441\u0442\u0456]: ").concat(candidate.reasoning),
                                        defaultTopology: (_c = candidate.defaultTopology) !== null && _c !== void 0 ? _c : undefined,
                                        generatedBy: 'ai',
                                        isActive: false,
                                    },
                                })];
                        case 5:
                            _b.apply(_a, [_d.sent()]);
                            _d.label = 6;
                        case 6:
                            _i++;
                            return [3 /*break*/, 3];
                        case 7: return [2 /*return*/, created];
                    }
                });
            });
        };
        // ТЗ п.31.1.2 шаг 4 — «Активировать»
        ProjectGoalsService_1.prototype.activate = function (id) {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.getOr404(id)];
                        case 1:
                            _a.sent();
                            return [2 /*return*/, this.prisma.client.projectGoal.update({ where: { id: id }, data: { isActive: true } })];
                    }
                });
            });
        };
        // «Отклонить» — остаётся isActive: false, не удаляется физически (Grok
        // видит его в след. раз через п.31.1.2 шаг 2, не предложит повторно)
        ProjectGoalsService_1.prototype.reject = function (id) {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.getOr404(id)];
                        case 1:
                            _a.sent();
                            return [2 /*return*/, this.prisma.client.projectGoal.update({ where: { id: id }, data: { isActive: false } })];
                    }
                });
            });
        };
        ProjectGoalsService_1.prototype.getOr404 = function (id) {
            return __awaiter(this, void 0, void 0, function () {
                var goal;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.prisma.client.projectGoal.findUnique({ where: { id: id } })];
                        case 1:
                            goal = _a.sent();
                            if (!goal)
                                throw new common_1.NotFoundException('Project goal not found');
                            return [2 /*return*/, goal];
                    }
                });
            });
        };
        return ProjectGoalsService_1;
    }());
    __setFunctionName(_classThis, "ProjectGoalsService");
    (function () {
        var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        ProjectGoalsService = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return ProjectGoalsService = _classThis;
}();
exports.ProjectGoalsService = ProjectGoalsService;
