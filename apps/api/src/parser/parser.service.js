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
exports.ParserService = void 0;
var common_1 = require("@nestjs/common");
var ParserService = function () {
    var _classDecorators = [(0, common_1.Injectable)()];
    var _classDescriptor;
    var _classExtraInitializers = [];
    var _classThis;
    var ParserService = _classThis = /** @class */ (function () {
        function ParserService_1(prisma, registry, matching, pricing) {
            this.prisma = prisma;
            this.registry = registry;
            this.matching = matching;
            this.pricing = pricing;
            this.logger = new common_1.Logger(ParserService.name);
        }
        // Крон-джоб product_parser (ТЗ п.27.1) — обходит все активные Vendor,
        // у которых есть зарегистрированный адаптер.
        ParserService_1.prototype.runAll = function () {
            return __awaiter(this, void 0, void 0, function () {
                var vendors, results, _i, vendors_1, vendor, adapter, _a, _b, _c, _d, err_1;
                return __generator(this, function (_e) {
                    switch (_e.label) {
                        case 0: return [4 /*yield*/, this.prisma.client.vendor.findMany({ where: { isActive: true } })];
                        case 1:
                            vendors = _e.sent();
                            results = [];
                            _i = 0, vendors_1 = vendors;
                            _e.label = 2;
                        case 2:
                            if (!(_i < vendors_1.length)) return [3 /*break*/, 8];
                            vendor = vendors_1[_i];
                            adapter = this.registry.getByVendorName(vendor.name);
                            if (!adapter)
                                return [3 /*break*/, 7]; // поставщик заведён в БД, но адаптер ещё не реализован — пропускаем, не роняем весь прогон
                            _e.label = 3;
                        case 3:
                            _e.trys.push([3, 6, , 7]);
                            _b = (_a = results).push;
                            _c = this.runForVendor;
                            _d = [vendor.id, adapter.vendorName];
                            return [4 /*yield*/, adapter.fetchListings()];
                        case 4: return [4 /*yield*/, _c.apply(this, _d.concat([_e.sent()]))];
                        case 5:
                            _b.apply(_a, [_e.sent()]);
                            return [3 /*break*/, 7];
                        case 6:
                            err_1 = _e.sent();
                            this.logger.error("Adapter ".concat(vendor.name, " failed"), err_1);
                            results.push({
                                vendorName: vendor.name,
                                fetched: 0,
                                created: 0,
                                updated: 0,
                                priceChanged: 0,
                                stockChanged: 0,
                                matchAttempted: 0,
                                error: err_1 instanceof Error ? err_1.message : String(err_1),
                            });
                            return [3 /*break*/, 7];
                        case 7:
                            _i++;
                            return [3 /*break*/, 2];
                        case 8: return [2 /*return*/, results];
                    }
                });
            });
        };
        ParserService_1.prototype.runForVendor = function (vendorId, vendorName, rawListings) {
            return __awaiter(this, void 0, void 0, function () {
                var created, updated, priceChanged, stockChanged, matchAttempted, _i, rawListings_1, raw, existing, now, rate, priceUsd, listing, priceHasChanged, stockHasChanged, link;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            created = 0;
                            updated = 0;
                            priceChanged = 0;
                            stockChanged = 0;
                            matchAttempted = 0;
                            _i = 0, rawListings_1 = rawListings;
                            _a.label = 1;
                        case 1:
                            if (!(_i < rawListings_1.length)) return [3 /*break*/, 16];
                            raw = rawListings_1[_i];
                            return [4 /*yield*/, this.prisma.client.sourceListing.findUnique({
                                    where: { vendorId_sourceUrl: { vendorId: vendorId, sourceUrl: raw.sourceUrl } },
                                })];
                        case 2:
                            existing = _a.sent();
                            now = new Date();
                            return [4 /*yield*/, this.prisma.client.exchangeRate.findFirst({
                                    where: { currency: raw.rawCurrency === 'UAH' ? 'USD' : raw.rawCurrency },
                                    orderBy: { rateDate: 'desc' },
                                })];
                        case 3:
                            rate = _a.sent();
                            priceUsd = rate ? raw.rawPrice / Number(rate.rateUah) : raw.rawPrice;
                            if (!!existing) return [3 /*break*/, 7];
                            return [4 /*yield*/, this.prisma.client.sourceListing.create({
                                    data: {
                                        vendorId: vendorId,
                                        sourceUrl: raw.sourceUrl,
                                        sourceSku: raw.sourceSku,
                                        rawTitle: raw.rawTitle,
                                        rawCategory: raw.rawCategory,
                                        rawPrice: raw.rawPrice,
                                        rawCurrency: raw.rawCurrency,
                                        priceUsd: priceUsd,
                                        priceRateDate: rate === null || rate === void 0 ? void 0 : rate.rateDate,
                                        priceCheckedAt: now,
                                        priceChangedAt: now,
                                        inStock: raw.inStock,
                                        stockCheckedAt: now,
                                        stockChangedAt: now,
                                        images: raw.images,
                                        firstSeenAt: now,
                                        lastParsedAt: now,
                                    },
                                })];
                        case 4:
                            listing = _a.sent();
                            return [4 /*yield*/, this.prisma.client.priceHistoryEntry.create({
                                    data: { sourceListingId: listing.id, priceUsd: priceUsd, inStock: raw.inStock },
                                })];
                        case 5:
                            _a.sent();
                            created++;
                            return [4 /*yield*/, this.matching.matchListing(listing.id)];
                        case 6:
                            _a.sent();
                            matchAttempted++;
                            return [3 /*break*/, 15];
                        case 7:
                            priceHasChanged = Number(existing.priceUsd) !== priceUsd;
                            stockHasChanged = existing.inStock !== raw.inStock;
                            return [4 /*yield*/, this.prisma.client.sourceListing.update({
                                    where: { id: existing.id },
                                    data: {
                                        rawTitle: raw.rawTitle,
                                        rawPrice: raw.rawPrice,
                                        priceUsd: priceUsd,
                                        priceRateDate: rate === null || rate === void 0 ? void 0 : rate.rateDate,
                                        priceCheckedAt: now,
                                        priceChangedAt: priceHasChanged ? now : undefined,
                                        inStock: raw.inStock,
                                        stockCheckedAt: now,
                                        stockChangedAt: stockHasChanged ? now : undefined,
                                        images: raw.images,
                                        lastParsedAt: now,
                                    },
                                })];
                        case 8:
                            _a.sent();
                            if (!(priceHasChanged || stockHasChanged)) return [3 /*break*/, 14];
                            return [4 /*yield*/, this.prisma.client.priceHistoryEntry.create({
                                    data: { sourceListingId: existing.id, priceUsd: priceUsd, inStock: raw.inStock },
                                })];
                        case 9:
                            _a.sent();
                            priceChanged += priceHasChanged ? 1 : 0;
                            stockChanged += stockHasChanged ? 1 : 0;
                            return [4 /*yield*/, this.prisma.client.productListing.findFirst({ where: { sourceListingId: existing.id } })];
                        case 10:
                            link = _a.sent();
                            if (!link) return [3 /*break*/, 12];
                            // Листинг уже привязан к канону — просто пересчитать кэш цены/
                            // наличия товара (matching.matchListing() тут не нужен, он для
                            // ещё непривязанных листингов).
                            return [4 /*yield*/, this.pricing.recalculate(link.productId)];
                        case 11:
                            // Листинг уже привязан к канону — просто пересчитать кэш цены/
                            // наличия товара (matching.matchListing() тут не нужен, он для
                            // ещё непривязанных листингов).
                            _a.sent();
                            return [3 /*break*/, 14];
                        case 12: return [4 /*yield*/, this.matching.matchListing(existing.id)];
                        case 13:
                            _a.sent();
                            _a.label = 14;
                        case 14:
                            updated++;
                            _a.label = 15;
                        case 15:
                            _i++;
                            return [3 /*break*/, 1];
                        case 16: return [2 /*return*/, { vendorName: vendorName, fetched: rawListings.length, created: created, updated: updated, priceChanged: priceChanged, stockChanged: stockChanged, matchAttempted: matchAttempted }];
                    }
                });
            });
        };
        return ParserService_1;
    }());
    __setFunctionName(_classThis, "ParserService");
    (function () {
        var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        ParserService = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return ParserService = _classThis;
}();
exports.ParserService = ParserService;
