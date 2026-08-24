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
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BusinessPlanManifestService = void 0;
var common_1 = require("@nestjs/common");
// ТЗ п.31.11.4/31.11.5 — манифесты бизнес-плана, версионирование по
// комбинации тегов (goalTags+powerRangeTag), подбор по точному совпадению
// или похожести. Ни одна версия не удаляется/перезаписывается.
var BusinessPlanManifestService = function () {
    var _classDecorators = [(0, common_1.Injectable)()];
    var _classDescriptor;
    var _classExtraInitializers = [];
    var _classThis;
    var BusinessPlanManifestService = _classThis = /** @class */ (function () {
        function BusinessPlanManifestService_1(prisma, grok) {
            this.prisma = prisma;
            this.grok = grok;
        }
        BusinessPlanManifestService_1.prototype.findAll = function () {
            // Знайдено при аудиті реальної Docker-збірки: Prisma НЕ підтримує
            // orderBy по scalar list полю (String[]) стандартним клієнтом —
            // `{ goalTags: 'asc' }` тут був невалідним типом
            // (BusinessPlanManifestOrderByWithRelationInput не містить goalTags
            // як сортовний ключ), пісочниця без згенерованого Prisma Client цю
            // помилку не ловила. Групування по тегах все одно робиться на клієнті
            // (адмінка, Map по [...goalTags].sort().join(',')) — сортування тут не
            // впливає на UI, безпечно прибрати.
            return this.prisma.client.businessPlanManifest.findMany({ orderBy: [{ version: 'desc' }] });
        };
        BusinessPlanManifestService_1.prototype.nextVersion = function (goalTags, powerRangeTag) {
            return __awaiter(this, void 0, void 0, function () {
                var existing, matching;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.prisma.client.businessPlanManifest.findMany({
                                where: { powerRangeTag: powerRangeTag },
                            })];
                        case 1:
                            existing = _a.sent();
                            matching = existing.filter(function (m) { return setsEqual(m.goalTags, goalTags); });
                            if (matching.length === 0)
                                return [2 /*return*/, 1];
                            return [2 /*return*/, Math.max.apply(Math, matching.map(function (m) { return m.version; })) + 1];
                    }
                });
            });
        };
        BusinessPlanManifestService_1.prototype.createManual = function (goalTags, powerRangeTag, content, adminUserId, changeNote) {
            return __awaiter(this, void 0, void 0, function () {
                var version;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.nextVersion(goalTags, powerRangeTag)];
                        case 1:
                            version = _a.sent();
                            return [2 /*return*/, this.prisma.client.businessPlanManifest.create({
                                    data: { goalTags: goalTags, powerRangeTag: powerRangeTag, content: content, version: version, generatedBy: 'manual', adminUserId: adminUserId, changeNote: changeNote, isActive: false },
                                })];
                    }
                });
            });
        };
        BusinessPlanManifestService_1.prototype.generateViaAi = function (goalTags, powerRangeTag, brief) {
            return __awaiter(this, void 0, void 0, function () {
                var content, version;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.grok.generateBusinessPlanManifest({ goalTags: goalTags, powerRangeTag: powerRangeTag, brief: brief })];
                        case 1:
                            content = _a.sent();
                            if (!content)
                                throw new common_1.BadRequestException('Grok не повернув чернетку (можливо, GROK_API_KEY не налаштований)');
                            return [4 /*yield*/, this.nextVersion(goalTags, powerRangeTag)];
                        case 2:
                            version = _a.sent();
                            return [2 /*return*/, this.prisma.client.businessPlanManifest.create({
                                    data: { goalTags: goalTags, powerRangeTag: powerRangeTag, content: content, version: version, generatedBy: 'ai', isActive: false },
                                })];
                    }
                });
            });
        };
        // Активация деактивирует предыдущую активную версию С ТОЙ ЖЕ комбинацией
        // тегов (не глобально) — переключение внутри своей группы (ТЗ п.31.11.4).
        BusinessPlanManifestService_1.prototype.activate = function (id) {
            return __awaiter(this, void 0, void 0, function () {
                var manifest, siblings, _i, _a, s;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0: return [4 /*yield*/, this.getOr404(id)];
                        case 1:
                            manifest = _b.sent();
                            return [4 /*yield*/, this.prisma.client.businessPlanManifest.findMany({
                                    where: { powerRangeTag: manifest.powerRangeTag, isActive: true },
                                })];
                        case 2:
                            siblings = _b.sent();
                            _i = 0, _a = siblings.filter(function (s) { return setsEqual(s.goalTags, manifest.goalTags); });
                            _b.label = 3;
                        case 3:
                            if (!(_i < _a.length)) return [3 /*break*/, 6];
                            s = _a[_i];
                            return [4 /*yield*/, this.prisma.client.businessPlanManifest.update({ where: { id: s.id }, data: { isActive: false } })];
                        case 4:
                            _b.sent();
                            _b.label = 5;
                        case 5:
                            _i++;
                            return [3 /*break*/, 3];
                        case 6: return [2 /*return*/, this.prisma.client.businessPlanManifest.update({ where: { id: id }, data: { isActive: true } })];
                    }
                });
            });
        };
        // ТЗ п.31.11.5 — точное совпадение тегов, иначе — похожесть, иначе —
        // универсальный фолбэк (goalTags: [], powerRangeTag: null).
        BusinessPlanManifestService_1.prototype.findBestMatch = function (goalTags, powerRangeTag) {
            return __awaiter(this, void 0, void 0, function () {
                var activeManifests, exact, scored, best, universal;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.prisma.client.businessPlanManifest.findMany({ where: { isActive: true } })];
                        case 1:
                            activeManifests = _a.sent();
                            if (activeManifests.length === 0)
                                return [2 /*return*/, null];
                            exact = activeManifests.find(function (m) { return setsEqual(m.goalTags, goalTags) && m.powerRangeTag === powerRangeTag; });
                            if (exact)
                                return [2 /*return*/, { manifest: exact, exactMatch: true }];
                            scored = activeManifests.map(function (m) {
                                var intersection = m.goalTags.filter(function (t) { return goalTags.includes(t); }).length;
                                var powerScore = 0;
                                if (m.powerRangeTag === powerRangeTag)
                                    powerScore = 1;
                                else if (m.powerRangeTag && powerRangeTag && areNeighborRanges(m.powerRangeTag, powerRangeTag))
                                    powerScore = 0.5;
                                return { manifest: m, score: intersection + powerScore };
                            });
                            scored.sort(function (a, b) { return b.score - a.score; });
                            best = scored[0];
                            // Универсальный фолбэк, если вообще ничего не пересекается
                            if (best.score === 0) {
                                universal = activeManifests.find(function (m) { return m.goalTags.length === 0 && m.powerRangeTag === null; });
                                if (universal)
                                    return [2 /*return*/, { manifest: universal, exactMatch: false }];
                            }
                            return [2 /*return*/, best ? { manifest: best.manifest, exactMatch: false } : null];
                    }
                });
            });
        };
        BusinessPlanManifestService_1.prototype.getOr404 = function (id) {
            return __awaiter(this, void 0, void 0, function () {
                var manifest;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.prisma.client.businessPlanManifest.findUnique({ where: { id: id } })];
                        case 1:
                            manifest = _a.sent();
                            if (!manifest)
                                throw new common_1.NotFoundException('Manifest not found');
                            return [2 /*return*/, manifest];
                    }
                });
            });
        };
        return BusinessPlanManifestService_1;
    }());
    __setFunctionName(_classThis, "BusinessPlanManifestService");
    (function () {
        var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        BusinessPlanManifestService = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return BusinessPlanManifestService = _classThis;
}();
exports.BusinessPlanManifestService = BusinessPlanManifestService;
function setsEqual(a, b) {
    if (a.length !== b.length)
        return false;
    var sa = __spreadArray([], a, true).sort();
    var sb = __spreadArray([], b, true).sort();
    return sa.every(function (v, i) { return v === sb[i]; });
}
var RANGE_ORDER = ['SMALL', 'MEDIUM', 'LARGE', 'COMMERCIAL'];
function areNeighborRanges(a, b) {
    var ia = RANGE_ORDER.indexOf(a);
    var ib = RANGE_ORDER.indexOf(b);
    return ia >= 0 && ib >= 0 && Math.abs(ia - ib) === 1;
}
