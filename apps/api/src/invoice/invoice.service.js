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
exports.InvoiceService = void 0;
var common_1 = require("@nestjs/common");
var pdf_lib_1 = require("pdf-lib");
var fontkit_1 = require("@pdf-lib/fontkit");
var fs = require("fs/promises");
var path = require("path");
// ТЗ п.21 — PDF-счёт заказа, ТЗ п.31.6 — "переиспользуем InvoiceService, тот
// же генератор, только другой шаблон («Смета проекта» вместо «Счёт»)".
// pdf-lib выбран вместо puppeteer (избыточен для serverless-лимитов Vercel
// Hobby). Кириллица требует embed TTF-шрифта — см. assets/fonts/README.md.
var InvoiceService = function () {
    var _classDecorators = [(0, common_1.Injectable)()];
    var _classDescriptor;
    var _classExtraInitializers = [];
    var _classThis;
    var InvoiceService = _classThis = /** @class */ (function () {
        function InvoiceService_1(prisma, config) {
            this.prisma = prisma;
            this.config = config;
            this.logger = new common_1.Logger(InvoiceService.name);
        }
        // ---- Общая PDF-инфраструктура (шрифт, Blob-загрузка) ----
        InvoiceService_1.prototype.createDocWithFont = function () {
            return __awaiter(this, void 0, void 0, function () {
                var doc, fontPath, fontBytes, _a, font;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0: return [4 /*yield*/, pdf_lib_1.PDFDocument.create()];
                        case 1:
                            doc = _b.sent();
                            doc.registerFontkit(fontkit_1.default);
                            fontPath = path.join(__dirname, '../../assets/fonts/NotoSans-Regular.ttf');
                            _b.label = 2;
                        case 2:
                            _b.trys.push([2, 4, , 5]);
                            return [4 /*yield*/, fs.readFile(fontPath)];
                        case 3:
                            fontBytes = _b.sent();
                            return [3 /*break*/, 5];
                        case 4:
                            _a = _b.sent();
                            throw new Error("Cyrillic font not found at ".concat(fontPath, " \u2014 see assets/fonts/README.md. ") +
                                "PDF \u0437 \u0443\u043A\u0440\u0430\u0457\u043D\u0441\u044C\u043A\u043E\u044E \u043C\u043E\u0432\u043E\u044E \u043F\u043E\u0442\u0440\u0435\u0431\u0443\u0454 embed TTF-\u0448\u0440\u0438\u0444\u0442\u0430.");
                        case 5: return [4 /*yield*/, doc.embedFont(fontBytes, { subset: true })];
                        case 6:
                            font = _b.sent();
                            return [2 /*return*/, { doc: doc, font: font }];
                    }
                });
            });
        };
        InvoiceService_1.prototype.uploadToBlob = function (buffer, filename) {
            return __awaiter(this, void 0, void 0, function () {
                var blobToken, res, data;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            blobToken = this.config.get('BLOB_READ_WRITE_TOKEN');
                            if (!blobToken) {
                                this.logger.warn("BLOB_READ_WRITE_TOKEN not configured \u2014 ".concat(filename, " generated but not persisted to storage"));
                                return [2 /*return*/, "data:application/pdf;base64,".concat(buffer.toString('base64'))];
                            }
                            return [4 /*yield*/, fetch("https://blob.vercel-storage.com/".concat(filename), {
                                    method: 'PUT',
                                    headers: { Authorization: "Bearer ".concat(blobToken), 'Content-Type': 'application/pdf' },
                                    body: new Uint8Array(buffer),
                                })];
                        case 1:
                            res = _a.sent();
                            if (!res.ok)
                                throw new Error("Failed to upload ".concat(filename, " to Vercel Blob: ").concat(res.status));
                            return [4 /*yield*/, res.json()];
                        case 2:
                            data = (_a.sent());
                            return [2 /*return*/, data.url];
                    }
                });
            });
        };
        // ---- Счёт заказа (ТЗ п.21) ----
        InvoiceService_1.prototype.generatePdf = function (orderId) {
            return __awaiter(this, void 0, void 0, function () {
                var order, _a, doc, font, page, y, left, draw, _i, _b, item, pdfBytes;
                return __generator(this, function (_c) {
                    switch (_c.label) {
                        case 0: return [4 /*yield*/, this.prisma.client.order.findUniqueOrThrow({
                                where: { id: orderId },
                                include: { items: { include: { product: true } } },
                            })];
                        case 1:
                            order = _c.sent();
                            return [4 /*yield*/, this.createDocWithFont()];
                        case 2:
                            _a = _c.sent(), doc = _a.doc, font = _a.font;
                            page = doc.addPage([595, 842]);
                            y = 800;
                            left = 50;
                            draw = function (text, size, x) {
                                if (size === void 0) { size = 11; }
                                if (x === void 0) { x = left; }
                                page.drawText(text, { x: x, y: y, size: size, font: font, color: (0, pdf_lib_1.rgb)(0, 0, 0) });
                                y -= size + 8;
                            };
                            draw('РАХУНОК-ФАКТУРА', 18);
                            draw("\u2116 ".concat(order.id.slice(-8).toUpperCase(), " \u0432\u0456\u0434 ").concat(order.createdAt.toLocaleDateString('uk-UA')), 11);
                            y -= 10;
                            draw('Постачальник: ФОП [ПІБ] (заповнити перед запуском)', 10);
                            draw('ЄДРПОУ/ІПН: [ЄДРПОУ/ІПН]', 10);
                            draw('IBAN: [IBAN], Банк: [Назва банку]', 10);
                            y -= 10;
                            draw("\u041E\u0442\u0440\u0438\u043C\u0443\u0432\u0430\u0447: ".concat(order.contactName, ", ").concat(order.contactPhone), 10);
                            y -= 10;
                            draw('Найменування товару', 10);
                            y -= 4;
                            for (_i = 0, _b = order.items; _i < _b.length; _i++) {
                                item = _b[_i];
                                draw("".concat(item.product.articleNumber, " \u00B7 ").concat(item.product.name, " \u00D7 ").concat(item.quantity, " = ").concat((Number(item.priceUsd) * item.quantity).toFixed(2), " USD"), 10);
                            }
                            y -= 10;
                            draw("\u0420\u0430\u0437\u043E\u043C \u0434\u043E \u0441\u043F\u043B\u0430\u0442\u0438 (USD): ".concat(Number(order.totalUsd).toFixed(2)), 12);
                            draw("\u041A\u0443\u0440\u0441 \u041D\u0411\u0423 \u043D\u0430 \u043C\u043E\u043C\u0435\u043D\u0442 \u0437\u0430\u043C\u043E\u0432\u043B\u0435\u043D\u043D\u044F: ".concat(Number(order.exchangeRateUah).toFixed(4), " \u0433\u0440\u043D/USD"), 10);
                            draw("\u0420\u0430\u0437\u043E\u043C \u0434\u043E \u0441\u043F\u043B\u0430\u0442\u0438 (UAH): ".concat(Number(order.totalUah).toFixed(2), " \u20B4"), 14);
                            if (order.loyaltyDiscountPercent > 0) {
                                draw("(\u0432\u0440\u0430\u0445\u043E\u0432\u0430\u043D\u043E \u0437\u043D\u0438\u0436\u043A\u0443 \u043F\u043E\u0441\u0442\u0456\u0439\u043D\u043E\u0433\u043E \u043A\u043B\u0456\u0454\u043D\u0442\u0430: ".concat(order.loyaltyDiscountPercent, "%)"), 9);
                            }
                            y -= 10;
                            draw('Ничто так не вселяет уверенность в покупке, как стопроцентная предоплата.', 9);
                            draw('Відправлення відбувається строго після підтвердження 100% оплати.', 9);
                            return [4 /*yield*/, doc.save()];
                        case 3:
                            pdfBytes = _c.sent();
                            return [2 /*return*/, Buffer.from(pdfBytes)];
                    }
                });
            });
        };
        InvoiceService_1.prototype.generateAndStore = function (orderId) {
            return __awaiter(this, void 0, void 0, function () {
                var pdfBuffer;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.generatePdf(orderId)];
                        case 1:
                            pdfBuffer = _a.sent();
                            return [2 /*return*/, this.uploadToBlob(pdfBuffer, "invoices/".concat(orderId, ".pdf"))];
                    }
                });
            });
        };
        // ---- Смета проекта калькулятора (ТЗ п.31.6/31.10.3) ----
        // Многостраничный пакет: спецификация → аннотация → блочная схема →
        // принципиальная схема, одним файлом. Схемы вставляются как встроенный
        // SVG-текст не поддерживается pdf-lib напрямую — упрощаем до текстового
        // описания схемы (список блоков и связей) на PDF-странице; сам SVG
        // остаётся доступен пользователю отдельным файлом на экране результата
        // (ТЗ п.31.10.3: "каждый артефакт также доступен для отдельного скачивания").
        InvoiceService_1.prototype.generateProjectEstimatePdf = function (estimateId) {
            return __awaiter(this, void 0, void 0, function () {
                var estimate, recommendedSpec, _a, doc, font, page, y, left, draw, _i, recommendedSpec_1, item, pdfBytes;
                var _b;
                return __generator(this, function (_c) {
                    switch (_c.label) {
                        case 0: return [4 /*yield*/, this.prisma.client.projectEstimate.findUniqueOrThrow({
                                where: { id: estimateId },
                            })];
                        case 1:
                            estimate = _c.sent();
                            recommendedSpec = estimate.recommendedSpec;
                            return [4 /*yield*/, this.createDocWithFont()];
                        case 2:
                            _a = _c.sent(), doc = _a.doc, font = _a.font;
                            page = doc.addPage([595, 842]);
                            y = 800;
                            left = 50;
                            draw = function (text, size, x) {
                                if (size === void 0) { size = 11; }
                                if (x === void 0) { x = left; }
                                var lines = wrapText(text, 90);
                                for (var _i = 0, lines_1 = lines; _i < lines_1.length; _i++) {
                                    var line = lines_1[_i];
                                    page.drawText(line, { x: x, y: y, size: size, font: font, color: (0, pdf_lib_1.rgb)(0, 0, 0) });
                                    y -= size + 6;
                                }
                            };
                            draw('КОШТОРИС ПРОЄКТУ', 18);
                            draw("\u2116 ".concat(estimate.id.slice(-8).toUpperCase(), " \u0432\u0456\u0434 ").concat(estimate.createdAt.toLocaleDateString('uk-UA')), 11);
                            if (estimate.city)
                                draw("\u041C\u0456\u0441\u0442\u043E: ".concat(estimate.city), 10);
                            y -= 10;
                            draw('Специфікація', 13);
                            for (_i = 0, recommendedSpec_1 = recommendedSpec; _i < recommendedSpec_1.length; _i++) {
                                item = recommendedSpec_1[_i];
                                draw("".concat(item.articleNumber, " \u00B7 ").concat(item.name, " \u00D7 ").concat(item.quantity, " = ").concat((item.priceUsd * item.quantity).toFixed(2), " USD"), 10);
                            }
                            y -= 6;
                            draw("\u0420\u0430\u0437\u043E\u043C (USD): ".concat(Number(estimate.totalUsd).toFixed(2)), 12);
                            if (estimate.exchangeRateUah) {
                                draw("\u041A\u0443\u0440\u0441 \u041D\u0411\u0423 \u043D\u0430 \u0434\u0430\u0442\u0443 \u0440\u043E\u0437\u0440\u0430\u0445\u0443\u043D\u043A\u0443 (".concat((_b = estimate.exchangeRateDate) === null || _b === void 0 ? void 0 : _b.toLocaleDateString('uk-UA'), "): ").concat(Number(estimate.exchangeRateUah).toFixed(4), " \u0433\u0440\u043D/USD"), 10);
                            }
                            if (estimate.totalUah) {
                                draw("\u0420\u0430\u0437\u043E\u043C (UAH): ".concat(Number(estimate.totalUah).toFixed(2), " \u20B4"), 14);
                            }
                            y -= 10;
                            if (estimate.annotationText) {
                                draw('Анотація проєкту', 13);
                                draw(estimate.annotationText, 10);
                                y -= 10;
                            }
                            if (estimate.schemaTopology) {
                                draw("\u0422\u043E\u043F\u043E\u043B\u043E\u0433\u0456\u044F \u0441\u0438\u0441\u0442\u0435\u043C\u0438: ".concat(estimate.schemaTopology), 10);
                            }
                            y -= 10;
                            draw('Схема носить ознайомчий характер, не замінює проєкт від сертифікованого електрика; фінальний монтаж має відповідати чинним нормам (ДБН/ПУЕ).', 9);
                            return [4 /*yield*/, doc.save()];
                        case 3:
                            pdfBytes = _c.sent();
                            return [2 /*return*/, Buffer.from(pdfBytes)];
                    }
                });
            });
        };
        InvoiceService_1.prototype.generateAndStoreProjectEstimatePdf = function (estimateId) {
            return __awaiter(this, void 0, void 0, function () {
                var pdfBuffer;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.generateProjectEstimatePdf(estimateId)];
                        case 1:
                            pdfBuffer = _a.sent();
                            return [2 /*return*/, this.uploadToBlob(pdfBuffer, "project-estimates/".concat(estimateId, ".pdf"))];
                    }
                });
            });
        };
        // ---- Бізнес-план (ТЗ п.31.11.3) — той самий генератор, шаблон "Бізнес-план" ----
        InvoiceService_1.prototype.generateBusinessPlanPdf = function (estimateId, content, payback) {
            return __awaiter(this, void 0, void 0, function () {
                var estimate, _a, doc, font, page, y, left, draw, pdfBytes;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0: return [4 /*yield*/, this.prisma.client.projectEstimate.findUniqueOrThrow({ where: { id: estimateId } })];
                        case 1:
                            estimate = _b.sent();
                            return [4 /*yield*/, this.createDocWithFont()];
                        case 2:
                            _a = _b.sent(), doc = _a.doc, font = _a.font;
                            page = doc.addPage([595, 842]);
                            y = 800;
                            left = 50;
                            draw = function (text, size, x) {
                                if (size === void 0) { size = 11; }
                                if (x === void 0) { x = left; }
                                var lines = wrapText(text, 90);
                                for (var _i = 0, lines_2 = lines; _i < lines_2.length; _i++) {
                                    var line = lines_2[_i];
                                    if (y < 60)
                                        return; // ТЗ: без пагинации на несколько страниц в этой версии — см. AUDIT-PHASE-4.md
                                    page.drawText(line, { x: x, y: y, size: size, font: font, color: (0, pdf_lib_1.rgb)(0, 0, 0) });
                                    y -= size + 6;
                                }
                            };
                            draw('БІЗНЕС-ПЛАН ПРОЄКТУ', 18);
                            draw("\u2116 ".concat(estimate.id.slice(-8).toUpperCase(), " \u0432\u0456\u0434 ").concat(estimate.createdAt.toLocaleDateString('uk-UA')), 11);
                            y -= 10;
                            if (payback) {
                                draw('Прогноз окупності', 13);
                                draw("\u041E\u0440\u0456\u0454\u043D\u0442\u043E\u0432\u043D\u043E ".concat(payback.paybackYearsMin.toFixed(1), "\u2013").concat(payback.paybackYearsMax.toFixed(1), " \u0440\u043E\u043A\u0456\u0432 (\u0440\u0456\u0447\u043D\u0430 \u0433\u0435\u043D\u0435\u0440\u0430\u0446\u0456\u044F ~").concat(Math.round(payback.annualKwh), " \u043A\u0412\u0442\u00B7\u0433\u043E\u0434, \u0437\u0430 \u0434\u0430\u043D\u0438\u043C\u0438 PVGIS)"), 10);
                                draw('Розрахунок базується на кліматологічних даних PVGIS та поточному тарифі, не враховує можливу зміну тарифів, реальний кут встановлення, затінення та якість монтажу. Це орієнтовна оцінка, не гарантія.', 9);
                                y -= 10;
                            }
                            if (content) {
                                draw('Опис проєкту', 13);
                                draw(content, 10);
                                y -= 10;
                            }
                            draw('Це не є фінансовою консультацією. Умови кредитування, ставки та вимоги до позичальника уточнюйте безпосередньо в банку/операторі програми на дату звернення.', 9);
                            return [4 /*yield*/, doc.save()];
                        case 3:
                            pdfBytes = _b.sent();
                            return [2 /*return*/, Buffer.from(pdfBytes)];
                    }
                });
            });
        };
        InvoiceService_1.prototype.generateAndStoreBusinessPlanPdf = function (estimateId, content, payback) {
            return __awaiter(this, void 0, void 0, function () {
                var pdfBuffer;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.generateBusinessPlanPdf(estimateId, content, payback)];
                        case 1:
                            pdfBuffer = _a.sent();
                            return [2 /*return*/, this.uploadToBlob(pdfBuffer, "business-plans/".concat(estimateId, ".pdf"))];
                    }
                });
            });
        };
        return InvoiceService_1;
    }());
    __setFunctionName(_classThis, "InvoiceService");
    (function () {
        var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        InvoiceService = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return InvoiceService = _classThis;
}();
exports.InvoiceService = InvoiceService;
function wrapText(text, maxChars) {
    var words = text.split(/\s+/);
    var lines = [];
    var current = '';
    for (var _i = 0, words_1 = words; _i < words_1.length; _i++) {
        var word = words_1[_i];
        if ((current + ' ' + word).trim().length > maxChars) {
            if (current)
                lines.push(current.trim());
            current = word;
        }
        else {
            current = "".concat(current, " ").concat(word).trim();
        }
    }
    if (current)
        lines.push(current.trim());
    return lines;
}
