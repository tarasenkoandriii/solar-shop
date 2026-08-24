"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
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
exports.FinancingService = void 0;
var common_1 = require("@nestjs/common");
// ТЗ п.32.1 — список тем-затравок настраивается (не хардкод в коде), но
// отдельная админ-CRUD для списка тем — избыточно ради того, чтобы его
// можно было передать явно при ручном запуске из админки (см. контроллер);
// это значение — только дефолт для суточного крона.
var DEFAULT_SEED_TOPICS = [
    'кредит на сонячні панелі Україна',
    'державна програма енергонезалежність',
    'ГрінДІМ умови',
    'СвітлоDIM програма',
    'Доступні кредити 5-7-9 сонячні панелі',
    'Ощадбанк Енергонезалежність кредит',
];
var RECHECK_THRESHOLD_DAYS = 30;
var FinancingService = function () {
    var _classDecorators = [(0, common_1.Injectable)()];
    var _classDescriptor;
    var _classExtraInitializers = [];
    var _classThis;
    var FinancingService = _classThis = /** @class */ (function () {
        function FinancingService_1(prisma, grok) {
            this.prisma = prisma;
            this.grok = grok;
            this.logger = new common_1.Logger(FinancingService.name);
        }
        // ---- Публичная страница /financing (ТЗ п.32.3) ----
        FinancingService_1.prototype.findPublished = function (filters) {
            return this.prisma.client.financingProgram.findMany({
                where: __assign(__assign(__assign({ status: 'PUBLISHED' }, (filters.eligibility ? { eligibility: { contains: filters.eligibility, mode: 'insensitive' } } : {})), (filters.minAmountUsd !== undefined ? { maxLoanUsd: { gte: filters.minAmountUsd } } : {})), (filters.maxAmountUsd !== undefined ? { minLoanUsd: { lte: filters.maxAmountUsd } } : {})),
                orderBy: filters.sort === 'amount_desc'
                    ? { maxLoanUsd: 'desc' }
                    : filters.sort === 'name'
                        ? { name: 'asc' }
                        : { lastVerifiedAt: 'desc' },
            });
        };
        // ---- Додаток 1 бизнес-плана (ТЗ п.31.11.2) — детерминированный SQL-фильтр ----
        FinancingService_1.prototype.findForBusinessPlan = function (creditAmountUsd, clientType) {
            return __awaiter(this, void 0, void 0, function () {
                var all;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.prisma.client.financingProgram.findMany({ where: { status: 'PUBLISHED' } })];
                        case 1:
                            all = _a.sent();
                            return [2 /*return*/, all.filter(function (p) {
                                    var inRange = (p.minLoanUsd === null || Number(p.minLoanUsd) <= creditAmountUsd) &&
                                        (p.maxLoanUsd === null || Number(p.maxLoanUsd) >= creditAmountUsd);
                                    var eligible = p.eligibility.toLowerCase().includes(clientType.toLowerCase());
                                    return inRange && eligible;
                                })];
                    }
                });
            });
        };
        // ---- Админка ----
        FinancingService_1.prototype.findAllForAdmin = function (status) {
            return this.prisma.client.financingProgram.findMany({
                where: status ? { status: status } : undefined,
                orderBy: { createdAt: 'desc' },
            });
        };
        FinancingService_1.prototype.publish = function (id) {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.getOr404(id)];
                        case 1:
                            _a.sent();
                            return [2 /*return*/, this.prisma.client.financingProgram.update({
                                    where: { id: id },
                                    data: { status: 'PUBLISHED', lastVerifiedAt: new Date(), needsRecheck: false },
                                })];
                    }
                });
            });
        };
        FinancingService_1.prototype.archive = function (id) {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.getOr404(id)];
                        case 1:
                            _a.sent();
                            return [2 /*return*/, this.prisma.client.financingProgram.update({ where: { id: id }, data: { status: 'ARCHIVED' } })];
                    }
                });
            });
        };
        FinancingService_1.prototype.update = function (id, dto) {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.getOr404(id)];
                        case 1:
                            _a.sent();
                            return [2 /*return*/, this.prisma.client.financingProgram.update({ where: { id: id }, data: dto })];
                    }
                });
            });
        };
        // ---- Суточный крон financing_program_parser (ТЗ п.32.1/32.2) ----
        FinancingService_1.prototype.runParser = function (seedTopics) {
            return __awaiter(this, void 0, void 0, function () {
                var topics, result, candidates, _i, candidates_1, c, existing, err_1, message, staleCutoff, flagged;
                var _a, _b, _c;
                return __generator(this, function (_d) {
                    switch (_d.label) {
                        case 0:
                            topics = seedTopics && seedTopics.length > 0 ? seedTopics : DEFAULT_SEED_TOPICS;
                            result = { found: 0, created: 0, updated: 0, flaggedForRecheck: 0, errors: [] };
                            return [4 /*yield*/, this.grok.searchFinancingPrograms(topics)];
                        case 1:
                            candidates = _d.sent();
                            if (!candidates) {
                                result.errors.push('Grok не повернув результатів (можливо, GROK_API_KEY не налаштований)');
                                return [2 /*return*/, result];
                            }
                            result.found = candidates.length;
                            _i = 0, candidates_1 = candidates;
                            _d.label = 2;
                        case 2:
                            if (!(_i < candidates_1.length)) return [3 /*break*/, 11];
                            c = candidates_1[_i];
                            _d.label = 3;
                        case 3:
                            _d.trys.push([3, 9, , 10]);
                            return [4 /*yield*/, this.prisma.client.financingProgram.findUnique({
                                    where: { name_url: { name: c.name, url: c.url } },
                                })];
                        case 4:
                            existing = _d.sent();
                            if (!existing) return [3 /*break*/, 6];
                            return [4 /*yield*/, this.prisma.client.financingProgram.update({
                                    where: { id: existing.id },
                                    data: { lastSeenInParserAt: new Date(), needsRecheck: false },
                                })];
                        case 5:
                            _d.sent();
                            result.updated++;
                            return [3 /*break*/, 8];
                        case 6: return [4 /*yield*/, this.prisma.client.financingProgram.create({
                                data: {
                                    name: c.name,
                                    eligibility: c.eligibility,
                                    description: c.description,
                                    url: c.url,
                                    discoverySourceUrl: (_a = c.discoverySourceUrl) !== null && _a !== void 0 ? _a : undefined,
                                    minLoanUsd: (_b = c.minLoanUsd) !== null && _b !== void 0 ? _b : undefined,
                                    maxLoanUsd: (_c = c.maxLoanUsd) !== null && _c !== void 0 ? _c : undefined,
                                    status: 'DRAFT',
                                    lastSeenInParserAt: new Date(),
                                },
                            })];
                        case 7:
                            _d.sent();
                            result.created++;
                            _d.label = 8;
                        case 8: return [3 /*break*/, 10];
                        case 9:
                            err_1 = _d.sent();
                            message = err_1 instanceof Error ? err_1.message : String(err_1);
                            this.logger.error("Failed to upsert financing program \"".concat(c.name, "\": ").concat(message));
                            result.errors.push("".concat(c.name, ": ").concat(message));
                            return [3 /*break*/, 10];
                        case 10:
                            _i++;
                            return [3 /*break*/, 2];
                        case 11:
                            staleCutoff = new Date(Date.now() - RECHECK_THRESHOLD_DAYS * 24 * 60 * 60 * 1000);
                            return [4 /*yield*/, this.prisma.client.financingProgram.updateMany({
                                    where: {
                                        status: 'PUBLISHED',
                                        needsRecheck: false,
                                        OR: [{ lastSeenInParserAt: null }, { lastSeenInParserAt: { lt: staleCutoff } }],
                                    },
                                    data: { needsRecheck: true },
                                })];
                        case 12:
                            flagged = _d.sent();
                            result.flaggedForRecheck = flagged.count;
                            return [2 /*return*/, result];
                    }
                });
            });
        };
        FinancingService_1.prototype.getOr404 = function (id) {
            return __awaiter(this, void 0, void 0, function () {
                var program;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.prisma.client.financingProgram.findUnique({ where: { id: id } })];
                        case 1:
                            program = _a.sent();
                            if (!program)
                                throw new common_1.NotFoundException('Financing program not found');
                            return [2 /*return*/, program];
                    }
                });
            });
        };
        return FinancingService_1;
    }());
    __setFunctionName(_classThis, "FinancingService");
    (function () {
        var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        FinancingService = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return FinancingService = _classThis;
}();
exports.FinancingService = FinancingService;
