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
exports.CronService = exports.JOB_REGISTRY = void 0;
var common_1 = require("@nestjs/common");
// Реестр джобов — статический список в коде (ТЗ п.27.1), расписание живёт
// в конфигурации Supabase pg_cron снаружи, не редактируется через UI.
// business_plan_batch_processor — расписание "раз в несколько минут", НЕ
// суточное (ТЗ п.31.11.0) — единственный джоб с отличной от суточной
// частотой в этом реестре, отмечено в description.
exports.JOB_REGISTRY = [
    { jobKey: 'product_parser', description: 'Обход адаптеров всех Vendor, upsert SourceListing, matching engine' },
    { jobKey: 'article_parser', description: 'Парсинг+рерайт+перевод статей через Grok' },
    { jobKey: 'nova_poshta_directory_sync', description: 'Обновление справочника городов/отделений НП' },
    { jobKey: 'nbu_rate_sync', description: 'Получение курса НБУ, запись в ExchangeRate' },
    { jobKey: 'promo_recalc', description: 'Пересчёт isPromo/discountPercent по каталогу' },
    { jobKey: 'rate_limit_cleanup', description: 'Очистка устаревших RateLimitEntry' },
    { jobKey: 'financing_program_parser', description: 'ИИ-поиск программ кредитования (суточный)' },
    {
        jobKey: 'business_plan_batch_processor',
        description: 'Batch-генерация бизнес-планов для QUEUED-проектов — расписание раз в несколько минут, НЕ суточное',
    },
];
var CronService = function () {
    var _classDecorators = [(0, common_1.Injectable)()];
    var _classDescriptor;
    var _classExtraInitializers = [];
    var _classThis;
    var CronService = _classThis = /** @class */ (function () {
        function CronService_1(prisma, parser, articles, currency, novaPoshta, promo, rateLimit, notify, financing, businessPlan) {
            this.prisma = prisma;
            this.parser = parser;
            this.articles = articles;
            this.currency = currency;
            this.novaPoshta = novaPoshta;
            this.promo = promo;
            this.rateLimit = rateLimit;
            this.notify = notify;
            this.financing = financing;
            this.businessPlan = businessPlan;
        }
        CronService_1.prototype.getRegistry = function () {
            return exports.JOB_REGISTRY;
        };
        CronService_1.prototype.getHistory = function (jobKey_1) {
            return __awaiter(this, arguments, void 0, function (jobKey, limit) {
                if (limit === void 0) { limit = 50; }
                return __generator(this, function (_a) {
                    return [2 /*return*/, this.prisma.client.cronJobRun.findMany({
                            where: jobKey ? { jobKey: jobKey } : undefined,
                            orderBy: { startedAt: 'desc' },
                            take: limit,
                        })];
                });
            });
        };
        // ТЗ п.27.3 — единая точка запуска (от pg_cron ИЛИ вручную из админки),
        // triggeredBy различает источник, debugMode переключает расширенный ответ.
        CronService_1.prototype.run = function (jobKey, triggeredBy, debugMode) {
            return __awaiter(this, void 0, void 0, function () {
                var run, startedAt, _a, summary, debugLog, itemsProcessed, itemsFailed, status_1, err_1, errorMessage;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0: return [4 /*yield*/, this.prisma.client.cronJobRun.create({
                                data: { jobKey: jobKey, triggeredBy: triggeredBy, debugMode: debugMode, status: 'RUNNING' },
                            })];
                        case 1:
                            run = _b.sent();
                            startedAt = Date.now();
                            _b.label = 2;
                        case 2:
                            _b.trys.push([2, 7, , 10]);
                            return [4 /*yield*/, this.execute(jobKey, debugMode)];
                        case 3:
                            _a = _b.sent(), summary = _a.summary, debugLog = _a.debugLog, itemsProcessed = _a.itemsProcessed, itemsFailed = _a.itemsFailed, status_1 = _a.status;
                            return [4 /*yield*/, this.prisma.client.cronJobRun.update({
                                    where: { id: run.id },
                                    data: {
                                        status: status_1,
                                        finishedAt: new Date(),
                                        durationMs: Date.now() - startedAt,
                                        summary: summary,
                                        debugLog: debugMode ? debugLog : undefined,
                                        itemsProcessed: itemsProcessed,
                                        itemsFailed: itemsFailed,
                                    },
                                })];
                        case 4:
                            _b.sent();
                            if (!(status_1 === 'FAILED')) return [3 /*break*/, 6];
                            return [4 /*yield*/, this.notify.notifyCronFailed(jobKey, summary !== null && summary !== void 0 ? summary : 'unknown error')];
                        case 5:
                            _b.sent();
                            _b.label = 6;
                        case 6: return [2 /*return*/, this.prisma.client.cronJobRun.findUnique({ where: { id: run.id } })];
                        case 7:
                            err_1 = _b.sent();
                            errorMessage = err_1 instanceof Error ? err_1.message : String(err_1);
                            return [4 /*yield*/, this.prisma.client.cronJobRun.update({
                                    where: { id: run.id },
                                    data: { status: 'FAILED', finishedAt: new Date(), durationMs: Date.now() - startedAt, errorMessage: errorMessage },
                                })];
                        case 8:
                            _b.sent();
                            return [4 /*yield*/, this.notify.notifyCronFailed(jobKey, errorMessage)];
                        case 9:
                            _b.sent();
                            throw err_1;
                        case 10: return [2 /*return*/];
                    }
                });
            });
        };
        CronService_1.prototype.execute = function (jobKey, debugMode) {
            return __awaiter(this, void 0, void 0, function () {
                var _a, results, totalCreated, totalUpdated, failedVendors, result, result, rate, result, deleted, result, result;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            _a = jobKey;
                            switch (_a) {
                                case 'product_parser': return [3 /*break*/, 1];
                                case 'article_parser': return [3 /*break*/, 3];
                                case 'nova_poshta_directory_sync': return [3 /*break*/, 5];
                                case 'nbu_rate_sync': return [3 /*break*/, 7];
                                case 'promo_recalc': return [3 /*break*/, 9];
                                case 'rate_limit_cleanup': return [3 /*break*/, 11];
                                case 'financing_program_parser': return [3 /*break*/, 13];
                                case 'business_plan_batch_processor': return [3 /*break*/, 15];
                            }
                            return [3 /*break*/, 17];
                        case 1: return [4 /*yield*/, this.parser.runAll()];
                        case 2:
                            results = _b.sent();
                            totalCreated = results.reduce(function (s, r) { return s + r.created; }, 0);
                            totalUpdated = results.reduce(function (s, r) { return s + r.updated; }, 0);
                            failedVendors = results.filter(function (r) { return r.error; });
                            return [2 /*return*/, {
                                    summary: "".concat(results.length, " vendors: +").concat(totalCreated, " new, ").concat(totalUpdated, " updated, ").concat(failedVendors.length, " failed"),
                                    debugLog: debugMode ? results : undefined,
                                    itemsProcessed: totalCreated + totalUpdated,
                                    itemsFailed: failedVendors.length,
                                    status: failedVendors.length === 0 ? 'SUCCESS' : failedVendors.length === results.length ? 'FAILED' : 'PARTIAL',
                                }];
                        case 3: return [4 /*yield*/, this.articles.runParser()];
                        case 4:
                            result = _b.sent();
                            return [2 /*return*/, {
                                    summary: "Found ".concat(result.found, ", created ").concat(result.created, ", translated ").concat(result.translated, ", failed ").concat(result.failed),
                                    debugLog: debugMode ? result : undefined,
                                    itemsProcessed: result.created,
                                    itemsFailed: result.failed,
                                    status: result.failed === 0 ? 'SUCCESS' : 'PARTIAL',
                                }];
                        case 5: return [4 /*yield*/, this.novaPoshta.syncDirectory()];
                        case 6:
                            result = _b.sent();
                            return [2 /*return*/, {
                                    summary: "".concat(result.cities, " cities, ").concat(result.warehouses, " warehouses updated"),
                                    debugLog: debugMode ? result : undefined,
                                    itemsProcessed: result.cities + result.warehouses,
                                    status: 'SUCCESS',
                                }];
                        case 7: return [4 /*yield*/, this.currency.syncFromNbu()];
                        case 8:
                            rate = _b.sent();
                            return [2 /*return*/, {
                                    summary: "USD rate: ".concat(rate.rateUah, " UAH (").concat(rate.rateDate.toISOString().slice(0, 10), ")"),
                                    debugLog: debugMode ? rate : undefined,
                                    itemsProcessed: 1,
                                    status: 'SUCCESS',
                                }];
                        case 9: return [4 /*yield*/, this.promo.recalculateAll()];
                        case 10:
                            result = _b.sent();
                            return [2 /*return*/, {
                                    summary: "Recalculated pricing/promo for ".concat(result.processed, " products"),
                                    debugLog: debugMode ? result : undefined,
                                    itemsProcessed: result.processed,
                                    status: 'SUCCESS',
                                }];
                        case 11: return [4 /*yield*/, this.rateLimit.cleanupOlderThan(24)];
                        case 12:
                            deleted = _b.sent();
                            return [2 /*return*/, { summary: "Deleted ".concat(deleted, " stale rate-limit entries"), itemsProcessed: deleted, status: 'SUCCESS' }];
                        case 13: return [4 /*yield*/, this.financing.runParser()];
                        case 14:
                            result = _b.sent();
                            return [2 /*return*/, {
                                    summary: "Found ".concat(result.found, ", created ").concat(result.created, ", updated ").concat(result.updated, ", flagged for recheck ").concat(result.flaggedForRecheck),
                                    debugLog: debugMode ? result : undefined,
                                    itemsProcessed: result.created + result.updated,
                                    itemsFailed: result.errors.length,
                                    status: result.errors.length === 0 ? 'SUCCESS' : 'PARTIAL',
                                }];
                        case 15: return [4 /*yield*/, this.businessPlan.processQueue()];
                        case 16:
                            result = _b.sent();
                            return [2 /*return*/, {
                                    summary: "Processed ".concat(result.processed, ", completed ").concat(result.completed, ", failed ").concat(result.failed),
                                    debugLog: debugMode ? result : undefined,
                                    itemsProcessed: result.completed,
                                    itemsFailed: result.failed,
                                    status: result.failed === 0 ? 'SUCCESS' : result.completed === 0 && result.processed > 0 ? 'FAILED' : 'PARTIAL',
                                }];
                        case 17: return [2 /*return*/, { summary: "Unknown jobKey: ".concat(jobKey), status: 'FAILED' }];
                    }
                });
            });
        };
        return CronService_1;
    }());
    __setFunctionName(_classThis, "CronService");
    (function () {
        var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        CronService = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return CronService = _classThis;
}();
exports.CronService = CronService;
