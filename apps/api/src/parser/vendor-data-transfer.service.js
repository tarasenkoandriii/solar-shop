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
exports.VendorDataTransferService = void 0;
var common_1 = require("@nestjs/common");
var VendorDataTransferService = function () {
    var _classDecorators = [(0, common_1.Injectable)()];
    var _classDescriptor;
    var _classExtraInitializers = [];
    var _classThis;
    var VendorDataTransferService = _classThis = /** @class */ (function () {
        function VendorDataTransferService_1(prisma, pricing) {
            this.prisma = prisma;
            this.pricing = pricing;
            this.logger = new common_1.Logger(VendorDataTransferService.name);
        }
        VendorDataTransferService_1.prototype.exportVendor = function (vendorId) {
            return __awaiter(this, void 0, void 0, function () {
                var vendor, listings;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.prisma.client.vendor.findUnique({
                                where: { id: vendorId },
                                include: {
                                    listings: {
                                        include: { products: { include: { product: true } } },
                                    },
                                },
                            })];
                        case 1:
                            vendor = _a.sent();
                            if (!vendor)
                                throw new common_1.NotFoundException('Vendor not found');
                            listings = vendor.listings.map(function (l) {
                                var _a, _b;
                                return ({
                                    sourceUrl: l.sourceUrl,
                                    sourceSku: l.sourceSku,
                                    rawTitle: l.rawTitle,
                                    rawCategory: l.rawCategory,
                                    rawPrice: l.rawPrice.toString(),
                                    rawCurrency: l.rawCurrency,
                                    priceUsd: l.priceUsd.toString(),
                                    priceRateDate: (_b = (_a = l.priceRateDate) === null || _a === void 0 ? void 0 : _a.toISOString()) !== null && _b !== void 0 ? _b : null,
                                    inStock: l.inStock,
                                    images: l.images,
                                    affiliateUrl: l.affiliateUrl,
                                    isPromo: l.isPromo,
                                    discountPercent: l.discountPercent,
                                    firstSeenAt: l.firstSeenAt.toISOString(),
                                    lastParsedAt: l.lastParsedAt.toISOString(),
                                    productLinks: l.products.map(function (pl) { return ({
                                        articleNumber: pl.product.articleNumber,
                                        matchType: pl.matchType,
                                        matchConfidence: pl.matchConfidence,
                                        isPrimary: pl.isPrimary,
                                    }); }),
                                });
                            });
                            return [2 /*return*/, {
                                    formatVersion: 1,
                                    exportedAt: new Date().toISOString(),
                                    vendor: {
                                        name: vendor.name,
                                        website: vendor.website,
                                        warehouseCities: vendor.warehouseCities,
                                    },
                                    listings: listings,
                                }];
                    }
                });
            });
        };
        VendorDataTransferService_1.prototype.importVendorData = function (payload) {
            return __awaiter(this, void 0, void 0, function () {
                var data, result, existingVendor, vendor, _a, productsToRecalculate, _i, _b, listing, existingListing, listingData, savedListing, _c, _d, _e, link, product, existingLink, err_1, message, _loop_1, this_1, _f, productsToRecalculate_1, productId;
                var _g, _h, _j, _k, _l, _m;
                return __generator(this, function (_o) {
                    switch (_o.label) {
                        case 0:
                            data = this.validatePayload(payload);
                            result = {
                                vendorName: data.vendor.name,
                                vendorCreated: false,
                                listingsProcessed: 0,
                                listingsCreated: 0,
                                listingsUpdated: 0,
                                productLinksCreated: 0,
                                productLinksUpdated: 0,
                                productLinksSkipped: [],
                                errors: [],
                            };
                            return [4 /*yield*/, this.prisma.client.vendor.findUnique({ where: { name: data.vendor.name } })];
                        case 1:
                            existingVendor = _o.sent();
                            if (!existingVendor) return [3 /*break*/, 3];
                            return [4 /*yield*/, this.prisma.client.vendor.update({
                                    where: { id: existingVendor.id },
                                    data: { website: data.vendor.website, warehouseCities: data.vendor.warehouseCities },
                                })];
                        case 2:
                            _a = _o.sent();
                            return [3 /*break*/, 5];
                        case 3: return [4 /*yield*/, this.prisma.client.vendor.create({
                                data: {
                                    name: data.vendor.name,
                                    website: data.vendor.website,
                                    warehouseCities: data.vendor.warehouseCities,
                                },
                            })];
                        case 4:
                            _a = _o.sent();
                            _o.label = 5;
                        case 5:
                            vendor = _a;
                            result.vendorCreated = !existingVendor;
                            productsToRecalculate = new Set();
                            _i = 0, _b = data.listings;
                            _o.label = 6;
                        case 6:
                            if (!(_i < _b.length)) return [3 /*break*/, 24];
                            listing = _b[_i];
                            result.listingsProcessed++;
                            _o.label = 7;
                        case 7:
                            _o.trys.push([7, 22, , 23]);
                            return [4 /*yield*/, this.prisma.client.sourceListing.findUnique({
                                    where: { vendorId_sourceUrl: { vendorId: vendor.id, sourceUrl: listing.sourceUrl } },
                                })];
                        case 8:
                            existingListing = _o.sent();
                            listingData = {
                                sourceSku: (_g = listing.sourceSku) !== null && _g !== void 0 ? _g : undefined,
                                rawTitle: listing.rawTitle,
                                rawCategory: (_h = listing.rawCategory) !== null && _h !== void 0 ? _h : undefined,
                                rawPrice: listing.rawPrice,
                                rawCurrency: listing.rawCurrency,
                                priceUsd: listing.priceUsd,
                                priceRateDate: listing.priceRateDate ? new Date(listing.priceRateDate) : undefined,
                                inStock: listing.inStock,
                                images: listing.images,
                                affiliateUrl: (_j = listing.affiliateUrl) !== null && _j !== void 0 ? _j : undefined,
                                isPromo: listing.isPromo,
                                discountPercent: (_k = listing.discountPercent) !== null && _k !== void 0 ? _k : undefined,
                                lastParsedAt: new Date(listing.lastParsedAt),
                            };
                            if (!existingListing) return [3 /*break*/, 10];
                            return [4 /*yield*/, this.prisma.client.sourceListing.update({
                                    where: { id: existingListing.id },
                                    data: __assign(__assign({}, listingData), { priceCheckedAt: new Date(), stockCheckedAt: new Date() }),
                                })];
                        case 9:
                            _c = _o.sent();
                            return [3 /*break*/, 12];
                        case 10: return [4 /*yield*/, this.prisma.client.sourceListing.create({
                                data: __assign(__assign({}, listingData), { vendorId: vendor.id, sourceUrl: listing.sourceUrl, firstSeenAt: new Date(listing.firstSeenAt), priceCheckedAt: new Date(), stockCheckedAt: new Date() }),
                            })];
                        case 11:
                            _c = _o.sent();
                            _o.label = 12;
                        case 12:
                            savedListing = _c;
                            if (existingListing)
                                result.listingsUpdated++;
                            else
                                result.listingsCreated++;
                            _d = 0, _e = listing.productLinks;
                            _o.label = 13;
                        case 13:
                            if (!(_d < _e.length)) return [3 /*break*/, 21];
                            link = _e[_d];
                            return [4 /*yield*/, this.prisma.client.product.findUnique({
                                    where: { articleNumber: link.articleNumber },
                                })];
                        case 14:
                            product = _o.sent();
                            if (!product) {
                                result.productLinksSkipped.push({
                                    articleNumber: link.articleNumber,
                                    sourceUrl: listing.sourceUrl,
                                    reason: "Товар з таким articleNumber не знайдено в цільовому оточенні",
                                });
                                return [3 /*break*/, 20];
                            }
                            return [4 /*yield*/, this.prisma.client.productListing.findUnique({
                                    where: { productId_sourceListingId: { productId: product.id, sourceListingId: savedListing.id } },
                                })];
                        case 15:
                            existingLink = _o.sent();
                            if (!existingLink) return [3 /*break*/, 17];
                            return [4 /*yield*/, this.prisma.client.productListing.update({
                                    where: { id: existingLink.id },
                                    data: {
                                        matchType: link.matchType,
                                        matchConfidence: (_l = link.matchConfidence) !== null && _l !== void 0 ? _l : undefined,
                                        isPrimary: link.isPrimary,
                                    },
                                })];
                        case 16:
                            _o.sent();
                            result.productLinksUpdated++;
                            return [3 /*break*/, 19];
                        case 17: return [4 /*yield*/, this.prisma.client.productListing.create({
                                data: {
                                    productId: product.id,
                                    sourceListingId: savedListing.id,
                                    matchType: link.matchType,
                                    matchConfidence: (_m = link.matchConfidence) !== null && _m !== void 0 ? _m : undefined,
                                    isPrimary: link.isPrimary,
                                },
                            })];
                        case 18:
                            _o.sent();
                            result.productLinksCreated++;
                            _o.label = 19;
                        case 19:
                            productsToRecalculate.add(product.id);
                            _o.label = 20;
                        case 20:
                            _d++;
                            return [3 /*break*/, 13];
                        case 21: return [3 /*break*/, 23];
                        case 22:
                            err_1 = _o.sent();
                            message = err_1 instanceof Error ? err_1.message : String(err_1);
                            this.logger.error("Import failed for listing ".concat(listing.sourceUrl, ": ").concat(message));
                            result.errors.push("".concat(listing.sourceUrl, ": ").concat(message));
                            return [3 /*break*/, 23];
                        case 23:
                            _i++;
                            return [3 /*break*/, 6];
                        case 24:
                            _loop_1 = function (productId) {
                                return __generator(this, function (_p) {
                                    switch (_p.label) {
                                        case 0: return [4 /*yield*/, this_1.pricing.recalculate(productId).catch(function (err) {
                                                result.errors.push("Pricing recalculation failed for product ".concat(productId, ": ").concat(err));
                                            })];
                                        case 1:
                                            _p.sent();
                                            return [2 /*return*/];
                                    }
                                });
                            };
                            this_1 = this;
                            _f = 0, productsToRecalculate_1 = productsToRecalculate;
                            _o.label = 25;
                        case 25:
                            if (!(_f < productsToRecalculate_1.length)) return [3 /*break*/, 28];
                            productId = productsToRecalculate_1[_f];
                            return [5 /*yield**/, _loop_1(productId)];
                        case 26:
                            _o.sent();
                            _o.label = 27;
                        case 27:
                            _f++;
                            return [3 /*break*/, 25];
                        case 28: return [2 /*return*/, result];
                    }
                });
            });
        };
        VendorDataTransferService_1.prototype.validatePayload = function (payload) {
            var _a, _b;
            if (!payload || typeof payload !== 'object') {
                throw new common_1.BadRequestException("Некоректний файл — очікувався JSON-об'єкт");
            }
            var data = payload;
            if (data.formatVersion !== 1) {
                throw new common_1.BadRequestException("\u041D\u0435\u043F\u0456\u0434\u0442\u0440\u0438\u043C\u0443\u0432\u0430\u043D\u0430 \u0432\u0435\u0440\u0441\u0456\u044F \u0444\u043E\u0440\u043C\u0430\u0442\u0443: ".concat(data.formatVersion, " (\u043E\u0447\u0456\u043A\u0443\u0454\u0442\u044C\u0441\u044F 1)"));
            }
            if (!((_a = data.vendor) === null || _a === void 0 ? void 0 : _a.name) || !((_b = data.vendor) === null || _b === void 0 ? void 0 : _b.website)) {
                throw new common_1.BadRequestException("Відсутні обов'язкові поля vendor.name / vendor.website");
            }
            if (!Array.isArray(data.listings)) {
                throw new common_1.BadRequestException('Поле listings має бути масивом');
            }
            for (var _i = 0, _c = data.listings.entries(); _i < _c.length; _i++) {
                var _d = _c[_i], i = _d[0], listing = _d[1];
                if (!listing.sourceUrl || !listing.rawTitle || listing.priceUsd === undefined) {
                    throw new common_1.BadRequestException("\u041B\u0438\u0441\u0442\u0438\u043D\u0433 \u2116".concat(i + 1, ": \u0432\u0456\u0434\u0441\u0443\u0442\u043D\u0456 \u043E\u0431\u043E\u0432'\u044F\u0437\u043A\u043E\u0432\u0456 \u043F\u043E\u043B\u044F (sourceUrl/rawTitle/priceUsd)"));
                }
                if (!Array.isArray(listing.productLinks)) {
                    throw new common_1.BadRequestException("\u041B\u0438\u0441\u0442\u0438\u043D\u0433 \u2116".concat(i + 1, ": productLinks \u043C\u0430\u0454 \u0431\u0443\u0442\u0438 \u043C\u0430\u0441\u0438\u0432\u043E\u043C (\u043C\u043E\u0436\u0435 \u0431\u0443\u0442\u0438 \u043F\u043E\u0440\u043E\u0436\u043D\u0456\u043C)"));
                }
            }
            return data;
        };
        return VendorDataTransferService_1;
    }());
    __setFunctionName(_classThis, "VendorDataTransferService");
    (function () {
        var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        VendorDataTransferService = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return VendorDataTransferService = _classThis;
}();
exports.VendorDataTransferService = VendorDataTransferService;
