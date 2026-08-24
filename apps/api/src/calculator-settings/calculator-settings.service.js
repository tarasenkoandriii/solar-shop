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
exports.CalculatorSettingsService = void 0;
var common_1 = require("@nestjs/common");
var db_1 = require("@solar-shop/db");
// ТЗ п.31.11.6/31.12.6 — вкладка "Настройки калькулятора": тарифы для
// расчёта окупаемости + пороги диапазонов мощности/HEADROOM, оба с кнопкой
// "Оценить через ИИ" (предложение-черновик, применяется вручную).
var CalculatorSettingsService = function () {
    var _classDecorators = [(0, common_1.Injectable)()];
    var _classDescriptor;
    var _classExtraInitializers = [];
    var _classThis;
    var CalculatorSettingsService = _classThis = /** @class */ (function () {
        function CalculatorSettingsService_1(prisma, grok) {
            this.prisma = prisma;
            this.grok = grok;
        }
        // ---- Тарифы (ТЗ п.31.11.1a) ----
        CalculatorSettingsService_1.prototype.findAllTariffs = function () {
            return this.prisma.client.tariffRate.findMany({ orderBy: { key: 'asc' } });
        };
        CalculatorSettingsService_1.prototype.upsertTariff = function (key, label, rateUahPerKwh, sourceUrl) {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    return [2 /*return*/, this.prisma.client.tariffRate.upsert({
                            where: { key: key },
                            create: { key: key, label: label, rateUahPerKwh: rateUahPerKwh, sourceUrl: sourceUrl },
                            update: { label: label, rateUahPerKwh: rateUahPerKwh, sourceUrl: sourceUrl },
                        })];
                });
            });
        };
        // ---- Границы диапазонов мощности (ТЗ п.31.11.6) ----
        CalculatorSettingsService_1.prototype.findAllPowerRangeThresholds = function () {
            return this.prisma.client.powerRangeThreshold.findMany();
        };
        // Шаг 1 — детерминированная статистика по каталогу (перцентили мощности
        // панелей), без ИИ. Считаем по одиночной панели specs.powerW — целевая
        // суммарная мощность проекта аппроксимируется через типичное количество
        // панелей в подобранных сметах, поэтому для порогов используем мощность
        // ОДНОЙ панели как прокси-метрику (проще и стабильнее, чем пытаться
        // реконструировать распределение суммарных мощностей задним числом).
        CalculatorSettingsService_1.prototype.computePanelWattStats = function () {
            return __awaiter(this, void 0, void 0, function () {
                var panels, watts, percentile, percentiles, clusters, i;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.prisma.client.product.findMany({
                                where: { category: 'SOLAR_PANEL', status: db_1.ProductStatus.PUBLISHED },
                                select: { specs: true },
                            })];
                        case 1:
                            panels = _a.sent();
                            watts = panels
                                .map(function (p) { var _a; return Number((_a = p.specs.powerW) !== null && _a !== void 0 ? _a : 0); })
                                .filter(function (w) { return w > 0; })
                                .sort(function (a, b) { return a - b; });
                            if (watts.length === 0)
                                return [2 /*return*/, { percentiles: {}, clusters: [] }];
                            percentile = function (p) { return watts[Math.min(watts.length - 1, Math.floor((p / 100) * watts.length))]; };
                            percentiles = { p25: percentile(25), p50: percentile(50), p75: percentile(75), p90: percentile(90) };
                            clusters = [];
                            for (i = 1; i < watts.length; i++) {
                                if (watts[i] > watts[i - 1] * 1.2)
                                    clusters.push(watts[i]);
                            }
                            return [2 /*return*/, { percentiles: percentiles, clusters: clusters }];
                    }
                });
            });
        };
        CalculatorSettingsService_1.prototype.suggestPowerRangeThresholds = function () {
            return __awaiter(this, void 0, void 0, function () {
                var stats, suggestion, tags, _i, tags_1, _a, tag, max;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0: return [4 /*yield*/, this.computePanelWattStats()];
                        case 1:
                            stats = _b.sent();
                            return [4 /*yield*/, this.grok.suggestPowerRangeThresholds(stats)];
                        case 2:
                            suggestion = _b.sent();
                            if (!suggestion)
                                return [2 /*return*/, null];
                            tags = [
                                { tag: 'SMALL', max: suggestion.small },
                                { tag: 'MEDIUM', max: suggestion.medium },
                                { tag: 'LARGE', max: suggestion.large },
                            ];
                            _i = 0, tags_1 = tags;
                            _b.label = 3;
                        case 3:
                            if (!(_i < tags_1.length)) return [3 /*break*/, 6];
                            _a = tags_1[_i], tag = _a.tag, max = _a.max;
                            return [4 /*yield*/, this.prisma.client.powerRangeThreshold.upsert({
                                    where: { tag: tag },
                                    create: { tag: tag, minPanelsWattW: 0, maxPanelsWattW: max, aiSuggestion: suggestion.reasoning },
                                    update: { aiSuggestion: suggestion.reasoning },
                                })];
                        case 4:
                            _b.sent();
                            _b.label = 5;
                        case 5:
                            _i++;
                            return [3 /*break*/, 3];
                        case 6: return [4 /*yield*/, this.prisma.client.powerRangeThreshold.upsert({
                                where: { tag: 'COMMERCIAL' },
                                create: { tag: 'COMMERCIAL', minPanelsWattW: suggestion.large, maxPanelsWattW: null, aiSuggestion: suggestion.reasoning },
                                update: { aiSuggestion: suggestion.reasoning },
                            })];
                        case 7:
                            _b.sent();
                            return [2 /*return*/, { suggestion: suggestion, stats: stats }];
                    }
                });
            });
        };
        CalculatorSettingsService_1.prototype.applyPowerRangeThreshold = function (tag, minPanelsWattW, maxPanelsWattW) {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    return [2 /*return*/, this.prisma.client.powerRangeThreshold.upsert({
                            where: { tag: tag },
                            create: { tag: tag, minPanelsWattW: minPanelsWattW, maxPanelsWattW: maxPanelsWattW, aiSuggestion: null },
                            update: { minPanelsWattW: minPanelsWattW, maxPanelsWattW: maxPanelsWattW, aiSuggestion: null },
                        })];
                });
            });
        };
        // Определяет PowerRangeTag проекта по суммарной мощности панелей —
        // используется при подборе манифеста бизнес-плана (ТЗ п.31.11.5 шаг 1).
        CalculatorSettingsService_1.prototype.resolvePowerRangeTag = function (totalPanelsWattW) {
            return __awaiter(this, void 0, void 0, function () {
                var thresholds, match;
                var _a;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0: return [4 /*yield*/, this.findAllPowerRangeThresholds()];
                        case 1:
                            thresholds = _b.sent();
                            if (thresholds.length === 0)
                                return [2 /*return*/, null];
                            match = thresholds.find(function (t) { return totalPanelsWattW >= t.minPanelsWattW && (t.maxPanelsWattW === null || totalPanelsWattW < t.maxPanelsWattW); });
                            return [2 /*return*/, (_a = match === null || match === void 0 ? void 0 : match.tag) !== null && _a !== void 0 ? _a : null];
                    }
                });
            });
        };
        // ---- Порог HEADROOM (ТЗ п.31.12.6) ----
        CalculatorSettingsService_1.prototype.findAllScalingThresholds = function () {
            return this.prisma.client.scalingThreshold.findMany();
        };
        CalculatorSettingsService_1.prototype.computePriceSteps = function (category) {
            return __awaiter(this, void 0, void 0, function () {
                var items, sorted, steps, i, pct;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.prisma.client.product.findMany({
                                where: { category: category, status: db_1.ProductStatus.PUBLISHED, cachedInStock: true },
                                select: { specs: true, cachedPriceUsd: true },
                            })];
                        case 1:
                            items = _a.sent();
                            sorted = items
                                .map(function (i) {
                                var _a, _b;
                                return ({
                                    amps: Number((_a = i.specs.maxCurrentA) !== null && _a !== void 0 ? _a : 0),
                                    price: Number((_b = i.cachedPriceUsd) !== null && _b !== void 0 ? _b : 0),
                                });
                            })
                                .filter(function (i) { return i.amps > 0 && i.price > 0; })
                                .sort(function (a, b) { return a.amps - b.amps; });
                            steps = [];
                            for (i = 1; i < sorted.length; i++) {
                                pct = ((sorted[i].price - sorted[i - 1].price) / sorted[i - 1].price) * 100;
                                if (pct > 0)
                                    steps.push(Math.round(pct * 10) / 10);
                            }
                            return [2 /*return*/, steps];
                    }
                });
            });
        };
        CalculatorSettingsService_1.prototype.suggestScalingThreshold = function (category) {
            return __awaiter(this, void 0, void 0, function () {
                var steps, suggestion;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.computePriceSteps(category)];
                        case 1:
                            steps = _a.sent();
                            return [4 /*yield*/, this.grok.suggestScalingThreshold(category, steps)];
                        case 2:
                            suggestion = _a.sent();
                            if (!suggestion)
                                return [2 /*return*/, null];
                            return [4 /*yield*/, this.prisma.client.scalingThreshold.upsert({
                                    where: { category: category },
                                    create: { category: category, headroomMaxPricePercent: suggestion.thresholdPercent, aiSuggestion: suggestion.reasoning },
                                    update: { aiSuggestion: suggestion.reasoning },
                                })];
                        case 3:
                            _a.sent();
                            return [2 /*return*/, { suggestion: suggestion, steps: steps }];
                    }
                });
            });
        };
        CalculatorSettingsService_1.prototype.applyScalingThreshold = function (category, headroomMaxPricePercent) {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    return [2 /*return*/, this.prisma.client.scalingThreshold.upsert({
                            where: { category: category },
                            create: { category: category, headroomMaxPricePercent: headroomMaxPricePercent, aiSuggestion: null },
                            update: { headroomMaxPricePercent: headroomMaxPricePercent, aiSuggestion: null },
                        })];
                });
            });
        };
        return CalculatorSettingsService_1;
    }());
    __setFunctionName(_classThis, "CalculatorSettingsService");
    (function () {
        var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        CalculatorSettingsService = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return CalculatorSettingsService = _classThis;
}();
exports.CalculatorSettingsService = CalculatorSettingsService;
