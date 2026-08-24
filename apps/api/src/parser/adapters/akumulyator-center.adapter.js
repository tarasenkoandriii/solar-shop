"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.AkumulyatorCenterAdapter = void 0;
var cheerio = require("cheerio");
var fetch_with_retry_1 = require("../../common/fetch-with-retry");
// akumulyator.center — приоритет №2 по ТЗ п.12.
//
// ⚠️ Как и в SunshopAdapter (см. комментарий там) — структура (CS-Cart,
// категории /sonyachni-stancii/sonyachni-paneli/, пагинация /page-N/,
// формат карточки) подтверждена web_search+web_fetch на этапе написания
// кода, но точные CSS-классы не протестированы против живого DOM (сеть
// песочницы не пускает на сам сайт). CS-Cart стандартно использует классы
// вида `.ty-grid-list__item` — заложены ниже как лучшее приближение.
//
// У этого магазина нет отдельной категории "контроллеры заряда" в меню
// (только инверторы) — CONTROLLER для этого вендора не заполняется,
// матчинг просто не найдёт listings этой категории от akumulyator.center,
// что ожидаемо и не является багом.
var AkumulyatorCenterAdapter = /** @class */ (function () {
    function AkumulyatorCenterAdapter() {
        this.vendorName = 'akumulyator.center';
        this.categoryUrls = {
            SOLAR_PANEL: 'https://akumulyator.center/sonyachni-stancii/sonyachni-paneli/',
            // LiFePO4 — самая сопоставимая с нашей категорией BATTERY линейка
            // (у магазина также есть автомобильные/AGM-гелевые аккумуляторы отдельно,
            // не наш профиль).
            BATTERY: 'https://akumulyator.center/avtomobilni-akumulyatori/litiievi-akumulyatori/lifepo4/',
        };
    }
    AkumulyatorCenterAdapter.prototype.fetchListings = function () {
        return __awaiter(this, void 0, void 0, function () {
            var results, _i, _a, _b, category, url, _c, _d, _e;
            return __generator(this, function (_f) {
                switch (_f.label) {
                    case 0:
                        results = [];
                        _i = 0, _a = Object.entries(this.categoryUrls);
                        _f.label = 1;
                    case 1:
                        if (!(_i < _a.length)) return [3 /*break*/, 4];
                        _b = _a[_i], category = _b[0], url = _b[1];
                        if (!url)
                            return [3 /*break*/, 3];
                        _d = (_c = results.push).apply;
                        _e = [results];
                        return [4 /*yield*/, this.fetchCategory(url, category)];
                    case 2:
                        _d.apply(_c, _e.concat([(_f.sent())]));
                        _f.label = 3;
                    case 3:
                        _i++;
                        return [3 /*break*/, 1];
                    case 4: return [2 /*return*/, results];
                }
            });
        });
    };
    AkumulyatorCenterAdapter.prototype.fetchCategory = function (baseUrl_1, rawCategory_1) {
        return __awaiter(this, arguments, void 0, function (baseUrl, rawCategory, maxPages) {
            var listings, _loop_1, page, state_1;
            if (maxPages === void 0) { maxPages = 8; }
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        listings = [];
                        _loop_1 = function (page) {
                            var url, res, html, $, products;
                            return __generator(this, function (_b) {
                                switch (_b.label) {
                                    case 0:
                                        url = page === 1 ? baseUrl : "".concat(baseUrl, "page-").concat(page, "/");
                                        return [4 /*yield*/, (0, fetch_with_retry_1.fetchWithRetry)(url, { retries: 2, timeoutMs: 15000 })];
                                    case 1:
                                        res = _b.sent();
                                        if (!res.ok)
                                            return [2 /*return*/, "break"];
                                        return [4 /*yield*/, res.text()];
                                    case 2:
                                        html = _b.sent();
                                        $ = cheerio.load(html);
                                        products = $('.ty-grid-list__item, .products-container .item');
                                        if (products.length === 0)
                                            return [2 /*return*/, "break"];
                                        products.each(function (_, el) {
                                            var _a, _b, _c;
                                            var $el = $(el);
                                            var link = $el.find('a.ty-grid-list__item-name, .product-title a').first();
                                            var sourceUrl = (_a = link.attr('href')) !== null && _a !== void 0 ? _a : '';
                                            var rawTitle = link.text().trim();
                                            var priceText = $el.find('.ty-price-num, .product-price .price').first().text();
                                            var rawPrice = parsePrice(priceText);
                                            var availabilityText = $el.find('.ty-qty-in-stock, .availability').first().text();
                                            var outOfStock = /немає в наявності|нет в наличии|під замовлення/i.test(availabilityText);
                                            var image = (_c = (_b = $el.find('img').first().attr('src')) !== null && _b !== void 0 ? _b : $el.find('img').first().attr('data-src')) !== null && _c !== void 0 ? _c : '';
                                            if (!rawTitle || !sourceUrl || rawPrice === null)
                                                return;
                                            listings.push({
                                                sourceUrl: sourceUrl,
                                                rawTitle: rawTitle,
                                                rawCategory: rawCategory,
                                                rawPrice: rawPrice,
                                                rawCurrency: 'UAH',
                                                inStock: !outOfStock,
                                                images: image ? [image] : [],
                                            });
                                        });
                                        // CS-Cart отдаёт постранично небольшими блоками — если карточек на
                                        // странице заметно меньше типичного (обычно 12-24), это последняя страница.
                                        if (products.length < 10)
                                            return [2 /*return*/, "break"];
                                        return [2 /*return*/];
                                }
                            });
                        };
                        page = 1;
                        _a.label = 1;
                    case 1:
                        if (!(page <= maxPages)) return [3 /*break*/, 4];
                        return [5 /*yield**/, _loop_1(page)];
                    case 2:
                        state_1 = _a.sent();
                        if (state_1 === "break")
                            return [3 /*break*/, 4];
                        _a.label = 3;
                    case 3:
                        page++;
                        return [3 /*break*/, 1];
                    case 4: return [2 /*return*/, listings];
                }
            });
        });
    };
    return AkumulyatorCenterAdapter;
}());
exports.AkumulyatorCenterAdapter = AkumulyatorCenterAdapter;
function parsePrice(text) {
    var cleaned = text.replace(/[^\d]/g, '');
    if (!cleaned)
        return null;
    return Number(cleaned);
}
