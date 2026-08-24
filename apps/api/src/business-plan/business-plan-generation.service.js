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
exports.BusinessPlanGenerationService = void 0;
var common_1 = require("@nestjs/common");
// ТЗ п.31.11.0 — batch-обработчик: забирает все QUEUED-проекты разом,
// генерирует отмеченный чек-листом пакет документов, отправляет на
// сохранённый контакт, уведомляет менеджера. Вызывается и из крона
// (раз в несколько минут), и вручную из админки — тот же метод.
var BusinessPlanGenerationService = function () {
    var _classDecorators = [(0, common_1.Injectable)()];
    var _classDescriptor;
    var _classExtraInitializers = [];
    var _classThis;
    var BusinessPlanGenerationService = _classThis = /** @class */ (function () {
        function BusinessPlanGenerationService_1(prisma, grok, invoice, email, notify, settings, financing, payback, manifests) {
            this.prisma = prisma;
            this.grok = grok;
            this.invoice = invoice;
            this.email = email;
            this.notify = notify;
            this.settings = settings;
            this.financing = financing;
            this.payback = payback;
            this.manifests = manifests;
            this.logger = new common_1.Logger(BusinessPlanGenerationService.name);
        }
        // Забирает все QUEUED-проекты и обрабатывает пакетно (ТЗ: "меньше
        // накладных расходов, чем если бы каждый клик дёргал Grok в реальном
        // времени" — в этой реализации вызовы всё равно последовательные, т.к.
        // отдельного batch/async-режима у Grok API на момент имплементации не
        // подтверждено — см. AUDIT-PHASE-4.md).
        BusinessPlanGenerationService_1.prototype.processQueue = function () {
            return __awaiter(this, void 0, void 0, function () {
                var queued, completed, failed, _i, queued_1, estimate, err_1;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.prisma.client.projectEstimate.findMany({ where: { generationStatus: 'QUEUED' } })];
                        case 1:
                            queued = _a.sent();
                            completed = 0;
                            failed = 0;
                            _i = 0, queued_1 = queued;
                            _a.label = 2;
                        case 2:
                            if (!(_i < queued_1.length)) return [3 /*break*/, 10];
                            estimate = queued_1[_i];
                            return [4 /*yield*/, this.prisma.client.projectEstimate.update({ where: { id: estimate.id }, data: { generationStatus: 'PROCESSING' } })];
                        case 3:
                            _a.sent();
                            _a.label = 4;
                        case 4:
                            _a.trys.push([4, 6, , 9]);
                            return [4 /*yield*/, this.generateForEstimate(estimate.id)];
                        case 5:
                            _a.sent();
                            completed++;
                            return [3 /*break*/, 9];
                        case 6:
                            err_1 = _a.sent();
                            this.logger.error("Business plan generation failed for ".concat(estimate.id, ": ").concat(err_1));
                            return [4 /*yield*/, this.prisma.client.projectEstimate.update({ where: { id: estimate.id }, data: { generationStatus: 'FAILED' } })];
                        case 7:
                            _a.sent();
                            return [4 /*yield*/, this.notify.notifyCronFailed('business_plan_batch_processor', "estimate ".concat(estimate.id, ": ").concat(err_1))];
                        case 8:
                            _a.sent();
                            failed++;
                            return [3 /*break*/, 9];
                        case 9:
                            _i++;
                            return [3 /*break*/, 2];
                        case 10: return [2 /*return*/, { processed: queued.length, completed: completed, failed: failed }];
                    }
                });
            });
        };
        BusinessPlanGenerationService_1.prototype.generateForEstimate = function (estimateId) {
            return __awaiter(this, void 0, void 0, function () {
                var estimate, spec, requested, annotationText, goalRecords, specSummary, phases, _i, phases_1, p, paybackEstimate, _a, businessPlanContent, manifestId, panelsWattTotal, powerRangeTag, match, clientType, programs, _b, projectSummary, updated, pdfUrl, user;
                var _c, _d, _e;
                return __generator(this, function (_f) {
                    switch (_f.label) {
                        case 0: return [4 /*yield*/, this.prisma.client.projectEstimate.findUniqueOrThrow({ where: { id: estimateId } })];
                        case 1:
                            estimate = _f.sent();
                            spec = estimate.recommendedSpec;
                            requested = new Set(estimate.requestedDocuments);
                            annotationText = estimate.annotationText;
                            if (!(requested.has('ANNOTATION') && !annotationText)) return [3 /*break*/, 4];
                            return [4 /*yield*/, this.prisma.client.projectGoal.findMany({ where: { key: { in: estimate.goals } } })];
                        case 2:
                            goalRecords = _f.sent();
                            specSummary = spec.map(function (i) { return "".concat(i.name, " \u00D7 ").concat(i.quantity, " ($").concat(i.priceUsd.toFixed(2), "/\u0448\u0442)"); }).join('; ');
                            return [4 /*yield*/, this.grok.generateProjectAnnotation({
                                    city: (_c = estimate.city) !== null && _c !== void 0 ? _c : undefined,
                                    goals: goalRecords.map(function (g) { return g.label; }),
                                    topology: (_d = estimate.schemaTopology) !== null && _d !== void 0 ? _d : 'невизначено',
                                    specSummary: specSummary,
                                    totalUsd: Number(estimate.totalUsd),
                                })];
                        case 3:
                            annotationText = _f.sent();
                            _f.label = 4;
                        case 4:
                            phases = [];
                            if (!(estimate.scalingStrategy && estimate.scalingStrategy !== 'NONE' && estimate.budgetUsd)) return [3 /*break*/, 9];
                            phases = this.planPhases(spec, Number(estimate.budgetUsd), estimate.scalingStrategy);
                            return [4 /*yield*/, this.prisma.client.projectPhase.deleteMany({ where: { projectEstimateId: estimateId } })];
                        case 5:
                            _f.sent();
                            _i = 0, phases_1 = phases;
                            _f.label = 6;
                        case 6:
                            if (!(_i < phases_1.length)) return [3 /*break*/, 9];
                            p = phases_1[_i];
                            return [4 /*yield*/, this.prisma.client.projectPhase.create({
                                    data: {
                                        projectEstimateId: estimateId,
                                        phaseNumber: p.phaseNumber,
                                        title: p.title,
                                        description: p.description,
                                        specItems: p.specItems,
                                        cumulativeTotalUsd: p.cumulativeTotalUsd,
                                        timingNote: p.timingNote,
                                    },
                                })];
                        case 7:
                            _f.sent();
                            _f.label = 8;
                        case 8:
                            _i++;
                            return [3 /*break*/, 6];
                        case 9:
                            if (!requested.has('BUSINESS_PLAN')) return [3 /*break*/, 11];
                            return [4 /*yield*/, this.payback.compute(estimateId)];
                        case 10:
                            _a = _f.sent();
                            return [3 /*break*/, 12];
                        case 11:
                            _a = null;
                            _f.label = 12;
                        case 12:
                            paybackEstimate = _a;
                            businessPlanContent = null;
                            manifestId = null;
                            if (!requested.has('BUSINESS_PLAN')) return [3 /*break*/, 20];
                            return [4 /*yield*/, this.sumPanelsWatt(spec)];
                        case 13:
                            panelsWattTotal = _f.sent();
                            return [4 /*yield*/, this.settings.resolvePowerRangeTag(panelsWattTotal)];
                        case 14:
                            powerRangeTag = _f.sent();
                            return [4 /*yield*/, this.manifests.findBestMatch(estimate.goals, powerRangeTag)];
                        case 15:
                            match = _f.sent();
                            if (!match) return [3 /*break*/, 20];
                            manifestId = match.manifest.id;
                            clientType = estimate.goals.includes('COMMERCIAL_OBJECT') ? 'бізнес' : 'фізичні особи';
                            if (!estimate.creditAmountUsd) return [3 /*break*/, 17];
                            return [4 /*yield*/, this.financing.findForBusinessPlan(Number(estimate.creditAmountUsd), clientType)];
                        case 16:
                            _b = _f.sent();
                            return [3 /*break*/, 18];
                        case 17:
                            _b = [];
                            _f.label = 18;
                        case 18:
                            programs = _b;
                            projectSummary = [
                                "\u041C\u0456\u0441\u0442\u043E: ".concat((_e = estimate.city) !== null && _e !== void 0 ? _e : 'не вказано'),
                                "\u0421\u043F\u0435\u0446\u0438\u0444\u0456\u043A\u0430\u0446\u0456\u044F: ".concat(spec.map(function (i) { return "".concat(i.name, " \u00D7 ").concat(i.quantity); }).join('; ')),
                                "\u0420\u0430\u0437\u043E\u043C: $".concat(Number(estimate.totalUsd).toFixed(2)),
                                paybackEstimate
                                    ? "\u041E\u043A\u0443\u043F\u043D\u0456\u0441\u0442\u044C: \u043E\u0440\u0456\u0454\u043D\u0442\u043E\u0432\u043D\u043E ".concat(paybackEstimate.paybackYearsMin.toFixed(1), "-").concat(paybackEstimate.paybackYearsMax.toFixed(1), " \u0440\u043E\u043A\u0456\u0432 (\u0437\u0430 \u0434\u0430\u043D\u0438\u043C\u0438 PVGIS \u0442\u0430 \u0442\u0430\u0440\u0438\u0444\u043E\u043C ").concat(paybackEstimate.tariffLabel, ")")
                                    : '',
                                estimate.creditAmountUsd ? "\u0421\u0443\u043C\u0430 \u043A\u0440\u0435\u0434\u0438\u0442\u0443: $".concat(Number(estimate.creditAmountUsd).toFixed(2)) : '',
                                programs.length > 0
                                    ? "\u0414\u043E\u0441\u0442\u0443\u043F\u043D\u0456 \u043F\u0440\u043E\u0433\u0440\u0430\u043C\u0438 \u043A\u0440\u0435\u0434\u0438\u0442\u0443\u0432\u0430\u043D\u043D\u044F: ".concat(programs.map(function (p) { return "".concat(p.name, " (").concat(p.url, ")"); }).join('; '))
                                    : 'Доступні програми кредитування: не знайдено відповідних у поточному оточенні',
                                phases.length > 0
                                    ? "\u041F\u043E\u0435\u0442\u0430\u043F\u043D\u0430 \u0440\u0435\u0430\u043B\u0456\u0437\u0430\u0446\u0456\u044F (".concat(estimate.scalingStrategy, "): ").concat(phases.map(function (p) { return "".concat(p.title, " \u2014 $").concat(p.cumulativeTotalUsd.toFixed(2)); }).join('; '))
                                    : '',
                            ]
                                .filter(Boolean)
                                .join('\n');
                            return [4 /*yield*/, this.grok.fillBusinessPlanContent({
                                    manifestContent: match.manifest.content,
                                    projectSummary: projectSummary,
                                })];
                        case 19:
                            businessPlanContent = _f.sent();
                            _f.label = 20;
                        case 20: return [4 /*yield*/, this.prisma.client.projectEstimate.update({
                                where: { id: estimateId },
                                data: {
                                    annotationText: annotationText !== null && annotationText !== void 0 ? annotationText : undefined,
                                    businessPlanManifestId: manifestId !== null && manifestId !== void 0 ? manifestId : undefined,
                                },
                            })];
                        case 21:
                            updated = _f.sent();
                            return [4 /*yield*/, this.invoice.generateAndStoreBusinessPlanPdf(estimateId, businessPlanContent, paybackEstimate)];
                        case 22:
                            pdfUrl = _f.sent();
                            return [4 /*yield*/, this.prisma.client.projectEstimate.update({
                                    where: { id: estimateId },
                                    data: { businessPlanUrl: pdfUrl, generationStatus: 'COMPLETED' },
                                })];
                        case 23:
                            _f.sent();
                            if (!(updated.contactChannel === 'email' && updated.contactValue)) return [3 /*break*/, 25];
                            return [4 /*yield*/, this.email.send({
                                    to: updated.contactValue,
                                    subject: "\u0411\u0456\u0437\u043D\u0435\u0441-\u043F\u043B\u0430\u043D \u043F\u0440\u043E\u0454\u043A\u0442\u0443 Solar Shop \u2116".concat(estimateId.slice(-8).toUpperCase()),
                                    text: 'Ваш пакет документів готовий.',
                                    attachmentUrl: pdfUrl,
                                })];
                        case 24:
                            _f.sent();
                            return [3 /*break*/, 28];
                        case 25:
                            if (!(updated.contactChannel === 'telegram' && updated.userId)) return [3 /*break*/, 28];
                            return [4 /*yield*/, this.prisma.client.user.findUnique({ where: { id: updated.userId } })];
                        case 26:
                            user = _f.sent();
                            if (!user) return [3 /*break*/, 28];
                            return [4 /*yield*/, this.notify.sendDocumentToUser(user.telegramId, pdfUrl, "\u0411\u0456\u0437\u043D\u0435\u0441-\u043F\u043B\u0430\u043D \u043F\u0440\u043E\u0454\u043A\u0442\u0443 \u2116".concat(estimateId.slice(-8).toUpperCase()))];
                        case 27:
                            _f.sent();
                            _f.label = 28;
                        case 28: return [4 /*yield*/, this.notify.notifyCalculatorLead({
                                id: estimate.id,
                                city: estimate.city,
                                totalUsd: Number(estimate.totalUsd),
                                goals: estimate.goals,
                            })];
                        case 29:
                            _f.sent();
                            return [2 /*return*/];
                    }
                });
            });
        };
        // ТЗ п.31.12.2/31.12.5 — детерминированное разбиение на этапы, если
        // бюджет не покрывает целевую комплектацию целиком. Панели/АКБ (модульные
        // по природе) масштабируются пропорционально под бюджет для этапа 1,
        // контроллер (центральный компонент) остаётся полного размера сразу при
        // HEADROOM — под конечную целевую мощность, не только этап 1.
        BusinessPlanGenerationService_1.prototype.planPhases = function (fullSpec, budgetUsd, strategy) {
            var fullTotal = fullSpec.reduce(function (s, i) { return s + i.priceUsd * i.quantity; }, 0);
            if (fullTotal <= budgetUsd) {
                // Бюджет и так покрывает всё — этапы не нужны, один этап целиком
                return [
                    {
                        phaseNumber: 1,
                        title: 'Етап 1: повна комплектація',
                        description: 'Бюджет покриває цільову комплектацію повністю, розбивка на етапи не потрібна.',
                        specItems: fullSpec,
                        cumulativeTotalUsd: fullTotal,
                        timingNote: 'Одразу',
                    },
                ];
            }
            var controller = fullSpec.find(function (i) { return i.category === 'CONTROLLER'; });
            var scalable = fullSpec.filter(function (i) { return i.category !== 'CONTROLLER'; });
            var controllerCost = controller ? controller.priceUsd * controller.quantity : 0;
            var budgetForScalable = Math.max(0, budgetUsd - controllerCost);
            var scalableFullCost = scalable.reduce(function (s, i) { return s + i.priceUsd * i.quantity; }, 0);
            var scaleFactor = scalableFullCost > 0 ? Math.min(1, budgetForScalable / scalableFullCost) : 1;
            var phase1Items = __spreadArray(__spreadArray([], (controller ? [controller] : []), true), scalable.map(function (i) { return (__assign(__assign({}, i), { quantity: Math.max(1, Math.floor(i.quantity * scaleFactor)) })); }), true);
            var phase1Total = phase1Items.reduce(function (s, i) { return s + i.priceUsd * i.quantity; }, 0);
            var phase2Items = scalable
                .map(function (i) {
                var _a;
                var phase1Item = phase1Items.find(function (p1) { return p1.productId === i.productId; });
                var remaining = i.quantity - ((_a = phase1Item === null || phase1Item === void 0 ? void 0 : phase1Item.quantity) !== null && _a !== void 0 ? _a : 0);
                return remaining > 0 ? __assign(__assign({}, i), { quantity: remaining }) : null;
            })
                .filter(function (i) { return i !== null; });
            var strategyLabel = strategy === 'HEADROOM' ? 'із запасом по контролеру' : 'ідентичними сегментами';
            return [
                {
                    phaseNumber: 1,
                    title: 'Етап 1: базова система (в межах бюджету)',
                    description: "\u041A\u043E\u043C\u043F\u043E\u043D\u0435\u043D\u0442\u0438 \u0432 \u043C\u0435\u0436\u0430\u0445 \u043F\u043E\u0442\u043E\u0447\u043D\u043E\u0433\u043E \u0431\u044E\u0434\u0436\u0435\u0442\u0443, ".concat(strategyLabel, ". \u0414\u043E\u043A\u0443\u043F\u043A\u0430 \u043F\u0456\u0437\u043D\u0456\u0448\u0435 \u043D\u0435 \u0432\u0438\u043C\u0430\u0433\u0430\u0454 \u0437\u0430\u043C\u0456\u043D\u0438 \u0432\u0436\u0435 \u0432\u0441\u0442\u0430\u043D\u043E\u0432\u043B\u0435\u043D\u043E\u0433\u043E."),
                    specItems: phase1Items,
                    cumulativeTotalUsd: phase1Total,
                    timingNote: 'Зараз',
                },
                {
                    phaseNumber: 2,
                    title: 'Етап 2: розширення до цільової потужності',
                    description: 'Докупка панелей/акумуляторів до повної цільової комплектації — контролер вже має необхідний запас.',
                    specItems: phase2Items,
                    cumulativeTotalUsd: fullTotal,
                    timingNote: 'Через 3-6 місяців після Етапу 1 (орієнтовно)',
                },
            ];
        };
        BusinessPlanGenerationService_1.prototype.sumPanelsWatt = function (spec) {
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
        return BusinessPlanGenerationService_1;
    }());
    __setFunctionName(_classThis, "BusinessPlanGenerationService");
    (function () {
        var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        BusinessPlanGenerationService = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return BusinessPlanGenerationService = _classThis;
}();
exports.BusinessPlanGenerationService = BusinessPlanGenerationService;
