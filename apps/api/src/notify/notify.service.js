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
exports.NotifyService = void 0;
var common_1 = require("@nestjs/common");
var fetch_with_retry_1 = require("../common/fetch-with-retry");
// ТЗ п.28.1 — уведомления менеджеру через того же бота, что и TMA/Login
// Widget (не отдельный). Триггеры вызываются точечно из OrdersService/
// CronModule в нужных местах (см. вызовы notifyNewOrder/notifyOrderPaid/...).
var NotifyService = function () {
    var _classDecorators = [(0, common_1.Injectable)()];
    var _classDescriptor;
    var _classExtraInitializers = [];
    var _classThis;
    var NotifyService = _classThis = /** @class */ (function () {
        function NotifyService_1(config) {
            this.config = config;
            this.logger = new common_1.Logger(NotifyService.name);
        }
        NotifyService_1.prototype.notifyNewOrder = function (order) {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.send("\uD83C\uDD95 \u041D\u043E\u0432\u0435 \u0437\u0430\u043C\u043E\u0432\u043B\u0435\u043D\u043D\u044F #".concat(order.id.slice(-8), "\n") +
                                "".concat(order.contactName, ", ").concat(order.contactPhone, "\n") +
                                "".concat(order.itemsSummary, "\n") +
                                "\u0421\u0443\u043C\u0430: ".concat(order.totalUah.toLocaleString('uk-UA'), " \u20B4"))];
                        case 1:
                            _a.sent();
                            return [2 /*return*/];
                    }
                });
            });
        };
        NotifyService_1.prototype.notifyOrderPaid = function (orderId) {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.send("\u2705 \u0417\u0430\u043C\u043E\u0432\u043B\u0435\u043D\u043D\u044F #".concat(orderId.slice(-8), " \u043E\u043F\u043B\u0430\u0447\u0435\u043D\u043E \u2014 \u043C\u043E\u0436\u043D\u0430 \u043F\u0435\u0440\u0435\u0434\u0430\u0432\u0430\u0442\u0438 \u043F\u0435\u0440\u0435\u0432\u0456\u0437\u043D\u0438\u043A\u0443"))];
                        case 1:
                            _a.sent();
                            return [2 /*return*/];
                    }
                });
            });
        };
        NotifyService_1.prototype.notifyTtnCreationFailed = function (orderId, reason) {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.send("\u26A0\uFE0F \u041D\u0435 \u0432\u0434\u0430\u043B\u043E\u0441\u044C \u0430\u0432\u0442\u043E\u043C\u0430\u0442\u0438\u0447\u043D\u043E \u0441\u0442\u0432\u043E\u0440\u0438\u0442\u0438 \u0422\u0422\u041D \u0434\u043B\u044F \u0437\u0430\u043C\u043E\u0432\u043B\u0435\u043D\u043D\u044F #".concat(orderId.slice(-8), ": ").concat(reason, "\n\u0421\u0442\u0432\u043E\u0440\u0456\u0442\u044C \u0432\u0440\u0443\u0447\u043D\u0443 \u0432 \u0430\u0434\u043C\u0456\u043D\u0446\u0456."))];
                        case 1:
                            _a.sent();
                            return [2 /*return*/];
                    }
                });
            });
        };
        NotifyService_1.prototype.notifyCronFailed = function (jobKey, errorMessage) {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.send("\u274C \u041A\u0440\u043E\u043D-\u0434\u0436\u043E\u0431 \"".concat(jobKey, "\" \u0437\u0430\u0432\u0435\u0440\u0448\u0438\u0432\u0441\u044F \u0437 \u043F\u043E\u043C\u0438\u043B\u043A\u043E\u044E:\n").concat(errorMessage))];
                        case 1:
                            _a.sent();
                            return [2 /*return*/];
                    }
                });
            });
        };
        NotifyService_1.prototype.notifyLead = function (lead) {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.send("\uD83D\uDCE9 \u041D\u043E\u0432\u0435 \u0437\u0432\u0435\u0440\u043D\u0435\u043D\u043D\u044F \u0437 \u0441\u0430\u0439\u0442\u0443\n".concat(lead.name, ", ").concat(lead.phone).concat(lead.comment ? "\n\"".concat(lead.comment, "\"") : ''))];
                        case 1:
                            _a.sent();
                            return [2 /*return*/];
                    }
                });
            });
        };
        // ТЗ п.31.8 — новый расчёт калькулятора тоже тёплый лид, даже если ещё не Order
        NotifyService_1.prototype.notifyCalculatorLead = function (estimate) {
            return __awaiter(this, void 0, void 0, function () {
                var _a;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0: return [4 /*yield*/, this.send("\uD83E\uDDEE \u041D\u043E\u0432\u0438\u0439 \u0440\u043E\u0437\u0440\u0430\u0445\u0443\u043D\u043E\u043A \u043A\u0430\u043B\u044C\u043A\u0443\u043B\u044F\u0442\u043E\u0440\u0430 #".concat(estimate.id.slice(-8), "\n") +
                                "\u041C\u0456\u0441\u0442\u043E: ".concat((_a = estimate.city) !== null && _a !== void 0 ? _a : '—', "\n") +
                                "\u0426\u0456\u043B\u0456: ".concat(estimate.goals.join(', ') || '—', "\n") +
                                "\u041E\u0440\u0456\u0454\u043D\u0442\u043E\u0432\u043D\u0430 \u0441\u0443\u043C\u0430: $".concat(estimate.totalUsd.toFixed(2)))];
                        case 1:
                            _b.sent();
                            return [2 /*return*/];
                    }
                });
            });
        };
        // ТЗ п.31.6 — отправка PDF конкретному пользователю в его личный чат с
        // ботом (не менеджеру) — используется калькулятором для канала Telegram.
        // Требует, чтобы пользователь хотя бы раз открыл диалог с ботом (typично
        // выполняется автоматически при Telegram Login/TMA), иначе Telegram
        // вернёт 403 "bot was blocked by the user" / "chat not found" — тогда
        // отправка молча логируется как неудачная, не бросает исключение наружу
        // (сам PDF всё равно доступен по ссылке в личном кабинете).
        NotifyService_1.prototype.sendDocumentToUser = function (telegramId, documentUrl, caption) {
            return __awaiter(this, void 0, void 0, function () {
                var botToken, res, err_1;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            botToken = this.config.get('TELEGRAM_BOT_TOKEN');
                            if (!botToken) {
                                this.logger.warn('TELEGRAM_BOT_TOKEN not configured — skipping document send');
                                return [2 /*return*/, false];
                            }
                            // data: URL (фолбэк без Vercel Blob) нельзя передать в sendDocument как document — Telegram
                            // ожидает реальный http(s) URL или multipart-заливку файла.
                            if (documentUrl.startsWith('data:')) {
                                this.logger.warn('Cannot send data: URL document via Telegram sendDocument — needs a real https URL (BLOB_READ_WRITE_TOKEN not configured?)');
                                return [2 /*return*/, false];
                            }
                            _a.label = 1;
                        case 1:
                            _a.trys.push([1, 3, , 4]);
                            return [4 /*yield*/, (0, fetch_with_retry_1.fetchWithRetry)("https://api.telegram.org/bot".concat(botToken, "/sendDocument"), {
                                    method: 'POST',
                                    retries: 2,
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ chat_id: telegramId, document: documentUrl, caption: caption }),
                                })];
                        case 2:
                            res = _a.sent();
                            return [2 /*return*/, res.ok];
                        case 3:
                            err_1 = _a.sent();
                            this.logger.error("Failed to send document to user ".concat(telegramId), err_1);
                            return [2 /*return*/, false];
                        case 4: return [2 /*return*/];
                    }
                });
            });
        };
        NotifyService_1.prototype.send = function (text) {
            return __awaiter(this, void 0, void 0, function () {
                var botToken, chatId, err_2;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            botToken = this.config.get('TELEGRAM_BOT_TOKEN');
                            chatId = this.config.get('TELEGRAM_MANAGER_CHAT_ID');
                            if (!botToken || !chatId) {
                                this.logger.warn('TELEGRAM_BOT_TOKEN/TELEGRAM_MANAGER_CHAT_ID not configured — skipping notification');
                                return [2 /*return*/];
                            }
                            _a.label = 1;
                        case 1:
                            _a.trys.push([1, 3, , 4]);
                            return [4 /*yield*/, (0, fetch_with_retry_1.fetchWithRetry)("https://api.telegram.org/bot".concat(botToken, "/sendMessage"), {
                                    method: 'POST',
                                    retries: 2,
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ chat_id: chatId, text: text }),
                                })];
                        case 2:
                            _a.sent();
                            return [3 /*break*/, 4];
                        case 3:
                            err_2 = _a.sent();
                            this.logger.error('Failed to send Telegram notification', err_2);
                            return [3 /*break*/, 4];
                        case 4: return [2 /*return*/];
                    }
                });
            });
        };
        return NotifyService_1;
    }());
    __setFunctionName(_classThis, "NotifyService");
    (function () {
        var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        NotifyService = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return NotifyService = _classThis;
}();
exports.NotifyService = NotifyService;
