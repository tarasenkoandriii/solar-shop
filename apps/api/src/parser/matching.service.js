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
exports.MatchingService = void 0;
var common_1 = require("@nestjs/common");
var db_1 = require("@solar-shop/db");
var MatchingService = function () {
    var _classDecorators = [(0, common_1.Injectable)()];
    var _classDescriptor;
    var _classExtraInitializers = [];
    var _classThis;
    var MatchingService = _classThis = /** @class */ (function () {
        function MatchingService_1(prisma, grok, pricing) {
            this.prisma = prisma;
            this.grok = grok;
            this.pricing = pricing;
            this.logger = new common_1.Logger(MatchingService.name);
        }
        // Точка входа пайплайна парсера (ТЗ п.13.2, шаги 3-5) — вызывается для
        // каждого нового/изменившегося SourceListing после upsert'а.
        MatchingService_1.prototype.matchListing = function (sourceListingId) {
            return __awaiter(this, void 0, void 0, function () {
                var listing, existingLink, extractedSpecs, skuCandidate, category, skuMatch, rejected, rejectedIds, candidates, best, _i, candidates_1, candidate, candidateSpecs, confidence, grokResult;
                var _this = this;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.prisma.client.sourceListing.findUniqueOrThrow({
                                where: { id: sourceListingId },
                            })];
                        case 1:
                            listing = _a.sent();
                            return [4 /*yield*/, this.prisma.client.productListing.findFirst({ where: { sourceListingId: sourceListingId } })];
                        case 2:
                            existingLink = _a.sent();
                            if (existingLink)
                                return [2 /*return*/];
                            extractedSpecs = (0, db_1.extractSpecsFromTitle)(listing.rawTitle);
                            skuCandidate = (0, db_1.extractManufacturerSkuCandidate)(listing.rawTitle);
                            category = listing.rawCategory;
                            if (!skuCandidate) return [3 /*break*/, 5];
                            return [4 /*yield*/, this.prisma.client.product.findFirst({
                                    where: __assign({ manufacturerSku: skuCandidate }, (category ? { category: category } : {})),
                                })];
                        case 3:
                            skuMatch = _a.sent();
                            if (!skuMatch) return [3 /*break*/, 5];
                            return [4 /*yield*/, this.linkListing(listing.id, skuMatch.id, db_1.MatchType.SKU_EXACT, 1)];
                        case 4:
                            _a.sent();
                            return [2 /*return*/];
                        case 5: return [4 /*yield*/, this.prisma.client.rejectedMatch.findMany({
                                where: { sourceListingId: listing.id },
                                select: { productId: true },
                            })];
                        case 6:
                            rejected = _a.sent();
                            rejectedIds = new Set(rejected.map(function (r) { return r.productId; }));
                            return [4 /*yield*/, this.prisma.client.product.findMany({
                                    where: __assign({ status: db_1.ProductStatus.PUBLISHED }, (category ? { category: category } : {})),
                                })];
                        case 7:
                            candidates = _a.sent();
                            best = null;
                            for (_i = 0, candidates_1 = candidates; _i < candidates_1.length; _i++) {
                                candidate = candidates_1[_i];
                                if (rejectedIds.has(candidate.id))
                                    continue;
                                candidateSpecs = (0, db_1.extractSpecsFromTitle)(candidate.name);
                                if (!(0, db_1.specsCompatible)(extractedSpecs, candidateSpecs))
                                    continue;
                                confidence = (0, db_1.titleSimilarity)(listing.rawTitle, candidate.name);
                                if (!best || confidence > best.confidence) {
                                    best = { productId: candidate.id, productName: candidate.name, confidence: confidence };
                                }
                            }
                            if (!(best && best.confidence >= db_1.MATCH_AUTO_THRESHOLD)) return [3 /*break*/, 9];
                            return [4 /*yield*/, this.linkListing(listing.id, best.productId, db_1.MatchType.FUZZY_NAME, best.confidence)];
                        case 8:
                            _a.sent();
                            return [2 /*return*/];
                        case 9:
                            if (!(best && best.confidence >= db_1.MATCH_GREY_ZONE_MIN)) return [3 /*break*/, 13];
                            return [4 /*yield*/, this.grok.matchListingToProduct(listing.rawTitle, best.productName).catch(function (err) {
                                    _this.logger.warn("Grok match check failed, falling back to manual queue: ".concat(err));
                                    return null;
                                })];
                        case 10:
                            grokResult = _a.sent();
                            if (!((grokResult === null || grokResult === void 0 ? void 0 : grokResult.isMatch) && grokResult.confidence >= db_1.MATCH_AUTO_THRESHOLD)) return [3 /*break*/, 12];
                            return [4 /*yield*/, this.linkListing(listing.id, best.productId, db_1.MatchType.GROK_LLM, grokResult.confidence)];
                        case 11:
                            _a.sent();
                            return [2 /*return*/];
                        case 12: 
                        // Иначе остаётся неcвязанным — попадёт в очередь модерации
                        // (SiblingsService.getCandidates), reasoning от Grok не сохраняем
                        // отдельным полем в Фазе 2 (упрощение), только конфиденс уже виден в UI.
                        return [2 /*return*/];
                        case 13: 
                        // 3. Совпадения не найдено вообще — новый Product в DRAFT (ТЗ п.13.2, шаг 5)
                        return [4 /*yield*/, this.createDraftProductFromListing(listing.id, listing.rawTitle, category, extractedSpecs, skuCandidate)];
                        case 14:
                            // 3. Совпадения не найдено вообще — новый Product в DRAFT (ТЗ п.13.2, шаг 5)
                            _a.sent();
                            return [2 /*return*/];
                    }
                });
            });
        };
        MatchingService_1.prototype.linkListing = function (sourceListingId, productId, matchType, confidence) {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.prisma.client.productListing.create({
                                data: { sourceListingId: sourceListingId, productId: productId, matchType: matchType, matchConfidence: confidence },
                            })];
                        case 1:
                            _a.sent();
                            return [4 /*yield*/, this.pricing.recalculate(productId)];
                        case 2:
                            _a.sent();
                            return [2 /*return*/];
                    }
                });
            });
        };
        MatchingService_1.prototype.createDraftProductFromListing = function (sourceListingId, rawTitle, category, specs, manufacturerSku) {
            return __awaiter(this, void 0, void 0, function () {
                var prefix, seq, articleNumber, slug, product;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            if (!category)
                                return [2 /*return*/]; // без категории не можем сгенерировать articleNumber — остаётся в очереди
                            prefix = { SOLAR_PANEL: 'SP', BATTERY: 'BAT', CONTROLLER: 'CTRL' }[category];
                            return [4 /*yield*/, this.prisma.client.articleNumberSequence.upsert({
                                    where: { category: category },
                                    create: { category: category, lastSeq: 1 },
                                    update: { lastSeq: { increment: 1 } },
                                })];
                        case 1:
                            seq = _a.sent();
                            articleNumber = "".concat(prefix, "-").concat(String(seq.lastSeq).padStart(6, '0'));
                            slug = "".concat(rawTitle
                                .toLowerCase()
                                .normalize('NFKD')
                                .replace(/[\u0300-\u036f]/g, '')
                                .replace(/[^a-z0-9]+/g, '-')
                                .replace(/(^-|-$)/g, ''), "-").concat(articleNumber.toLowerCase());
                            return [4 /*yield*/, this.prisma.client.product.create({
                                    data: {
                                        slug: slug,
                                        articleNumber: articleNumber,
                                        category: category,
                                        name: rawTitle,
                                        manufacturerSku: manufacturerSku !== null && manufacturerSku !== void 0 ? manufacturerSku : undefined,
                                        shortDescription: '', // заполняется Grok-генерацией (см. GrokService.generateProductDescription) или вручную при модерации
                                        description: '',
                                        specs: specs,
                                        status: db_1.ProductStatus.DRAFT, // ждёт модерации в админке
                                    },
                                })];
                        case 2:
                            product = _a.sent();
                            return [4 /*yield*/, this.linkListing(sourceListingId, product.id, db_1.MatchType.MANUAL, 1)];
                        case 3:
                            _a.sent();
                            return [2 /*return*/];
                    }
                });
            });
        };
        return MatchingService_1;
    }());
    __setFunctionName(_classThis, "MatchingService");
    (function () {
        var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        MatchingService = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return MatchingService = _classThis;
}();
exports.MatchingService = MatchingService;
