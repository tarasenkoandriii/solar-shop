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
exports.VoltmarketAdapter = void 0;
var cheerio = require("cheerio");
var fetch_with_retry_1 = require("../../common/fetch-with-retry");
// voltmarket.ua — приоритет №3 по ТЗ п.12 (нишевый, хороший источник для
// контроллеров).
//
// ⚠️ Как и в остальных адаптерах — структура (OpenCart, категории вида
// /solnechnye-panel, /alternativnaya-energetika/solnechnye-kontrollery,
// пагинация ?page=N, "Код товара: NNNNN" как SKU) подтверждена
// web_search+web_fetch на этапе написания кода, CSS-классы не
// протестированы против живого DOM. OpenCart стандартно использует
// `.product-thumb`/`.product-layout` — заложены как лучшее приближение.
//
// ВАЖНЫЙ НЮАНС (не баг, особенность сайта): в спарсенной разметке
// наличие часто скрыто за отдельной ссылкой "Уточнить наличие" вместо
// простого текстового статуса — это может означать, что реальный статус
// наличия подгружается через AJAX/JS и не присутствует в статичном HTML,
// который получает fetch(). Пока трактуем presence карточки в выдаче
// категории как inStock: true (сайт обычно не показывает товары "нет в
// наличии" в общем листинге вовсе) — стоит перепроверить на живом сайте
// перед первым реальным прогоном.
var VoltmarketAdapter = /** @class */ (function () {
    function VoltmarketAdapter() {
        this.vendorName = 'voltmarket.ua';
        this.categoryUrls = {
            SOLAR_PANEL: 'https://voltmarket.ua/solnechnye-panel',
            BATTERY: 'https://voltmarket.ua/litievye-akkumulyatory',
            CONTROLLER: 'https://voltmarket.ua/alternativnaya-energetika/solnechnye-kontrollery',
        };
    }
    VoltmarketAdapter.prototype.fetchListings = function () {
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
    VoltmarketAdapter.prototype.fetchCategory = function (baseUrl_1, rawCategory_1) {
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
                                        url = page === 1 ? baseUrl : "".concat(baseUrl, "?page=").concat(page);
                                        return [4 /*yield*/, (0, fetch_with_retry_1.fetchWithRetry)(url, { retries: 2, timeoutMs: 15000 })];
                                    case 1:
                                        res = _b.sent();
                                        if (!res.ok)
                                            return [2 /*return*/, "break"];
                                        return [4 /*yield*/, res.text()];
                                    case 2:
                                        html = _b.sent();
                                        $ = cheerio.load(html);
                                        products = $('.product-thumb, .product-layout');
                                        if (products.length === 0)
                                            return [2 /*return*/, "break"];
                                        products.each(function (_, el) {
                                            var _a, _b, _c, _d;
                                            var $el = $(el);
                                            var link = $el.find('.caption a, h4 a, .product-title a').first();
                                            var sourceUrl = (_a = link.attr('href')) !== null && _a !== void 0 ? _a : '';
                                            var rawTitle = link.text().trim();
                                            var priceText = $el.find('.price, .price-new').first().text();
                                            var rawPrice = parsePrice(priceText);
                                            var skuText = (_b = $el.text().match(/Код товара:\s*(\d+)/)) === null || _b === void 0 ? void 0 : _b[1];
                                            var image = (_d = (_c = $el.find('img').first().attr('src')) !== null && _c !== void 0 ? _c : $el.find('img').first().attr('data-src')) !== null && _d !== void 0 ? _d : '';
                                            if (!rawTitle || !sourceUrl || rawPrice === null)
                                                return;
                                            listings.push({
                                                sourceUrl: sourceUrl,
                                                sourceSku: skuText,
                                                rawTitle: rawTitle,
                                                rawCategory: rawCategory,
                                                rawPrice: rawPrice,
                                                rawCurrency: 'UAH',
                                                inStock: true, // см. комментарий выше про AJAX-наличие
                                                images: image ? [image] : [],
                                            });
                                        });
                                        if (products.length < 15)
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
    return VoltmarketAdapter;
}());
exports.VoltmarketAdapter = VoltmarketAdapter;
function parsePrice(text) {
    var cleaned = text.replace(/[^\d]/g, '');
    if (!cleaned)
        return null;
    return Number(cleaned);
}
