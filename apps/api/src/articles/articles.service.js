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
exports.ArticlesService = void 0;
var common_1 = require("@nestjs/common");
var fetch_with_retry_1 = require("../common/fetch-with-retry");
var rss_util_1 = require("./rss.util");
var TARGET_LOCALES = ['uk', 'ru', 'en'];
// ТЗ п.14.3 — источники с подтверждённым RSS. Ukrinform — государственное
// агентство, общесайтовый RSS подтверждён поиском на этапе имплементации
// (см. AUDIT.md по поводу точного пути фида — стандартный /rss, не
// протестирован живым запросом из-за сетевых ограничений sandbox).
var RSS_SOURCES = [{ siteName: 'ukrinform.net', feedUrl: 'https://www.ukrinform.net/rss' }];
var ArticlesService = function () {
    var _classDecorators = [(0, common_1.Injectable)()];
    var _classDescriptor;
    var _classExtraInitializers = [];
    var _classThis;
    var ArticlesService = _classThis = /** @class */ (function () {
        function ArticlesService_1(prisma, grok) {
            this.prisma = prisma;
            this.grok = grok;
            this.logger = new common_1.Logger(ArticlesService.name);
        }
        ArticlesService_1.prototype.findPublished = function (locale) {
            return this.prisma.client.articleTranslation.findMany({
                where: { locale: locale, status: 'PUBLISHED' },
                include: { article: true },
                orderBy: { createdAt: 'desc' },
            });
        };
        ArticlesService_1.prototype.findBySlug = function (locale, slug) {
            return __awaiter(this, void 0, void 0, function () {
                var translation;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.prisma.client.articleTranslation.findUnique({
                                where: { locale_slug: { locale: locale, slug: slug } },
                                include: { article: true },
                            })];
                        case 1:
                            translation = _a.sent();
                            if (!translation || translation.status !== 'PUBLISHED')
                                throw new common_1.NotFoundException('Article not found');
                            return [2 /*return*/, translation];
                    }
                });
            });
        };
        ArticlesService_1.prototype.findAllForAdmin = function () {
            return this.prisma.client.article.findMany({
                include: { translations: true },
                orderBy: { createdAt: 'desc' },
            });
        };
        ArticlesService_1.prototype.updateArticle = function (id, dto) {
            return this.prisma.client.article.update({ where: { id: id }, data: dto });
        };
        ArticlesService_1.prototype.updateTranslation = function (id, dto) {
            return this.prisma.client.articleTranslation.update({ where: { id: id }, data: dto });
        };
        ArticlesService_1.prototype.runParser = function () {
            return __awaiter(this, void 0, void 0, function () {
                var found, created, translated, failed, _i, RSS_SOURCES_1, source, items, res, xml, err_1, _a, items_1, item, existing, slug, article, _b, TARGET_LOCALES_1, locale, rewritten, err_2;
                return __generator(this, function (_c) {
                    switch (_c.label) {
                        case 0:
                            found = 0;
                            created = 0;
                            translated = 0;
                            failed = 0;
                            _i = 0, RSS_SOURCES_1 = RSS_SOURCES;
                            _c.label = 1;
                        case 1:
                            if (!(_i < RSS_SOURCES_1.length)) return [3 /*break*/, 18];
                            source = RSS_SOURCES_1[_i];
                            items = void 0;
                            _c.label = 2;
                        case 2:
                            _c.trys.push([2, 5, , 6]);
                            return [4 /*yield*/, (0, fetch_with_retry_1.fetchWithRetry)(source.feedUrl, { retries: 2, timeoutMs: 15000 })];
                        case 3:
                            res = _c.sent();
                            return [4 /*yield*/, res.text()];
                        case 4:
                            xml = _c.sent();
                            items = (0, rss_util_1.parseRssItems)(xml).filter(rss_util_1.isRelevantToSolarEnergy);
                            return [3 /*break*/, 6];
                        case 5:
                            err_1 = _c.sent();
                            this.logger.error("RSS fetch failed for ".concat(source.siteName), err_1);
                            return [3 /*break*/, 17];
                        case 6:
                            found += items.length;
                            _a = 0, items_1 = items;
                            _c.label = 7;
                        case 7:
                            if (!(_a < items_1.length)) return [3 /*break*/, 17];
                            item = items_1[_a];
                            return [4 /*yield*/, this.prisma.client.article.findFirst({ where: { sourceUrl: item.link } })];
                        case 8:
                            existing = _c.sent();
                            if (existing)
                                return [3 /*break*/, 16];
                            slug = slugify(item.title);
                            return [4 /*yield*/, this.prisma.client.article.create({
                                    data: { slug: slug, sourceUrl: item.link, sourceSite: source.siteName, originalLocale: 'uk', status: 'DRAFT' },
                                })];
                        case 9:
                            article = _c.sent();
                            created++;
                            _b = 0, TARGET_LOCALES_1 = TARGET_LOCALES;
                            _c.label = 10;
                        case 10:
                            if (!(_b < TARGET_LOCALES_1.length)) return [3 /*break*/, 16];
                            locale = TARGET_LOCALES_1[_b];
                            _c.label = 11;
                        case 11:
                            _c.trys.push([11, 14, , 15]);
                            return [4 /*yield*/, this.grok.rewriteAndTranslateArticle("".concat(item.title, "\n\n").concat(item.description), locale)];
                        case 12:
                            rewritten = _c.sent();
                            if (!rewritten) {
                                failed++;
                                return [3 /*break*/, 15];
                            }
                            return [4 /*yield*/, this.prisma.client.articleTranslation.create({
                                    data: {
                                        articleId: article.id,
                                        locale: locale,
                                        slug: slugify(rewritten.title),
                                        title: rewritten.title,
                                        excerpt: rewritten.excerpt,
                                        content: rewritten.content,
                                        status: 'DRAFT',
                                    },
                                })];
                        case 13:
                            _c.sent();
                            translated++;
                            return [3 /*break*/, 15];
                        case 14:
                            err_2 = _c.sent();
                            this.logger.error("Translation to ".concat(locale, " failed for ").concat(item.link), err_2);
                            failed++;
                            return [3 /*break*/, 15];
                        case 15:
                            _b++;
                            return [3 /*break*/, 10];
                        case 16:
                            _a++;
                            return [3 /*break*/, 7];
                        case 17:
                            _i++;
                            return [3 /*break*/, 1];
                        case 18: return [2 /*return*/, { found: found, created: created, translated: translated, failed: failed }];
                    }
                });
            });
        };
        return ArticlesService_1;
    }());
    __setFunctionName(_classThis, "ArticlesService");
    (function () {
        var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        ArticlesService = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return ArticlesService = _classThis;
}();
exports.ArticlesService = ArticlesService;
function slugify(text) {
    return (text
        .toLowerCase()
        .normalize('NFKD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '')
        .slice(0, 80) +
        '-' +
        Math.random().toString(36).slice(2, 7));
}
