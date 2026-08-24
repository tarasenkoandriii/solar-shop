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
exports.EmailService = void 0;
var common_1 = require("@nestjs/common");
var nodemailer = require("nodemailer");
var fetch_with_retry_1 = require("../common/fetch-with-retry");
// Найдено при аудите фичи отправки (см. AUDIT-PHASE-3.md): раньше data: URL
// (PDF без настроенного BLOB_READ_WRITE_TOKEN) просто дописывался текстом в
// тело письма — это могло быть несколько мегабайт base64 прямо в тексте
// письма: не рендерится как ссылка, раздувает размер письма, часть
// SMTP-серверов режет такие строки или отклоняет письмо целиком. Теперь
// data: URL распознаётся и прикрепляется как настоящее MIME-вложение.
function resolveAttachment(attachmentUrl) {
    if (!attachmentUrl)
        return null;
    if (attachmentUrl.startsWith('data:application/pdf;base64,')) {
        return { kind: 'inline', base64: attachmentUrl.slice('data:application/pdf;base64,'.length), filename: 'document.pdf' };
    }
    return { kind: 'link', url: attachmentUrl, filename: 'document.pdf' };
}
// ТЗ п.31.6 — Resend основной, самописный SMTP-фолбэк (nodemailer), если
// Resend недоступен. Логика переключения — тот же принцип, что у
// fetchWithRetry (п.28.5): ошибка основного пути не роняет всю отправку.
var ResendAdapter = /** @class */ (function () {
    function ResendAdapter(apiKey) {
        this.apiKey = apiKey;
    }
    ResendAdapter.prototype.send = function (input) {
        return __awaiter(this, void 0, void 0, function () {
            var attachment, body, res;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        attachment = resolveAttachment(input.attachmentUrl);
                        body = {
                            from: 'Solar Shop <noreply@solarshop.ua>',
                            to: [input.to],
                            subject: input.subject,
                            text: (attachment === null || attachment === void 0 ? void 0 : attachment.kind) === 'link' ? "".concat(input.text, "\n\nPDF: ").concat(attachment.url) : input.text,
                        };
                        // Resend API поддерживает вложения через base64 content — https://resend.com/docs/api-reference/emails/send-email
                        if ((attachment === null || attachment === void 0 ? void 0 : attachment.kind) === 'inline') {
                            body.attachments = [{ filename: attachment.filename, content: attachment.base64 }];
                        }
                        return [4 /*yield*/, (0, fetch_with_retry_1.fetchWithRetry)('https://api.resend.com/emails', {
                                method: 'POST',
                                retries: 2,
                                headers: { Authorization: "Bearer ".concat(this.apiKey), 'Content-Type': 'application/json' },
                                body: JSON.stringify(body),
                            })];
                    case 1:
                        res = _a.sent();
                        if (!res.ok)
                            throw new Error("Resend API error: ".concat(res.status));
                        return [2 /*return*/];
                }
            });
        });
    };
    return ResendAdapter;
}());
var SmtpAdapter = /** @class */ (function () {
    function SmtpAdapter(host, port, user, password) {
        this.host = host;
        this.port = port;
        this.user = user;
        this.password = password;
    }
    SmtpAdapter.prototype.send = function (input) {
        return __awaiter(this, void 0, void 0, function () {
            var attachment, transporter;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        attachment = resolveAttachment(input.attachmentUrl);
                        transporter = nodemailer.createTransport({
                            host: this.host,
                            port: this.port,
                            secure: this.port === 465,
                            auth: { user: this.user, pass: this.password },
                        });
                        return [4 /*yield*/, transporter.sendMail({
                                from: this.user,
                                to: input.to,
                                subject: input.subject,
                                text: (attachment === null || attachment === void 0 ? void 0 : attachment.kind) === 'link' ? "".concat(input.text, "\n\nPDF: ").concat(attachment.url) : input.text,
                                attachments: (attachment === null || attachment === void 0 ? void 0 : attachment.kind) === 'inline'
                                    ? [{ filename: attachment.filename, content: attachment.base64, encoding: 'base64' }]
                                    : undefined,
                            })];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    return SmtpAdapter;
}());
var EmailService = function () {
    var _classDecorators = [(0, common_1.Injectable)()];
    var _classDescriptor;
    var _classExtraInitializers = [];
    var _classThis;
    var EmailService = _classThis = /** @class */ (function () {
        function EmailService_1(config) {
            this.config = config;
            this.logger = new common_1.Logger(EmailService.name);
        }
        EmailService_1.prototype.send = function (input) {
            return __awaiter(this, void 0, void 0, function () {
                var resendKey, err_1, smtpHost, smtpPort, smtpUser, smtpPassword, err_2, message;
                var _a;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            resendKey = this.config.get('EMAIL_API_KEY');
                            if (!resendKey) return [3 /*break*/, 4];
                            _b.label = 1;
                        case 1:
                            _b.trys.push([1, 3, , 4]);
                            return [4 /*yield*/, new ResendAdapter(resendKey).send(input)];
                        case 2:
                            _b.sent();
                            return [2 /*return*/, { sent: true, via: 'resend' }];
                        case 3:
                            err_1 = _b.sent();
                            this.logger.warn("Resend failed, falling back to SMTP: ".concat(err_1));
                            return [3 /*break*/, 4];
                        case 4:
                            smtpHost = this.config.get('SMTP_HOST');
                            smtpPort = Number((_a = this.config.get('SMTP_PORT')) !== null && _a !== void 0 ? _a : 587);
                            smtpUser = this.config.get('SMTP_USER');
                            smtpPassword = this.config.get('SMTP_PASSWORD');
                            if (!(smtpHost && smtpUser && smtpPassword)) return [3 /*break*/, 8];
                            _b.label = 5;
                        case 5:
                            _b.trys.push([5, 7, , 8]);
                            return [4 /*yield*/, new SmtpAdapter(smtpHost, smtpPort, smtpUser, smtpPassword).send(input)];
                        case 6:
                            _b.sent();
                            return [2 /*return*/, { sent: true, via: 'smtp' }];
                        case 7:
                            err_2 = _b.sent();
                            message = err_2 instanceof Error ? err_2.message : String(err_2);
                            this.logger.error("SMTP fallback also failed: ".concat(message));
                            return [2 /*return*/, { sent: false, via: null, error: message }];
                        case 8: return [2 /*return*/, { sent: false, via: null, error: 'Neither EMAIL_API_KEY (Resend) nor SMTP_* configured' }];
                    }
                });
            });
        };
        return EmailService_1;
    }());
    __setFunctionName(_classThis, "EmailService");
    (function () {
        var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        EmailService = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return EmailService = _classThis;
}();
exports.EmailService = EmailService;
