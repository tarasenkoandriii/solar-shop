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
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProductsService = void 0;
var common_1 = require("@nestjs/common");
var db_1 = require("@solar-shop/db");
var CATEGORY_PREFIX = {
    SOLAR_PANEL: 'SP',
    BATTERY: 'BAT',
    CONTROLLER: 'CTRL',
};
function slugify(name, suffix) {
    return (name
        .toLowerCase()
        .normalize('NFKD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '') +
        '-' +
        suffix.toLowerCase());
}
var ProductsService = function () {
    var _classDecorators = [(0, common_1.Injectable)()];
    var _classDescriptor;
    var _classExtraInitializers = [];
    var _classThis;
    var ProductsService = _classThis = /** @class */ (function () {
        function ProductsService_1(prisma, pricing) {
            this.prisma = prisma;
            this.pricing = pricing;
        }
        // Каталог (ТЗ п.3.2) — читает исключительно кэш-поля Product
        // (cachedPriceUsd/cachedInStock/...), без джойна на SourceListing на
        // каждый запрос (см. комментарий на Product в schema.prisma).
        ProductsService_1.prototype.findAll = function (query) {
            return __awaiter(this, void 0, void 0, function () {
                var page, pageSize, where, orderBy, _a, items, total;
                var _b, _c, _d;
                return __generator(this, function (_e) {
                    switch (_e.label) {
                        case 0:
                            page = (_b = query.page) !== null && _b !== void 0 ? _b : 1;
                            pageSize = Math.min((_c = query.pageSize) !== null && _c !== void 0 ? _c : 12, 60);
                            where = { status: db_1.ProductStatus.PUBLISHED };
                            if (query.category)
                                where.category = query.category;
                            if ((_d = query.manufacturerId) === null || _d === void 0 ? void 0 : _d.length)
                                where.manufacturerId = { in: query.manufacturerId };
                            if (query.inStockOnly)
                                where.cachedInStock = true;
                            if (query.promoOnly)
                                where.cachedIsPromo = true;
                            if (query.type)
                                where.specs = { path: ['type'], equals: query.type };
                            if (query.chemistry)
                                where.specs = { path: ['chemistry'], equals: query.chemistry };
                            if (query.controllerType)
                                where.specs = { path: ['controllerType'], equals: query.controllerType };
                            // Базовый site search (ТЗ п.30.2) — по имени/артикулу/SKU производителя.
                            // Полноценный pg_trgm-индекс требует raw SQL/migration extension; для
                            // объёма каталога Фазы 2 обычный ILIKE через Prisma `contains` достаточен
                            // и работает без миграций расширений Postgres — апгрейд до pg_trgm
                            // фиксирую как задел в AUDIT.md, если каталог вырастет на порядок.
                            if (query.q) {
                                where.OR = [
                                    { name: { contains: query.q, mode: 'insensitive' } },
                                    { articleNumber: { contains: query.q, mode: 'insensitive' } },
                                    { manufacturerSku: { contains: query.q, mode: 'insensitive' } },
                                ];
                            }
                            orderBy = query.sort === 'price_asc'
                                ? { cachedPriceUsd: 'asc' }
                                : query.sort === 'price_desc'
                                    ? { cachedPriceUsd: 'desc' }
                                    : { createdAt: 'desc' };
                            return [4 /*yield*/, Promise.all([
                                    this.prisma.client.product.findMany({
                                        where: where,
                                        orderBy: orderBy,
                                        skip: (page - 1) * pageSize,
                                        take: pageSize,
                                        include: { manufacturer: true, images: { orderBy: { sortOrder: 'asc' } } },
                                    }),
                                    this.prisma.client.product.count({ where: where }),
                                ])];
                        case 1:
                            _a = _e.sent(), items = _a[0], total = _a[1];
                            return [2 /*return*/, { items: items, total: total, page: page, pageSize: pageSize, totalPages: Math.max(1, Math.ceil(total / pageSize)) }];
                    }
                });
            });
        };
        // Карточка товара (ТЗ п.3.3/п.13.3/п.25.3) — здесь, в отличие от каталога,
        // нужна полная картина по siblings: города наличия объединены из кэша
        // (актуален после каждого recalculate), но конкретный самый дешёвый
        // листинг для кнопки "Купить"/"В корзину" всё равно берём отдельным
        // запросом — CartService должен знать listingId для снапшота цены.
        ProductsService_1.prototype.findBySlug = function (slug) {
            return __awaiter(this, void 0, void 0, function () {
                var product;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.prisma.client.product.findUnique({
                                where: { slug: slug },
                                include: {
                                    manufacturer: true,
                                    images: { orderBy: { sortOrder: 'asc' } },
                                    listings: {
                                        include: { sourceListing: { include: { vendor: true } } },
                                    },
                                },
                            })];
                        case 1:
                            product = _a.sent();
                            if (!product || product.status !== db_1.ProductStatus.PUBLISHED)
                                throw new common_1.NotFoundException('Product not found');
                            return [2 /*return*/, product];
                    }
                });
            });
        };
        // Используется CartService/OrderService при добавлении в корзину/чекауте
        // "Купить в 1 клик" — актуальный самый дешёвый listing в наличии (ТЗ п.13.3).
        ProductsService_1.prototype.getCheapestInStockListing = function (productId) {
            return __awaiter(this, void 0, void 0, function () {
                var listings;
                var _a;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0: return [4 /*yield*/, this.prisma.client.productListing.findMany({
                                where: { productId: productId, sourceListing: { inStock: true } },
                                include: { sourceListing: true },
                                orderBy: { sourceListing: { priceUsd: 'asc' } },
                                take: 1,
                            })];
                        case 1:
                            listings = _b.sent();
                            return [2 /*return*/, (_a = listings[0]) !== null && _a !== void 0 ? _a : null];
                    }
                });
            });
        };
        // ---- Admin CRUD ----
        ProductsService_1.prototype.findAllForAdmin = function () {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    return [2 /*return*/, this.prisma.client.product.findMany({
                            orderBy: { createdAt: 'desc' },
                            include: { manufacturer: true, images: { orderBy: { sortOrder: 'asc' } }, listings: true },
                        })];
                });
            });
        };
        ProductsService_1.prototype.create = function (dto) {
            return __awaiter(this, void 0, void 0, function () {
                var articleNumber, slug, images, isNew, rest;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.nextArticleNumber(dto.category)];
                        case 1:
                            articleNumber = _a.sent();
                            slug = slugify(dto.name, articleNumber);
                            images = dto.images, isNew = dto.isNew, rest = __rest(dto, ["images", "isNew"]);
                            return [2 /*return*/, this.prisma.client.product.create({
                                    data: __assign(__assign({}, rest), { category: dto.category, articleNumber: articleNumber, slug: slug, specs: dto.specs, cachedIsNew: isNew !== null && isNew !== void 0 ? isNew : false, images: { create: images.map(function (url, i) { return ({ url: url, sortOrder: i }); }) } }),
                                    include: { images: true },
                                })];
                    }
                });
            });
        };
        ProductsService_1.prototype.update = function (id, dto) {
            return __awaiter(this, void 0, void 0, function () {
                var images, isNew, rest;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.getOr404(id)];
                        case 1:
                            _a.sent();
                            images = dto.images, isNew = dto.isNew, rest = __rest(dto, ["images", "isNew"]);
                            if (!images) return [3 /*break*/, 3];
                            // Пересоздаём галерею целиком — проще и предсказуемее, чем diff
                            // отдельных фото, для объёма Фазы 2 (drag&drop reorder — п.26.4,
                            // задел на будущее, если понадобится точечный edit одной фотографии).
                            return [4 /*yield*/, this.prisma.client.productImage.deleteMany({ where: { productId: id } })];
                        case 2:
                            // Пересоздаём галерею целиком — проще и предсказуемее, чем diff
                            // отдельных фото, для объёма Фазы 2 (drag&drop reorder — п.26.4,
                            // задел на будущее, если понадобится точечный edit одной фотографии).
                            _a.sent();
                            _a.label = 3;
                        case 3: return [2 /*return*/, this.prisma.client.product.update({
                                where: { id: id },
                                data: __assign(__assign({}, rest), { specs: dto.specs, cachedIsNew: isNew, images: images ? { create: images.map(function (url, i) { return ({ url: url, sortOrder: i }); }) } : undefined }),
                                include: { images: true },
                            })];
                    }
                });
            });
        };
        ProductsService_1.prototype.remove = function (id) {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.getOr404(id)];
                        case 1:
                            _a.sent();
                            return [4 /*yield*/, this.prisma.client.product.delete({ where: { id: id } })];
                        case 2:
                            _a.sent();
                            return [2 /*return*/, { ok: true }];
                    }
                });
            });
        };
        // Ручной триггер пересчёта кэша для одного товара (напр. после ручной
        // привязки siblings в модерации, ТЗ п.13.2) — используется modулем siblings.
        ProductsService_1.prototype.recalculatePricing = function (id) {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.pricing.recalculate(id)];
                        case 1:
                            _a.sent();
                            return [2 /*return*/, this.prisma.client.product.findUnique({ where: { id: id } })];
                    }
                });
            });
        };
        ProductsService_1.prototype.getOr404 = function (id) {
            return __awaiter(this, void 0, void 0, function () {
                var product;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.prisma.client.product.findUnique({ where: { id: id } })];
                        case 1:
                            product = _a.sent();
                            if (!product)
                                throw new common_1.NotFoundException('Product not found');
                            return [2 /*return*/, product];
                    }
                });
            });
        };
        ProductsService_1.prototype.nextArticleNumber = function (category) {
            return __awaiter(this, void 0, void 0, function () {
                var seq;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.prisma.client.articleNumberSequence.upsert({
                                where: { category: category },
                                create: { category: category, lastSeq: 1 },
                                update: { lastSeq: { increment: 1 } },
                            })];
                        case 1:
                            seq = _a.sent();
                            return [2 /*return*/, "".concat(CATEGORY_PREFIX[category], "-").concat(String(seq.lastSeq).padStart(6, '0'))];
                    }
                });
            });
        };
        return ProductsService_1;
    }());
    __setFunctionName(_classThis, "ProductsService");
    (function () {
        var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        ProductsService = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return ProductsService = _classThis;
}();
exports.ProductsService = ProductsService;
