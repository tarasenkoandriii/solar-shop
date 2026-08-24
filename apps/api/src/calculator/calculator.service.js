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
exports.CalculatorService = void 0;
var common_1 = require("@nestjs/common");
var db_1 = require("@solar-shop/db");
var MAX_DRAFTS_PER_OWNER = 5; // ТЗ п.31.7 — мягкое ограничение, не жёсткий лимит
var CalculatorService = function () {
    var _classDecorators = [(0, common_1.Injectable)()];
    var _classDescriptor;
    var _classExtraInitializers = [];
    var _classThis;
    var CalculatorService = _classThis = /** @class */ (function () {
        function CalculatorService_1(prisma, grok, pvgis, rateLimit, cart, invoice, email, notify) {
            this.prisma = prisma;
            this.grok = grok;
            this.pvgis = pvgis;
            this.rateLimit = rateLimit;
            this.cart = cart;
            this.invoice = invoice;
            this.email = email;
            this.notify = notify;
            this.logger = new common_1.Logger(CalculatorService.name);
        }
        // ---- Шаг 1: старт квиза (ТЗ п.31.1-31.4) ----
        CalculatorService_1.prototype.start = function (userId, dto) {
            return __awaiter(this, void 0, void 0, function () {
                var goalRecords, topology, requirements, resolved, estimate, _a;
                var _b;
                var _c, _d;
                return __generator(this, function (_e) {
                    switch (_e.label) {
                        case 0: return [4 /*yield*/, this.assertDraftLimitNotExceeded(userId, (_c = dto.sessionId) !== null && _c !== void 0 ? _c : null)];
                        case 1:
                            _e.sent();
                            return [4 /*yield*/, this.prisma.client.projectGoal.findMany({ where: { key: { in: dto.goals } } })];
                        case 2:
                            goalRecords = _e.sent();
                            topology = (0, db_1.resolveTopologyFromGoals)(goalRecords.map(function (g) { return g.defaultTopology; }));
                            return [4 /*yield*/, this.grok.extractCalculatorRequirements({
                                    city: dto.city,
                                    budgetUsd: dto.budgetUsd,
                                    goals: goalRecords.map(function (g) { return g.label; }),
                                    dailyConsumptionKwh: dto.dailyConsumptionKwh,
                                })];
                        case 3:
                            requirements = _e.sent();
                            return [4 /*yield*/, this.resolveRequirementsToCatalog(requirements, dto.budgetUsd)];
                        case 4:
                            resolved = _e.sent();
                            return [4 /*yield*/, this.prisma.client.projectEstimate.create({
                                    data: {
                                        userId: userId !== null && userId !== void 0 ? userId : undefined,
                                        sessionId: userId ? undefined : dto.sessionId,
                                        name: "\u041F\u0440\u043E\u0454\u043A\u0442 \u0432\u0456\u0434 ".concat(new Date().toLocaleDateString('uk-UA')).concat(dto.city ? ", ".concat(dto.city) : ''),
                                        city: dto.city,
                                        cityRef: dto.cityRef,
                                        budgetUsd: dto.budgetUsd,
                                        goals: dto.goals,
                                        dailyConsumptionKwh: dto.dailyConsumptionKwh,
                                        financingNeeded: (_d = dto.financingNeeded) !== null && _d !== void 0 ? _d : false,
                                        ownFundsPercent: dto.ownFundsPercent,
                                        recommendedSpec: resolved.spec,
                                        totalUsd: resolved.totalUsd,
                                        conversationLog: [
                                            { role: 'user', type: 'quiz', input: dto, at: new Date().toISOString() },
                                            { role: 'assistant', type: 'requirements', output: requirements, at: new Date().toISOString() },
                                        ],
                                        schemaTopology: topology !== null && topology !== void 0 ? topology : undefined,
                                    },
                                })];
                        case 5:
                            estimate = _e.sent();
                            return [4 /*yield*/, this.notify.notifyCalculatorLead({
                                    id: estimate.id,
                                    city: estimate.city,
                                    totalUsd: resolved.totalUsd,
                                    goals: estimate.goals,
                                })];
                        case 6:
                            _e.sent();
                            _b = {
                                estimate: estimate,
                                requirements: requirements,
                                withinBudget: resolved.withinBudget,
                                budgetGapUsd: resolved.budgetGapUsd
                            };
                            if (!topology) return [3 /*break*/, 8];
                            return [4 /*yield*/, this.renderDiagram(topology, resolved.spec, false)];
                        case 7:
                            _a = _e.sent();
                            return [3 /*break*/, 9];
                        case 8:
                            _a = null;
                            _e.label = 9;
                        case 9: return [2 /*return*/, (_b.blockDiagramSvg = _a,
                                _b)];
                    }
                });
            });
        };
        // ---- Шаг 2: диалоговое уточнение (ТЗ п.31.2) ----
        CalculatorService_1.prototype.refine = function (estimateId, userId, sessionId, dto) {
            return __awaiter(this, void 0, void 0, function () {
                var estimate, goalRecords, conversationLog, lastRequirements, requirements, resolved, updatedLog, updated, _a;
                var _b;
                var _c, _d, _e;
                return __generator(this, function (_f) {
                    switch (_f.label) {
                        case 0: 
                        // ТЗ п.31.9 — rate limit на пересчёты конкретного расчёта
                        return [4 /*yield*/, this.rateLimit.checkAndIncrement("calculator:refine:".concat(estimateId), 10, 600)];
                        case 1:
                            // ТЗ п.31.9 — rate limit на пересчёты конкретного расчёта
                            _f.sent();
                            return [4 /*yield*/, this.getOr404(estimateId)];
                        case 2:
                            estimate = _f.sent();
                            this.assertOwnership(estimate, userId, sessionId);
                            if (estimate.status !== 'DRAFT') {
                                throw new common_1.BadRequestException('Можна уточнювати тільки чернетку (DRAFT), проєкт вже фіналізовано');
                            }
                            return [4 /*yield*/, this.prisma.client.projectGoal.findMany({ where: { key: { in: estimate.goals } } })];
                        case 3:
                            goalRecords = _f.sent();
                            conversationLog = (_c = estimate.conversationLog) !== null && _c !== void 0 ? _c : [];
                            lastRequirements = (_d = __spreadArray([], conversationLog, true).reverse().find(function (e) { return e.type === 'requirements'; })) === null || _d === void 0 ? void 0 : _d.output;
                            return [4 /*yield*/, this.grok.extractCalculatorRequirements({
                                    city: (_e = estimate.city) !== null && _e !== void 0 ? _e : undefined,
                                    budgetUsd: estimate.budgetUsd ? Number(estimate.budgetUsd) : undefined,
                                    goals: goalRecords.map(function (g) { return g.label; }),
                                    dailyConsumptionKwh: estimate.dailyConsumptionKwh ? Number(estimate.dailyConsumptionKwh) : undefined,
                                    refinementText: dto.text,
                                    previousRequirements: lastRequirements,
                                })];
                        case 4:
                            requirements = _f.sent();
                            return [4 /*yield*/, this.resolveRequirementsToCatalog(requirements, estimate.budgetUsd ? Number(estimate.budgetUsd) : undefined)];
                        case 5:
                            resolved = _f.sent();
                            updatedLog = __spreadArray(__spreadArray([], conversationLog, true), [
                                { role: 'user', type: 'refinement', text: dto.text, at: new Date().toISOString() },
                                { role: 'assistant', type: 'requirements', output: requirements, at: new Date().toISOString() },
                            ], false);
                            return [4 /*yield*/, this.prisma.client.projectEstimate.update({
                                    where: { id: estimateId },
                                    data: {
                                        recommendedSpec: resolved.spec,
                                        totalUsd: resolved.totalUsd,
                                        conversationLog: updatedLog,
                                    },
                                })];
                        case 6:
                            updated = _f.sent();
                            _b = {
                                estimate: updated,
                                requirements: requirements,
                                withinBudget: resolved.withinBudget,
                                budgetGapUsd: resolved.budgetGapUsd
                            };
                            if (!updated.schemaTopology) return [3 /*break*/, 8];
                            return [4 /*yield*/, this.renderDiagram(updated.schemaTopology, resolved.spec, false)];
                        case 7:
                            _a = _f.sent();
                            return [3 /*break*/, 9];
                        case 8:
                            _a = null;
                            _f.label = 9;
                        case 9: return [2 /*return*/, (_b.blockDiagramSvg = _a,
                                _b)];
                    }
                });
            });
        };
        // ---- Правки степпера количества (ТЗ п.31.2.1) — чистая персистентность, без Grok ----
        CalculatorService_1.prototype.updateSpec = function (estimateId, userId, sessionId, dto) {
            return __awaiter(this, void 0, void 0, function () {
                var estimate, currentSpec, byProductId, updatedSpec, totalUsd;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.getOr404(estimateId)];
                        case 1:
                            estimate = _a.sent();
                            this.assertOwnership(estimate, userId, sessionId);
                            currentSpec = estimate.recommendedSpec;
                            byProductId = new Map(dto.items.map(function (i) { return [i.productId, i.quantity]; }));
                            updatedSpec = currentSpec.map(function (item) {
                                return byProductId.has(item.productId) ? __assign(__assign({}, item), { quantity: byProductId.get(item.productId) }) : item;
                            });
                            totalUsd = updatedSpec.reduce(function (sum, i) { return sum + i.priceUsd * i.quantity; }, 0);
                            return [2 /*return*/, this.prisma.client.projectEstimate.update({
                                    where: { id: estimateId },
                                    data: { recommendedSpec: updatedSpec, totalUsd: totalUsd },
                                })];
                    }
                });
            });
        };
        // ---- Финализация — фиксация курса (ТЗ п.31.5) ----
        CalculatorService_1.prototype.finalize = function (estimateId, userId, sessionId) {
            return __awaiter(this, void 0, void 0, function () {
                var estimate, rate, exchangeRateUah, exchangeRateDate, totalUah;
                var _a;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0: return [4 /*yield*/, this.getOr404(estimateId)];
                        case 1:
                            estimate = _b.sent();
                            this.assertOwnership(estimate, userId, sessionId);
                            if (estimate.status !== 'DRAFT')
                                return [2 /*return*/, estimate];
                            return [4 /*yield*/, this.prisma.client.exchangeRate.findFirst({ where: { currency: 'USD' }, orderBy: { rateDate: 'desc' } })];
                        case 2:
                            rate = _b.sent();
                            exchangeRateUah = rate ? Number(rate.rateUah) : 41.5;
                            exchangeRateDate = (_a = rate === null || rate === void 0 ? void 0 : rate.rateDate) !== null && _a !== void 0 ? _a : new Date();
                            totalUah = Number(estimate.totalUsd) * exchangeRateUah;
                            return [2 /*return*/, this.prisma.client.projectEstimate.update({
                                    where: { id: estimateId },
                                    data: { status: 'FINALIZED', exchangeRateUah: exchangeRateUah, exchangeRateDate: exchangeRateDate, totalUah: totalUah },
                                })];
                    }
                });
            });
        };
        // ---- Фаза 4: чек-лист документов + постановка в очередь batch-генерации
        // (ТЗ п.31.11.0) ----
        CalculatorService_1.prototype.requestDocuments = function (estimateId, userId, sessionId, dto) {
            return __awaiter(this, void 0, void 0, function () {
                var estimate;
                var _a;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0: return [4 /*yield*/, this.getOr404(estimateId)];
                        case 1:
                            estimate = _b.sent();
                            this.assertOwnership(estimate, userId, sessionId);
                            // ТЗ п.31.9 — идемпотентность: если уже QUEUED/PROCESSING, не создаём
                            // новую работу повторно, просто возвращаем текущий статус.
                            if (estimate.generationStatus === 'QUEUED' || estimate.generationStatus === 'PROCESSING') {
                                return [2 /*return*/, estimate];
                            }
                            return [2 /*return*/, this.prisma.client.projectEstimate.update({
                                    where: { id: estimateId },
                                    data: {
                                        requestedDocuments: dto.requestedDocuments,
                                        contactChannel: dto.contactChannel,
                                        contactValue: dto.contactValue,
                                        scalingStrategy: (_a = dto.scalingStrategy) !== null && _a !== void 0 ? _a : undefined,
                                        generationStatus: 'QUEUED',
                                    },
                                })];
                    }
                });
            });
        };
        // ---- В корзину (ТЗ п.31.2.1) — батч, вся спецификация или выбранные позиции ----
        CalculatorService_1.prototype.addToCart = function (estimateId, userId, sessionId, productIds) {
            return __awaiter(this, void 0, void 0, function () {
                var estimate, spec, items, _i, items_1, item;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.getOr404(estimateId)];
                        case 1:
                            estimate = _a.sent();
                            this.assertOwnership(estimate, userId, sessionId);
                            spec = estimate.recommendedSpec;
                            items = productIds ? spec.filter(function (i) { return productIds.includes(i.productId); }) : spec;
                            _i = 0, items_1 = items;
                            _a.label = 2;
                        case 2:
                            if (!(_i < items_1.length)) return [3 /*break*/, 5];
                            item = items_1[_i];
                            return [4 /*yield*/, this.cart.addItem(userId, sessionId, item.productId, item.quantity)];
                        case 3:
                            _a.sent();
                            _a.label = 4;
                        case 4:
                            _i++;
                            return [3 /*break*/, 2];
                        case 5: return [2 /*return*/, { added: items.length }];
                    }
                });
            });
        };
        // ---- Полный пакет: аннотация + принципиальная схема + PDF (ТЗ п.31.10.3) ----
        CalculatorService_1.prototype.exportPackage = function (estimateId, userId, sessionId) {
            return __awaiter(this, void 0, void 0, function () {
                var estimate, spec, annualKwhEstimate, city, panelsWattTotal, perKwp, goalRecords, specSummary, annotationText, _a, principalDiagramSvg, svgDataUrl, updated, pdfUrl;
                var _b, _c, _d, _e;
                return __generator(this, function (_f) {
                    switch (_f.label) {
                        case 0: return [4 /*yield*/, this.getOr404(estimateId)];
                        case 1:
                            estimate = _f.sent();
                            this.assertOwnership(estimate, userId, sessionId);
                            spec = estimate.recommendedSpec;
                            annualKwhEstimate = null;
                            if (!estimate.cityRef) return [3 /*break*/, 5];
                            return [4 /*yield*/, this.prisma.client.novaPoshtaCity.findUnique({ where: { ref: estimate.cityRef } })];
                        case 2:
                            city = _f.sent();
                            if (!((city === null || city === void 0 ? void 0 : city.lat) && (city === null || city === void 0 ? void 0 : city.lng))) return [3 /*break*/, 5];
                            return [4 /*yield*/, this.sumPanelsWatt(spec)];
                        case 3:
                            panelsWattTotal = _f.sent();
                            return [4 /*yield*/, this.pvgis.getAnnualKwhPerKwp(city.lat, city.lng)];
                        case 4:
                            perKwp = _f.sent();
                            if (perKwp && panelsWattTotal > 0)
                                annualKwhEstimate = perKwp * (panelsWattTotal / 1000);
                            _f.label = 5;
                        case 5: return [4 /*yield*/, this.prisma.client.projectGoal.findMany({ where: { key: { in: estimate.goals } } })];
                        case 6:
                            goalRecords = _f.sent();
                            specSummary = spec.map(function (i) { return "".concat(i.name, " \u00D7 ").concat(i.quantity, " ($").concat(i.priceUsd.toFixed(2), "/\u0448\u0442)"); }).join('; ');
                            if (!((_b = estimate.annotationText) !== null && _b !== void 0)) return [3 /*break*/, 7];
                            _a = _b;
                            return [3 /*break*/, 9];
                        case 7: return [4 /*yield*/, this.grok.generateProjectAnnotation({
                                city: (_c = estimate.city) !== null && _c !== void 0 ? _c : undefined,
                                goals: goalRecords.map(function (g) { return g.label; }),
                                topology: (_d = estimate.schemaTopology) !== null && _d !== void 0 ? _d : 'невизначено',
                                specSummary: specSummary,
                                totalUsd: Number(estimate.totalUsd),
                                annualKwhEstimate: annualKwhEstimate,
                            })];
                        case 8:
                            _a = (_f.sent());
                            _f.label = 9;
                        case 9:
                            annotationText = (_e = _a) !== null && _e !== void 0 ? _e : undefined;
                            principalDiagramSvg = null;
                            if (!estimate.schemaTopology) return [3 /*break*/, 12];
                            return [4 /*yield*/, this.renderDiagram(estimate.schemaTopology, spec, true)];
                        case 10:
                            principalDiagramSvg = _f.sent();
                            svgDataUrl = "data:image/svg+xml;base64,".concat(Buffer.from(principalDiagramSvg !== null && principalDiagramSvg !== void 0 ? principalDiagramSvg : '').toString('base64'));
                            return [4 /*yield*/, this.prisma.client.projectEstimateDiagram.upsert({
                                    where: { projectEstimateId_diagramType: { projectEstimateId: estimateId, diagramType: 'PRINCIPAL' } },
                                    create: { projectEstimateId: estimateId, diagramType: 'PRINCIPAL', svgUrl: svgDataUrl },
                                    update: { svgUrl: svgDataUrl },
                                })];
                        case 11:
                            _f.sent();
                            _f.label = 12;
                        case 12: return [4 /*yield*/, this.prisma.client.projectEstimate.update({
                                where: { id: estimateId },
                                data: { annotationText: annotationText },
                            })];
                        case 13:
                            updated = _f.sent();
                            return [4 /*yield*/, this.invoice.generateAndStoreProjectEstimatePdf(estimateId)];
                        case 14:
                            pdfUrl = _f.sent();
                            return [4 /*yield*/, this.prisma.client.projectEstimate.update({ where: { id: estimateId }, data: { pdfUrl: pdfUrl } })];
                        case 15:
                            _f.sent();
                            return [2 /*return*/, { estimate: updated, pdfUrl: pdfUrl, principalDiagramSvg: principalDiagramSvg, annualKwhEstimate: annualKwhEstimate }];
                    }
                });
            });
        };
        // ---- Отправка (ТЗ п.31.6 + Viber по отдельному запросу) ----
        //
        // Каждая попытка отправки — отдельная запись в ProjectEstimateDelivery
        // (не перезапись одного поля на ProjectEstimate) — можно отправить один
        // и тот же проект повторно или на несколько каналов, история сохраняется.
        //
        // ВАЖНЫЙ НЮАНС (см. AUDIT-PHASE-3.md): статус SENT означает разное для
        // разных каналов. TELEGRAM/EMAIL — подтверждённый успешный вызов API
        // (мы реально знаем, что сообщение ушло). WHATSAPP/VIBER — деньги за
        // Business API нет, работаем через диплинк (wa.me/viber://forward) с
        // предзаполненным текстом; SENT здесь означает только "діплінк згенеровано
        // і повернуто користувачу", а не подтверждённую доставку — финальный клик
        // "Отправить" в самом приложении делает человек, не наш backend.
        CalculatorService_1.prototype.send = function (estimateId, userId, sessionId, dto) {
            return __awaiter(this, void 0, void 0, function () {
                var estimate, channel, delivery, deeplink, result, user, sent, err_1, message;
                var _a;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0: return [4 /*yield*/, this.getOr404(estimateId)];
                        case 1:
                            estimate = _b.sent();
                            this.assertOwnership(estimate, userId, sessionId);
                            if (!estimate.pdfUrl) {
                                throw new common_1.BadRequestException('Спочатку сформуйте пакет документів (POST /calculator/:id/export)');
                            }
                            channel = dto.channel.toUpperCase();
                            return [4 /*yield*/, this.prisma.client.projectEstimateDelivery.create({
                                    data: { projectEstimateId: estimateId, channel: channel, contactValue: dto.contactValue, status: 'PENDING' },
                                })];
                        case 2:
                            delivery = _b.sent();
                            deeplink = null;
                            _b.label = 3;
                        case 3:
                            _b.trys.push([3, 11, , 13]);
                            if (!(dto.channel === 'email')) return [3 /*break*/, 5];
                            return [4 /*yield*/, this.email.send({
                                    to: dto.contactValue,
                                    subject: "\u041A\u043E\u0448\u0442\u043E\u0440\u0438\u0441 \u043F\u0440\u043E\u0454\u043A\u0442\u0443 Solar Shop \u2116".concat(estimate.id.slice(-8).toUpperCase()),
                                    text: "\u0412\u0430\u0448 \u043A\u043E\u0448\u0442\u043E\u0440\u0438\u0441 \u043F\u0440\u043E\u0454\u043A\u0442\u0443 \u0433\u043E\u0442\u043E\u0432\u0438\u0439. \u0421\u0443\u043C\u0430: $".concat(Number(estimate.totalUsd).toFixed(2), "."),
                                    attachmentUrl: estimate.pdfUrl,
                                })];
                        case 4:
                            result = _b.sent();
                            if (!result.sent)
                                throw new Error((_a = result.error) !== null && _a !== void 0 ? _a : 'unknown email error');
                            return [3 /*break*/, 9];
                        case 5:
                            if (!(dto.channel === 'telegram')) return [3 /*break*/, 8];
                            if (!estimate.userId)
                                throw new Error('Telegram-відправка доступна лише авторизованим користувачам');
                            return [4 /*yield*/, this.prisma.client.user.findUnique({ where: { id: estimate.userId } })];
                        case 6:
                            user = _b.sent();
                            if (!user)
                                throw new Error('Користувача не знайдено');
                            return [4 /*yield*/, this.notify.sendDocumentToUser(user.telegramId, estimate.pdfUrl, "\u041A\u043E\u0448\u0442\u043E\u0440\u0438\u0441 \u043F\u0440\u043E\u0454\u043A\u0442\u0443 \u2116".concat(estimate.id.slice(-8).toUpperCase()))];
                        case 7:
                            sent = _b.sent();
                            if (!sent)
                                throw new Error('Telegram sendDocument повернув помилку (можливо, користувач заблокував бота, або PDF ще на data: URL без BLOB_READ_WRITE_TOKEN)');
                            return [3 /*break*/, 9];
                        case 8:
                            if (dto.channel === 'whatsapp') {
                                deeplink = buildWhatsappDeeplink(dto.contactValue, estimate.id, estimate.pdfUrl);
                            }
                            else if (dto.channel === 'viber') {
                                deeplink = buildViberDeeplink(estimate.id, estimate.pdfUrl);
                            }
                            _b.label = 9;
                        case 9: return [4 /*yield*/, this.prisma.client.projectEstimateDelivery.update({
                                where: { id: delivery.id },
                                data: { status: 'SENT', sentAt: new Date() },
                            })];
                        case 10:
                            _b.sent();
                            return [3 /*break*/, 13];
                        case 11:
                            err_1 = _b.sent();
                            message = err_1 instanceof Error ? err_1.message : String(err_1);
                            return [4 /*yield*/, this.prisma.client.projectEstimateDelivery.update({
                                    where: { id: delivery.id },
                                    data: { status: 'FAILED', errorMessage: message },
                                })];
                        case 12:
                            _b.sent();
                            throw new common_1.BadRequestException("\u041D\u0435 \u0432\u0434\u0430\u043B\u043E\u0441\u044F \u043D\u0430\u0434\u0456\u0441\u043B\u0430\u0442\u0438 \u0447\u0435\u0440\u0435\u0437 ".concat(dto.channel, ": ").concat(message));
                        case 13: return [4 /*yield*/, this.prisma.client.projectEstimate.update({ where: { id: estimateId }, data: { status: 'SENT' } })];
                        case 14:
                            _b.sent();
                            return [2 /*return*/, { ok: true, deeplink: deeplink }];
                    }
                });
            });
        };
        // ---- Админка: контакты доставки (по запросу — отдельная вкладка) ----
        CalculatorService_1.prototype.findAllDeliveries = function () {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    return [2 /*return*/, this.prisma.client.projectEstimateDelivery.findMany({
                            include: { projectEstimate: { select: { id: true, name: true, city: true, totalUsd: true } } },
                            orderBy: { createdAt: 'desc' },
                        })];
                });
            });
        };
        // ---- Чтение ----
        CalculatorService_1.prototype.findById = function (id, userId, sessionId) {
            return __awaiter(this, void 0, void 0, function () {
                var estimate;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.getOr404(id)];
                        case 1:
                            estimate = _a.sent();
                            this.assertOwnership(estimate, userId, sessionId);
                            return [2 /*return*/, estimate];
                    }
                });
            });
        };
        CalculatorService_1.prototype.findMine = function (userId) {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    return [2 /*return*/, this.prisma.client.projectEstimate.findMany({ where: { userId: userId }, orderBy: { createdAt: 'desc' } })];
                });
            });
        };
        // ТЗ п.31.7 — гостевые DRAFT-расчёты мёрджатся в userId при входе через
        // Telegram, тот же паттерн, что и у гостевой корзины (Cart.sessionId).
        // Найдено при ревью фронтенда: ни этот метод, ни аналогичный для корзины
        // (CartService.mergeGuestCartIntoUser) реально не вызывались с фронта —
        // эндпоинты существовали, но кнопка логина их не дёргала. Чинится на
        // уровне TelegramLoginButton, не здесь — сам метод уже был в CartService,
        // добавляю симметричный для калькулятора.
        CalculatorService_1.prototype.mergeGuestEstimates = function (sessionId, userId) {
            return __awaiter(this, void 0, void 0, function () {
                var result;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.prisma.client.projectEstimate.updateMany({
                                where: { sessionId: sessionId, userId: null },
                                data: { sessionId: null, userId: userId },
                            })];
                        case 1:
                            result = _a.sent();
                            return [2 /*return*/, { merged: result.count }];
                    }
                });
            });
        };
        CalculatorService_1.prototype.findAllForAdmin = function () {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    return [2 /*return*/, this.prisma.client.projectEstimate.findMany({ orderBy: { createdAt: 'desc' } })];
                });
            });
        };
        CalculatorService_1.prototype.convertToOrder = function (estimateId) {
            return __awaiter(this, void 0, void 0, function () {
                var estimate;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.getOr404(estimateId)];
                        case 1:
                            estimate = _a.sent();
                            if (!estimate.userId) {
                                throw new common_1.BadRequestException('Проєкт без користувача не можна перетворити на замовлення напряму — немає кому належати кошику');
                            }
                            return [4 /*yield*/, this.addToCart(estimateId, estimate.userId, null)];
                        case 2:
                            _a.sent();
                            return [2 /*return*/, this.prisma.client.projectEstimate.update({ where: { id: estimateId }, data: { status: 'CONVERTED_TO_ORDER' } })];
                    }
                });
            });
        };
        // ---- Приватные хелперы ----
        CalculatorService_1.prototype.getOr404 = function (id) {
            return __awaiter(this, void 0, void 0, function () {
                var estimate;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.prisma.client.projectEstimate.findUnique({ where: { id: id } })];
                        case 1:
                            estimate = _a.sent();
                            if (!estimate)
                                throw new common_1.NotFoundException('Project estimate not found');
                            return [2 /*return*/, estimate];
                    }
                });
            });
        };
        // Найдено при аудите (см. AUDIT-PHASE-3.md) — до этой правки refine/
        // updateSpec/finalize/exportPackage/send не проверяли, что вызывающий
        // действительно владелец расчёта: любой, кто узнал estimateId (cuid,
        // тяжело угадать, но может утечь через share-ссылку/реферер/логи), мог
        // дёргать чужой платный Grok-пайплайн и — что хуже — отправить чужие
        // персональные данные проекта на СВОЙ email/Telegram через POST /send.
        // userId имеет приоритет: если юзер залогинен и владеет чужим гостевым
        // (sessionId) расчётом — это не считается «своим», доступ по sessionId
        // работает только для гостя без аккаунта.
        CalculatorService_1.prototype.assertOwnership = function (estimate, userId, sessionId) {
            if (estimate.userId) {
                if (estimate.userId !== userId) {
                    throw new common_1.ForbiddenException('Цей розрахунок належить іншому користувачу');
                }
                return;
            }
            if (estimate.sessionId) {
                if (estimate.sessionId !== sessionId) {
                    throw new common_1.ForbiddenException('Цей розрахунок належить іншій гостьовій сесії');
                }
                return;
            }
            // Ни userId, ни sessionId на расчёте нет (аномалия данных) — по
            // умолчанию отказываем, не даём доступ «по умолчанию открыт».
            throw new common_1.ForbiddenException('Розрахунок не має власника — доступ заборонено');
        };
        CalculatorService_1.prototype.assertDraftLimitNotExceeded = function (userId, sessionId) {
            return __awaiter(this, void 0, void 0, function () {
                var where, count;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            where = userId ? { userId: userId, status: 'DRAFT' } : { sessionId: sessionId, status: 'DRAFT' };
                            return [4 /*yield*/, this.prisma.client.projectEstimate.count({ where: where })];
                        case 1:
                            count = _a.sent();
                            if (count >= MAX_DRAFTS_PER_OWNER) {
                                throw new common_1.BadRequestException("\u0417\u0430\u0431\u0430\u0433\u0430\u0442\u043E \u043D\u0435\u0437\u0430\u0432\u0435\u0440\u0448\u0435\u043D\u0438\u0445 \u0447\u0435\u0440\u043D\u0435\u0442\u043E\u043A \u043F\u0440\u043E\u0454\u043A\u0442\u0456\u0432 (".concat(MAX_DRAFTS_PER_OWNER, ") \u2014 \u0437\u0430\u0432\u0435\u0440\u0448\u0456\u0442\u044C \u0430\u0431\u043E \u0432\u0438\u0434\u0430\u043B\u0456\u0442\u044C \u0456\u0441\u043D\u0443\u044E\u0447\u0456 \u043F\u0435\u0440\u0435\u0434 \u0441\u0442\u0432\u043E\u0440\u0435\u043D\u043D\u044F\u043C \u043D\u043E\u0432\u043E\u0433\u043E"));
                            }
                            return [2 /*return*/];
                    }
                });
            });
        };
        // ТЗ п.31.4 — детерминированный резолвинг требований Grok в реальный каталог.
        // Всегда берём самый дешёвый подходящий вариант по каждой категории — это
        // естественно минимизирует итоговую цену (не завышаем бюджет самовольно).
        CalculatorService_1.prototype.resolveRequirementsToCatalog = function (requirements, budgetUsd) {
            return __awaiter(this, void 0, void 0, function () {
                var spec, panels, bestPanel, powerW, quantity, batteries, pool, _a, bestBattery, capacityKwh, quantity, controllers, controllerPool, _b, suitableController, totalUsd, withinBudget, budgetGapUsd;
                var _c, _d, _e;
                return __generator(this, function (_f) {
                    switch (_f.label) {
                        case 0:
                            spec = [];
                            if (!requirements) {
                                return [2 /*return*/, { spec: spec, totalUsd: 0, withinBudget: true, budgetGapUsd: null }];
                            }
                            return [4 /*yield*/, this.prisma.client.product.findMany({
                                    where: { category: 'SOLAR_PANEL', status: db_1.ProductStatus.PUBLISHED, cachedInStock: true },
                                    orderBy: { cachedPriceUsd: 'asc' },
                                })];
                        case 1:
                            panels = _f.sent();
                            bestPanel = pickClosest(panels, function (p) { var _a; return Number((_a = p.specs.powerW) !== null && _a !== void 0 ? _a : 0); }, requirements.panelsWattTarget / Math.max(1, this.estimatePanelCount(panels, requirements.panelsWattTarget)));
                            if (bestPanel) {
                                powerW = Number((_c = bestPanel.specs.powerW) !== null && _c !== void 0 ? _c : 400);
                                quantity = Math.max(1, Math.ceil(requirements.panelsWattTarget / powerW));
                                spec.push({
                                    productId: bestPanel.id,
                                    articleNumber: bestPanel.articleNumber,
                                    slug: bestPanel.slug,
                                    name: bestPanel.name,
                                    category: 'SOLAR_PANEL',
                                    quantity: quantity,
                                    priceUsd: Number(bestPanel.cachedPriceUsd),
                                });
                            }
                            if (!(requirements.batteryKwhTarget > 0)) return [3 /*break*/, 6];
                            return [4 /*yield*/, this.prisma.client.product.findMany({
                                    where: __assign({ category: 'BATTERY', status: db_1.ProductStatus.PUBLISHED, cachedInStock: true }, (requirements.batteryChemistry ? { specs: { path: ['chemistry'], equals: requirements.batteryChemistry } } : {})),
                                    orderBy: { cachedPriceUsd: 'asc' },
                                })];
                        case 2:
                            batteries = _f.sent();
                            if (!(batteries.length > 0)) return [3 /*break*/, 3];
                            _a = batteries;
                            return [3 /*break*/, 5];
                        case 3: return [4 /*yield*/, this.prisma.client.product.findMany({
                                where: { category: 'BATTERY', status: db_1.ProductStatus.PUBLISHED, cachedInStock: true },
                                orderBy: { cachedPriceUsd: 'asc' },
                            })];
                        case 4:
                            _a = _f.sent();
                            _f.label = 5;
                        case 5:
                            pool = _a;
                            bestBattery = pool[0];
                            if (bestBattery) {
                                capacityKwh = Number((_d = bestBattery.specs.capacityKwh) !== null && _d !== void 0 ? _d : 3.5);
                                quantity = Math.max(1, Math.ceil(requirements.batteryKwhTarget / capacityKwh));
                                spec.push({
                                    productId: bestBattery.id,
                                    articleNumber: bestBattery.articleNumber,
                                    slug: bestBattery.slug,
                                    name: bestBattery.name,
                                    category: 'BATTERY',
                                    quantity: quantity,
                                    priceUsd: Number(bestBattery.cachedPriceUsd),
                                });
                            }
                            _f.label = 6;
                        case 6: return [4 /*yield*/, this.prisma.client.product.findMany({
                                where: __assign({ category: 'CONTROLLER', status: db_1.ProductStatus.PUBLISHED, cachedInStock: true }, (requirements.controllerType ? { specs: { path: ['controllerType'], equals: requirements.controllerType } } : {})),
                                orderBy: { cachedPriceUsd: 'asc' },
                            })];
                        case 7:
                            controllers = _f.sent();
                            if (!(controllers.length > 0)) return [3 /*break*/, 8];
                            _b = controllers;
                            return [3 /*break*/, 10];
                        case 8: return [4 /*yield*/, this.prisma.client.product.findMany({
                                where: { category: 'CONTROLLER', status: db_1.ProductStatus.PUBLISHED, cachedInStock: true },
                                orderBy: { cachedPriceUsd: 'asc' },
                            })];
                        case 9:
                            _b = _f.sent();
                            _f.label = 10;
                        case 10:
                            controllerPool = _b;
                            suitableController = (_e = controllerPool.find(function (c) { var _a; return Number((_a = c.specs.maxCurrentA) !== null && _a !== void 0 ? _a : 0) >= requirements.controllerMinAmps; })) !== null && _e !== void 0 ? _e : controllerPool[controllerPool.length - 1];
                            if (suitableController) {
                                spec.push({
                                    productId: suitableController.id,
                                    articleNumber: suitableController.articleNumber,
                                    slug: suitableController.slug,
                                    name: suitableController.name,
                                    category: 'CONTROLLER',
                                    quantity: 1,
                                    priceUsd: Number(suitableController.cachedPriceUsd),
                                });
                            }
                            totalUsd = spec.reduce(function (sum, i) { return sum + i.priceUsd * i.quantity; }, 0);
                            withinBudget = budgetUsd === undefined || totalUsd <= budgetUsd;
                            budgetGapUsd = withinBudget ? null : Math.round((totalUsd - (budgetUsd !== null && budgetUsd !== void 0 ? budgetUsd : 0)) * 100) / 100;
                            return [2 /*return*/, { spec: spec, totalUsd: Math.round(totalUsd * 100) / 100, withinBudget: withinBudget, budgetGapUsd: budgetGapUsd }];
                    }
                });
            });
        };
        CalculatorService_1.prototype.estimatePanelCount = function (panels, targetWatt) {
            if (panels.length === 0)
                return 1;
            var avgWatt = panels.reduce(function (s, p) { var _a; return s + Number((_a = p.specs.powerW) !== null && _a !== void 0 ? _a : 400); }, 0) / panels.length;
            return Math.max(1, Math.round(targetWatt / avgWatt));
        };
        CalculatorService_1.prototype.sumPanelsWatt = function (spec) {
            return __awaiter(this, void 0, void 0, function () {
                var total, _i, _a, item, product, powerW;
                var _b;
                return __generator(this, function (_c) {
                    switch (_c.label) {
                        case 0:
                            total = 0;
                            _i = 0, _a = spec.filter(function (i) { return i.category === 'SOLAR_PANEL'; });
                            _c.label = 1;
                        case 1:
                            if (!(_i < _a.length)) return [3 /*break*/, 4];
                            item = _a[_i];
                            return [4 /*yield*/, this.prisma.client.product.findUnique({ where: { id: item.productId } })];
                        case 2:
                            product = _c.sent();
                            if (product) {
                                powerW = Number((_b = product.specs.powerW) !== null && _b !== void 0 ? _b : 0);
                                total += powerW * item.quantity;
                            }
                            _c.label = 3;
                        case 3:
                            _i++;
                            return [3 /*break*/, 1];
                        case 4: return [2 /*return*/, total];
                    }
                });
            });
        };
        // ТЗ п.31.10.1 — детерминированная подстановка резолвленных данных в
        // готовый (не сгенерированный ИИ) шаблон. Grok здесь не участвует вообще.
        CalculatorService_1.prototype.renderDiagram = function (topology, spec, detailed) {
            return __awaiter(this, void 0, void 0, function () {
                var template, svgTemplate, panels, batteries, controllers, panelsLabel, batteryLabel, controllerLabel;
                var _a;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0: return [4 /*yield*/, this.prisma.client.schemaTemplate.findUnique({
                                where: { topology_diagramType: { topology: topology, diagramType: detailed ? 'PRINCIPAL' : 'BLOCK' } },
                            })];
                        case 1:
                            template = _b.sent();
                            svgTemplate = (_a = template === null || template === void 0 ? void 0 : template.svgTemplate) !== null && _a !== void 0 ? _a : (0, db_1.buildSchemaTemplateSvg)(topology, detailed);
                            panels = spec.filter(function (s) { return s.category === 'SOLAR_PANEL'; });
                            batteries = spec.filter(function (s) { return s.category === 'BATTERY'; });
                            controllers = spec.filter(function (s) { return s.category === 'CONTROLLER'; });
                            panelsLabel = panels.length ? "".concat(panels[0].name, " \u00D7 ").concat(panels[0].quantity) : 'Сонячні панелі';
                            batteryLabel = batteries.length ? "".concat(batteries[0].name, " \u00D7 ").concat(batteries[0].quantity) : 'Акумулятор';
                            controllerLabel = controllers.length ? controllers[0].name : 'Контролер заряду';
                            // Найдено при повторному аудиті: підстановка йшла БЕЗ XML-екранування —
                            // назва товару з `&`/`<`/`>` (напр. "Panel A & B") ламала валідність
                            // SVG (не парситься/парситься некоректно в браузері), а сам SVG потім
                            // рендериться через dangerouslySetInnerHTML на публічному сайті
                            // (SchemaDiagram.tsx) — тому екранування важливе і для коректності
                            // рендеру, і як defense-in-depth (Product.name зараз вводиться
                            // адміном вручну, не напряму зі скрапленого rawTitle постачальника,
                            // але це не гарантія на майбутнє, якщо матчинг колись почне
                            // автозаповнювати назву).
                            return [2 /*return*/, svgTemplate
                                    .replace(/\{\{PANELS_LABEL\}\}/g, escapeXml(panelsLabel))
                                    .replace(/\{\{BATTERY_LABEL\}\}/g, escapeXml(batteryLabel))
                                    .replace(/\{\{CONTROLLER_LABEL\}\}/g, escapeXml(controllerLabel))
                                    .replace(/\{\{INVERTER_LABEL\}\}/g, 'Інвертор (підбирається окремо)')
                                    .replace(/\{\{GRID_LABEL\}\}/g, 'Мережа 220В')
                                    .replace(/\{\{LOAD_LABEL\}\}/g, 'Навантаження')
                                    .replace(/\{\{LOAD2_LABEL\}\}/g, 'Навантаження 2')];
                    }
                });
            });
        };
        return CalculatorService_1;
    }());
    __setFunctionName(_classThis, "CalculatorService");
    (function () {
        var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        CalculatorService = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return CalculatorService = _classThis;
}();
exports.CalculatorService = CalculatorService;
function escapeXml(text) {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}
// Вынесено за пределы класса как обычная функция — generic-метод класса
// давал сбой вывода типа T в связке TypeScript+неcгенерированный Prisma
// Client в этой песочнице, обычная модульная функция инферит корректно.
function pickClosest(items, numericValue, target) {
    if (items.length === 0)
        return null;
    return items.reduce(function (best, item) {
        return Math.abs(numericValue(item) - target) < Math.abs(numericValue(best) - target) ? item : best;
    });
}
// ТЗ п.31.6 — WhatsApp на первом этапе: wa.me-диплинк с предзаполненным
// текстом, без полноценной WhatsApp Business API (платная, отдельная
// верификация — избыточно для Фазы 3).
function buildWhatsappDeeplink(phone, estimateId, pdfUrl) {
    var digits = phone.replace(/\D/g, '');
    var text = encodeURIComponent("\u041A\u043E\u0448\u0442\u043E\u0440\u0438\u0441 \u043F\u0440\u043E\u0454\u043A\u0442\u0443 Solar Shop \u2116".concat(estimateId.slice(-8).toUpperCase(), ": ").concat(pdfUrl));
    return "https://wa.me/".concat(digits, "?text=").concat(text);
}
// Viber не входил в исходное ТЗ (добавлен по отдельному запросу) — та же
// логика, что и WhatsApp: без Viber Business Messages API (платный,
// требует регистрации публичного аккаунта), просто диплинк. В отличие от
// wa.me, у Viber нет универсального "открыть чат с конкретным номером
// и текстом" для не-контактов — используем viber://forward, который
// открывает системный пикер "переслать" с предзаполненным текстом,
// получателя выбирает человек вручную. Из-за этого ограничения статус
// SENT для Viber даже более условный, чем для WhatsApp — см. AUDIT.
function buildViberDeeplink(estimateId, pdfUrl) {
    var text = encodeURIComponent("\u041A\u043E\u0448\u0442\u043E\u0440\u0438\u0441 \u043F\u0440\u043E\u0454\u043A\u0442\u0443 Solar Shop \u2116".concat(estimateId.slice(-8).toUpperCase(), ": ").concat(pdfUrl));
    return "viber://forward?text=".concat(text);
}
