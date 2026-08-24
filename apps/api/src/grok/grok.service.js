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
exports.GrokService = void 0;
var common_1 = require("@nestjs/common");
var fetch_with_retry_1 = require("../common/fetch-with-retry");
// Тонкая обёртка над Grok API (ТЗ п.17) — по аналогии с использованием
// Grok в SilverFinance/Volia. Вызовы логируются (модель, токены — здесь
// упрощённо только факт вызова, полноценный учёт стоимости — задел на
// будущее) для контроля бюджета.
var GrokService = function () {
    var _classDecorators = [(0, common_1.Injectable)()];
    var _classDescriptor;
    var _classExtraInitializers = [];
    var _classThis;
    var GrokService = _classThis = /** @class */ (function () {
        function GrokService_1(config) {
            this.config = config;
            this.logger = new common_1.Logger(GrokService.name);
            this.apiUrl = 'https://api.x.ai/v1/chat/completions';
        }
        Object.defineProperty(GrokService_1.prototype, "apiKey", {
            get: function () {
                return this.config.get('GROK_API_KEY');
            },
            enumerable: false,
            configurable: true
        });
        // ТЗ п.17.1 — сопоставление siblings в серой зоне (0.5-0.85 confidence).
        // Строго structured output, без преамбулы.
        GrokService_1.prototype.matchListingToProduct = function (rawTitle, candidateProductName) {
            return __awaiter(this, void 0, void 0, function () {
                var prompt, result;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            prompt = "Two product listings from a solar-equipment marketplace. Determine if they describe the exact same physical product (same model, same power/capacity rating), ignoring packaging/description differences.\n\nListing A (raw title from parser): \"".concat(rawTitle, "\"\nListing B (canonical catalog name): \"").concat(candidateProductName, "\"\n\nRespond ONLY with JSON, no preamble: {\"isMatch\": boolean, \"confidence\": number (0-1), \"reasoning\": string}");
                            return [4 /*yield*/, this.chatJson(prompt)];
                        case 1:
                            result = _a.sent();
                            return [2 /*return*/, result !== null && result !== void 0 ? result : { isMatch: false, confidence: 0, reasoning: 'Grok unavailable' }];
                    }
                });
            });
        };
        // ТЗ п.26.3 — первичная генерация shortDescription/description для товаров
        // автосозданных парсером в DRAFT (не копировать формулировки источника дословно).
        GrokService_1.prototype.generateProductDescription = function (rawTitle, specs) {
            return __awaiter(this, void 0, void 0, function () {
                var prompt;
                return __generator(this, function (_a) {
                    prompt = "Write a product description for a solar-equipment e-commerce catalog, in Ukrainian. Do not copy any external source verbatim \u2014 write original wording. Do not invent specs not given below.\n\nProduct title: \"".concat(rawTitle, "\"\nKnown specs: ").concat(JSON.stringify(specs), "\n\nRespond ONLY with JSON: {\"shortDescription\": \"1-2 sentences\", \"description\": \"longer markdown description with use-case guidance\"}");
                    return [2 /*return*/, this.chatJson(prompt)];
                });
            });
        };
        // ТЗ п.17.2 — рерайт + перевод статей на целевые локали.
        GrokService_1.prototype.rewriteAndTranslateArticle = function (originalText, targetLocale) {
            return __awaiter(this, void 0, void 0, function () {
                var prompt;
                return __generator(this, function (_a) {
                    prompt = "Rewrite the following article about solar energy in your own words (do not copy verbatim, avoid copyright issues), keeping technical terms and units accurate, then present it in locale \"".concat(targetLocale, "\". Neutral expert tone, markdown formatting preserved, length at least as long as original.\n\nOriginal:\n").concat(originalText, "\n\nRespond ONLY with JSON: {\"title\": string, \"excerpt\": string, \"content\": string (markdown)}");
                    return [2 /*return*/, this.chatJson(prompt)];
                });
            });
        };
        // ТЗ п.31.4 — квиз/уточнение → структурированные ТЕХНИЧЕСКИЕ ТРЕБОВАНИЯ,
        // не названия товаров и не цены (backend резолвит их против каталога).
        GrokService_1.prototype.extractCalculatorRequirements = function (input) {
            return __awaiter(this, void 0, void 0, function () {
                var prompt;
                var _a, _b, _c;
                return __generator(this, function (_d) {
                    prompt = "You are a solar-equipment sizing assistant for a Ukrainian solar shop calculator. Based on the input below, propose TECHNICAL REQUIREMENTS only \u2014 never suggest specific products, brands, or prices, the backend will resolve requirements against a real catalog.\n\nCity: ".concat((_a = input.city) !== null && _a !== void 0 ? _a : 'not specified', "\nBudget (USD): ").concat((_b = input.budgetUsd) !== null && _b !== void 0 ? _b : 'not specified', "\nProject goals: ").concat(input.goals.join(', ') || 'not specified', "\nDaily consumption (kWh/day, if explicitly provided by user \u2014 most reliable signal): ").concat((_c = input.dailyConsumptionKwh) !== null && _c !== void 0 ? _c : 'NOT PROVIDED — estimate from goals+budget instead, and lower confidenceLevel accordingly', "\n").concat(input.refinementText ? "User's refinement request (iterate on top of previous requirements, keep full prior context in mind): \"".concat(input.refinementText, "\"") : '', "\n").concat(input.previousRequirements ? "Previous requirements (adjust based on refinement above, do not restart from scratch): ".concat(JSON.stringify(input.previousRequirements)) : '', "\n\nRespond ONLY with JSON: {\"panelsWattTarget\": number, \"batteryKwhTarget\": number, \"batteryChemistry\": \"LIFEPO4\"|\"GEL\"|\"AGM\"|null, \"controllerType\": \"PWM\"|\"MPPT\"|null, \"controllerMinAmps\": number, \"confidenceLevel\": \"high\"|\"medium\"|\"low\", \"reasoning\": string (Ukrainian, 1-2 sentences explaining the sizing logic)}");
                    return [2 /*return*/, this.chatJson(prompt)];
                });
            });
        };
        // ТЗ п.31.10.2 — аннотация на основе УЖЕ РЕЗОЛВЛЕННОГО recommendedSpec
        // (реальные товары/мощности/цены), не абстрактных данных.
        GrokService_1.prototype.generateProjectAnnotation = function (input) {
            return __awaiter(this, void 0, void 0, function () {
                var prompt, res, data, err_1;
                var _a, _b, _c, _d, _e;
                return __generator(this, function (_f) {
                    switch (_f.label) {
                        case 0:
                            prompt = "Write a project summary annotation in Ukrainian (markdown) for a solar-equipment project estimate, based ONLY on the already-resolved specification below \u2014 do not invent numbers beyond what's given.\n\nCity: ".concat((_a = input.city) !== null && _a !== void 0 ? _a : 'не вказано', "\nProject goals: ").concat(input.goals.join(', '), "\nSystem topology: ").concat(input.topology, "\nResolved specification: ").concat(input.specSummary, "\nTotal price (USD): ").concat(input.totalUsd, "\n").concat(input.annualKwhEstimate ? "Annual PV generation estimate (from PVGIS, real climatological data \u2014 cite it): ~".concat(Math.round(input.annualKwhEstimate), " kWh/year (\u0437\u0430 \u0434\u0430\u043D\u0438\u043C\u0438 PVGIS, \u041E\u0431'\u0454\u0434\u043D\u0430\u043D\u0438\u0439 \u0434\u043E\u0441\u043B\u0456\u0434\u043D\u0438\u0446\u044C\u043A\u0438\u0439 \u0446\u0435\u043D\u0442\u0440 \u0404\u0432\u0440\u043E\u043F\u0435\u0439\u0441\u044C\u043A\u043E\u0457 \u043A\u043E\u043C\u0456\u0441\u0456\u0457, \u0441\u0442\u0430\u043D\u0434\u0430\u0440\u0442\u043D\u0456 \u043F\u0440\u0438\u043F\u0443\u0449\u0435\u043D\u043D\u044F: \u043D\u0430\u0445\u0438\u043B 35\u00B0, \u043E\u0440\u0456\u0454\u043D\u0442\u0430\u0446\u0456\u044F \u043D\u0430 \u043F\u0456\u0432\u0434\u0435\u043D\u044C)") : '', "\n\nExplain: what this configuration is suited for (project goals), why this power/capacity was chosen, what's included and what's not (e.g. mounting/cabling separate if not in the estimate \u2014 note that an inverter is NOT part of this catalog and must be sourced separately), which topology this is built for. 3-5 short paragraphs.\n\nRespond ONLY with the markdown text, no JSON wrapper, no preamble.");
                            if (!this.apiKey) {
                                this.logger.warn('GROK_API_KEY not configured — skipping annotation generation');
                                return [2 /*return*/, null];
                            }
                            _f.label = 1;
                        case 1:
                            _f.trys.push([1, 4, , 5]);
                            return [4 /*yield*/, (0, fetch_with_retry_1.fetchWithRetry)(this.apiUrl, {
                                    method: 'POST',
                                    retries: 2,
                                    headers: { 'Content-Type': 'application/json', Authorization: "Bearer ".concat(this.apiKey) },
                                    body: JSON.stringify({ model: 'grok-4-fast', messages: [{ role: 'user', content: prompt }] }),
                                })];
                        case 2:
                            res = _f.sent();
                            if (!res.ok)
                                return [2 /*return*/, null];
                            return [4 /*yield*/, res.json()];
                        case 3:
                            data = (_f.sent());
                            return [2 /*return*/, (_e = (_d = (_c = (_b = data.choices[0]) === null || _b === void 0 ? void 0 : _b.message) === null || _c === void 0 ? void 0 : _c.content) === null || _d === void 0 ? void 0 : _d.trim()) !== null && _e !== void 0 ? _e : null];
                        case 4:
                            err_1 = _f.sent();
                            this.logger.error('Annotation generation failed', err_1);
                            return [2 /*return*/, null];
                        case 5: return [2 /*return*/];
                    }
                });
            });
        };
        // ТЗ п.31.1.2 — предложение новых ProjectGoal, с обязательным контекстом
        // текущего справочника (чтобы не предлагать дубли).
        GrokService_1.prototype.suggestProjectGoals = function (existingGoals, brief) {
            return __awaiter(this, void 0, void 0, function () {
                var prompt, result;
                var _a;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            prompt = "You maintain a reference list of \"project goals\" for a solar-equipment sizing calculator. Suggest 2-4 NEW goal candidates that do NOT duplicate or overlap in meaning with the existing list below.\n\nExisting active goals:\n".concat(JSON.stringify(existingGoals, null, 2), "\n\n").concat(brief ? "Admin's brief: \"".concat(brief, "\"") : 'No specific brief — propose goals you think are missing from the current coverage.', "\n\nRespond ONLY with JSON object: {\"candidates\": [{\"key\": \"LATIN_SNAKE_CASE_UNIQUE\", \"label\": \"Ukrainian checkbox text\", \"description\": \"Ukrainian explanation for admin/prompt context\", \"defaultTopology\": \"OFF_GRID\"|\"BACKUP_UPS\"|\"GRID_TIE\"|\"COMMERCIAL\"|null, \"reasoning\": \"why this doesn't duplicate existing goals\"}]}");
                            return [4 /*yield*/, this.chatJson(prompt)];
                        case 1:
                            result = _b.sent();
                            return [2 /*return*/, (_a = result === null || result === void 0 ? void 0 : result.candidates) !== null && _a !== void 0 ? _a : null];
                    }
                });
            });
        };
        // ТЗ п.31.10.1a — разовый ИИ-аудит готового SVG-шаблона схемы. Grok
        // получает СОДЕРЖИМОЕ шаблона (структуру, не рисует заново), проверяет
        // логическую последовательность — НЕ исправляет, только текстовый отчёт.
        GrokService_1.prototype.auditSchemaTemplate = function (svgContent, topology) {
            return __awaiter(this, void 0, void 0, function () {
                var prompt, res, data, err_2;
                var _a, _b, _c, _d;
                return __generator(this, function (_e) {
                    switch (_e.label) {
                        case 0:
                            prompt = "You are reviewing a fixed SVG diagram template for a solar power system topology \"".concat(topology, "\". Check the logical/electrical sequence for typical mistakes: correct order panels\u2192controller\u2192battery\u2192inverter\u2192load for this topology, no obviously reversed arrow directions, block count matches the topology. Do NOT redraw or suggest a replacement SVG \u2014 only report findings.\n\nSVG content:\n").concat(svgContent, "\n\nRespond in Ukrainian, plain text (not JSON): either a list of concerns, or a confirmation that no obvious problems were found. Be concise.");
                            if (!this.apiKey)
                                return [2 /*return*/, null];
                            _e.label = 1;
                        case 1:
                            _e.trys.push([1, 4, , 5]);
                            return [4 /*yield*/, (0, fetch_with_retry_1.fetchWithRetry)(this.apiUrl, {
                                    method: 'POST',
                                    retries: 2,
                                    headers: { 'Content-Type': 'application/json', Authorization: "Bearer ".concat(this.apiKey) },
                                    body: JSON.stringify({ model: 'grok-4-fast', messages: [{ role: 'user', content: prompt }] }),
                                })];
                        case 2:
                            res = _e.sent();
                            if (!res.ok)
                                return [2 /*return*/, null];
                            return [4 /*yield*/, res.json()];
                        case 3:
                            data = (_e.sent());
                            return [2 /*return*/, (_d = (_c = (_b = (_a = data.choices[0]) === null || _a === void 0 ? void 0 : _a.message) === null || _b === void 0 ? void 0 : _b.content) === null || _c === void 0 ? void 0 : _c.trim()) !== null && _d !== void 0 ? _d : null];
                        case 4:
                            err_2 = _e.sent();
                            this.logger.error('Schema audit failed', err_2);
                            return [2 /*return*/, null];
                        case 5: return [2 /*return*/];
                    }
                });
            });
        };
        // ТЗ п.31.11.6 — предложить границы SMALL/MEDIUM/LARGE по агрегатам
        // каталога (перцентили/кластеры мощности), backend уже всё посчитал —
        // Grok только интерпретирует и обосновывает, не придумывает цифры с нуля.
        GrokService_1.prototype.suggestPowerRangeThresholds = function (stats) {
            return __awaiter(this, void 0, void 0, function () {
                var prompt;
                return __generator(this, function (_a) {
                    prompt = "You size solar-panel systems for a Ukrainian shop. Based on the aggregated statistics below (percentiles and natural clusters of total panel wattage across the published catalog), propose three human-understandable power boundaries in Watts: SMALL/MEDIUM boundary, MEDIUM/LARGE boundary, LARGE/COMMERCIAL boundary (open-ended above).\n\nStatistics: ".concat(JSON.stringify(stats), "\n\nRespond ONLY with JSON: {\"small\": number (\u0412\u0442, \u0432\u0435\u0440\u0445\u043D\u044F \u043C\u0435\u0436\u0430 SMALL), \"medium\": number (\u0432\u0435\u0440\u0445\u043D\u044F \u043C\u0435\u0436\u0430 MEDIUM), \"large\": number (\u0432\u0435\u0440\u0445\u043D\u044F \u043C\u0435\u0436\u0430 LARGE), \"reasoning\": string (Ukrainian, explain the natural breaks you used)}");
                    return [2 /*return*/, this.chatJson(prompt)];
                });
            });
        };
        // ТЗ п.31.12.6 — порог "незначительной переплаты" для HEADROOM-стратегии,
        // по реальным ценовым шагам между соседними моделями каталога.
        GrokService_1.prototype.suggestScalingThreshold = function (category, priceSteps) {
            return __awaiter(this, void 0, void 0, function () {
                var prompt;
                return __generator(this, function (_a) {
                    prompt = "You help decide when it's worth buying a slightly more powerful component \"with headroom\" for future expansion, vs a cheaper exact-fit one. Below are real percentage price differences between adjacent models (sorted by power/current rating) in category \"".concat(category, "\" of a solar-equipment catalog.\n\nPrice step percentages: ").concat(JSON.stringify(priceSteps), "\n\nPropose a threshold percentage: price steps below it are \"worth it\" (small enough overpay to justify future-proofing), above it are \"not worth it\" (jump too expensive).\n\nRespond ONLY with JSON: {\"thresholdPercent\": number, \"reasoning\": string (Ukrainian, 1-2 sentences)}");
                    return [2 /*return*/, this.chatJson(prompt)];
                });
            });
        };
        // ТЗ п.32.1 — Grok с веб-поиском ищет кандидатов программ кредитования по
        // темам-затравкам, НЕ публикует их сам (только структурированные поля,
        // upsert со status: DRAFT делает backend). Тот же принцип, что и везде:
        // финансовая информация с ошибкой — риск ввести человека в заблуждение,
        // поэтому даже находки ИИ идут в модерацию, не публикуются напрямую.
        GrokService_1.prototype.searchFinancingPrograms = function (seedTopics) {
            return __awaiter(this, void 0, void 0, function () {
                var prompt, res, data, raw, parsed, err_3;
                var _a, _b, _c;
                return __generator(this, function (_d) {
                    switch (_d.label) {
                        case 0:
                            prompt = "Search the web for Ukrainian solar-equipment financing/lending/grant programs (bank loans, government programs, energy-efficiency funds). Use these seed topics as starting points: ".concat(seedTopics.join(', '), ".\n\nFor each distinct program you find, extract structured fields. Do not invent programs or numbers \u2014 only report what you find via search, and prefer official sources (bank websites, government program pages) over aggregators.\n\nRespond ONLY with JSON object: {\"programs\": [{\"name\": string, \"eligibility\": string (Ukrainian: \"\u0444\u0456\u0437\u0438\u0447\u043D\u0456 \u043E\u0441\u043E\u0431\u0438\"/\"\u041E\u0421\u0411\u0411/\u0416\u0411\u041A\"/\"\u0431\u0456\u0437\u043D\u0435\u0441\" or combination), \"description\": string (Ukrainian, brief), \"url\": string (official program page), \"discoverySourceUrl\": string|null (if found via a secondary source, not the official page itself), \"minLoanUsd\": number|null, \"maxLoanUsd\": number|null}]}");
                            if (!this.apiKey) {
                                this.logger.warn('GROK_API_KEY not configured — skipping financing program search');
                                return [2 /*return*/, null];
                            }
                            _d.label = 1;
                        case 1:
                            _d.trys.push([1, 4, , 5]);
                            return [4 /*yield*/, (0, fetch_with_retry_1.fetchWithRetry)(this.apiUrl, {
                                    method: 'POST',
                                    retries: 2,
                                    headers: { 'Content-Type': 'application/json', Authorization: "Bearer ".concat(this.apiKey) },
                                    body: JSON.stringify({
                                        model: 'grok-4-fast',
                                        messages: [{ role: 'user', content: prompt }],
                                        response_format: { type: 'json_object' },
                                        search_parameters: { mode: 'on' },
                                    }),
                                })];
                        case 2:
                            res = _d.sent();
                            if (!res.ok) {
                                this.logger.error("Grok API error ".concat(res.status));
                                return [2 /*return*/, null];
                            }
                            return [4 /*yield*/, res.json()];
                        case 3:
                            data = (_d.sent());
                            raw = (_c = (_b = (_a = data.choices[0]) === null || _a === void 0 ? void 0 : _a.message) === null || _b === void 0 ? void 0 : _b.content) !== null && _c !== void 0 ? _c : '{}';
                            parsed = JSON.parse(raw.replace(/```json|```/g, '').trim());
                            return [2 /*return*/, parsed.programs];
                        case 4:
                            err_3 = _d.sent();
                            this.logger.error('Financing program search failed', err_3);
                            return [2 /*return*/, null];
                        case 5: return [2 /*return*/];
                    }
                });
            });
        };
        // ТЗ п.31.11.4 — генерация черновика манифеста бизнес-плана под конкретную
        // комбинацию тегов (цели+диапазон мощности) + свободный бриф админа.
        GrokService_1.prototype.generateBusinessPlanManifest = function (input) {
            return __awaiter(this, void 0, void 0, function () {
                var prompt, res, data, err_4;
                var _a, _b, _c, _d, _e;
                return __generator(this, function (_f) {
                    switch (_f.label) {
                        case 0:
                            prompt = "Draft a business-plan document manifest (structure of sections + boilerplate text + instructions for an LLM that will later fill in the text parts) for a solar-equipment loan application business plan, in Ukrainian, markdown format.\n\nTarget project goals: ".concat(input.goalTags.join(', ') || 'universal / any goals', "\nTarget power range: ").concat((_a = input.powerRangeTag) !== null && _a !== void 0 ? _a : 'universal / any size', "\n").concat(input.brief ? "Admin's brief: \"".concat(input.brief, "\"") : '', "\n\nThe manifest should define: document sections (e.g. \"\u0420\u0435\u0437\u044E\u043C\u0435 \u043F\u0440\u043E\u0454\u043A\u0442\u0443\", \"\u0422\u0435\u0445\u043D\u0456\u0447\u043D\u0438\u0439 \u043E\u043F\u0438\u0441 \u0441\u0438\u0441\u0442\u0435\u043C\u0438\", \"\u041A\u043E\u0448\u0442\u043E\u0440\u0438\u0441\", \"\u041F\u0440\u043E\u0433\u043D\u043E\u0437 \u043E\u043A\u0443\u043F\u043D\u043E\u0441\u0442\u0456\", \"\u0420\u0435\u043A\u043E\u043C\u0435\u043D\u0434\u0430\u0446\u0456\u0457 \u0449\u043E\u0434\u043E \u043A\u0440\u0435\u0434\u0438\u0442\u0443\u0432\u0430\u043D\u043D\u044F\"), boilerplate disclaimers, and instructions for how an LLM should fill each text section using already-resolved project data (never invent numbers).\n\nRespond with the manifest content as markdown text only, no JSON wrapper, no preamble.");
                            if (!this.apiKey)
                                return [2 /*return*/, null];
                            _f.label = 1;
                        case 1:
                            _f.trys.push([1, 4, , 5]);
                            return [4 /*yield*/, (0, fetch_with_retry_1.fetchWithRetry)(this.apiUrl, {
                                    method: 'POST',
                                    retries: 2,
                                    headers: { 'Content-Type': 'application/json', Authorization: "Bearer ".concat(this.apiKey) },
                                    body: JSON.stringify({ model: 'grok-4-fast', messages: [{ role: 'user', content: prompt }] }),
                                })];
                        case 2:
                            res = _f.sent();
                            if (!res.ok)
                                return [2 /*return*/, null];
                            return [4 /*yield*/, res.json()];
                        case 3:
                            data = (_f.sent());
                            return [2 /*return*/, (_e = (_d = (_c = (_b = data.choices[0]) === null || _b === void 0 ? void 0 : _b.message) === null || _c === void 0 ? void 0 : _c.content) === null || _d === void 0 ? void 0 : _d.trim()) !== null && _e !== void 0 ? _e : null];
                        case 4:
                            err_4 = _f.sent();
                            this.logger.error('Manifest generation failed', err_4);
                            return [2 /*return*/, null];
                        case 5: return [2 /*return*/];
                    }
                });
            });
        };
        // ТЗ п.31.11.1 — заполнение текстовых секций бизнес-плана по манифесту +
        // уже резолвленным данным проекта (тот же принцип: не придумывать цифры).
        GrokService_1.prototype.fillBusinessPlanContent = function (input) {
            return __awaiter(this, void 0, void 0, function () {
                var prompt, res, data, err_5;
                var _a, _b, _c, _d;
                return __generator(this, function (_e) {
                    switch (_e.label) {
                        case 0:
                            prompt = "Using the manifest below as the structural guide (sections, boilerplate, instructions), write the actual business-plan document text for THIS specific project, in Ukrainian, markdown. Use ONLY the resolved project data given \u2014 never invent numbers, prices, or facts beyond what's provided.\n\nManifest (structure/instructions):\n".concat(input.manifestContent, "\n\nResolved project data:\n").concat(input.projectSummary, "\n\nRespond with the filled-in markdown document only, no JSON wrapper.");
                            if (!this.apiKey)
                                return [2 /*return*/, null];
                            _e.label = 1;
                        case 1:
                            _e.trys.push([1, 4, , 5]);
                            return [4 /*yield*/, (0, fetch_with_retry_1.fetchWithRetry)(this.apiUrl, {
                                    method: 'POST',
                                    retries: 2,
                                    headers: { 'Content-Type': 'application/json', Authorization: "Bearer ".concat(this.apiKey) },
                                    body: JSON.stringify({ model: 'grok-4-fast', messages: [{ role: 'user', content: prompt }] }),
                                })];
                        case 2:
                            res = _e.sent();
                            if (!res.ok)
                                return [2 /*return*/, null];
                            return [4 /*yield*/, res.json()];
                        case 3:
                            data = (_e.sent());
                            return [2 /*return*/, (_d = (_c = (_b = (_a = data.choices[0]) === null || _a === void 0 ? void 0 : _a.message) === null || _b === void 0 ? void 0 : _b.content) === null || _c === void 0 ? void 0 : _c.trim()) !== null && _d !== void 0 ? _d : null];
                        case 4:
                            err_5 = _e.sent();
                            this.logger.error('Business plan content fill failed', err_5);
                            return [2 /*return*/, null];
                        case 5: return [2 /*return*/];
                    }
                });
            });
        };
        GrokService_1.prototype.chatJson = function (prompt) {
            return __awaiter(this, void 0, void 0, function () {
                var res, data, raw, err_6;
                var _a, _b, _c;
                return __generator(this, function (_d) {
                    switch (_d.label) {
                        case 0:
                            if (!this.apiKey) {
                                this.logger.warn('GROK_API_KEY not configured — skipping Grok call');
                                return [2 /*return*/, null];
                            }
                            _d.label = 1;
                        case 1:
                            _d.trys.push([1, 4, , 5]);
                            return [4 /*yield*/, (0, fetch_with_retry_1.fetchWithRetry)(this.apiUrl, {
                                    method: 'POST',
                                    retries: 2,
                                    headers: { 'Content-Type': 'application/json', Authorization: "Bearer ".concat(this.apiKey) },
                                    body: JSON.stringify({
                                        model: 'grok-4-fast',
                                        messages: [{ role: 'user', content: prompt }],
                                        response_format: { type: 'json_object' },
                                    }),
                                })];
                        case 2:
                            res = _d.sent();
                            if (!res.ok) {
                                this.logger.error("Grok API error ".concat(res.status));
                                return [2 /*return*/, null];
                            }
                            return [4 /*yield*/, res.json()];
                        case 3:
                            data = (_d.sent());
                            raw = (_c = (_b = (_a = data.choices[0]) === null || _a === void 0 ? void 0 : _a.message) === null || _b === void 0 ? void 0 : _b.content) !== null && _c !== void 0 ? _c : '{}';
                            return [2 /*return*/, JSON.parse(raw.replace(/```json|```/g, '').trim())];
                        case 4:
                            err_6 = _d.sent();
                            this.logger.error('Grok call failed', err_6);
                            return [2 /*return*/, null];
                        case 5: return [2 /*return*/];
                    }
                });
            });
        };
        return GrokService_1;
    }());
    __setFunctionName(_classThis, "GrokService");
    (function () {
        var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        GrokService = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return GrokService = _classThis;
}();
exports.GrokService = GrokService;
