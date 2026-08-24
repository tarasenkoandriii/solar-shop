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
exports.fetchWithRetry = fetchWithRetry;
// Единая точка ретраев/backoff для всех внешних вызовов (ТЗ п.28.5) —
// адаптеры парсера товаров, NovaPoshtaService, NbuRateService, GrokService,
// парсер статей. Экспоненциальный backoff: backoffMs * 2^attempt.
function fetchWithRetry(url_1) {
    return __awaiter(this, arguments, void 0, function (url, options) {
        var _a, retries, _b, backoffMs, _c, timeoutMs, onRetry, fetchOptions, lastError, _loop_1, attempt, state_1;
        if (options === void 0) { options = {}; }
        return __generator(this, function (_d) {
            switch (_d.label) {
                case 0:
                    _a = options.retries, retries = _a === void 0 ? 3 : _a, _b = options.backoffMs, backoffMs = _b === void 0 ? 500 : _b, _c = options.timeoutMs, timeoutMs = _c === void 0 ? 10000 : _c, onRetry = options.onRetry, fetchOptions = __rest(options, ["retries", "backoffMs", "timeoutMs", "onRetry"]);
                    _loop_1 = function (attempt) {
                        var controller, timeout, res, error_1;
                        return __generator(this, function (_e) {
                            switch (_e.label) {
                                case 0:
                                    controller = new AbortController();
                                    timeout = setTimeout(function () { return controller.abort(); }, timeoutMs);
                                    _e.label = 1;
                                case 1:
                                    _e.trys.push([1, 5, , 8]);
                                    return [4 /*yield*/, fetch(url, __assign(__assign({}, fetchOptions), { signal: controller.signal }))];
                                case 2:
                                    res = _e.sent();
                                    clearTimeout(timeout);
                                    if (!(!res.ok && res.status >= 500 && attempt < retries)) return [3 /*break*/, 4];
                                    lastError = new Error("HTTP ".concat(res.status, " at ").concat(url));
                                    onRetry === null || onRetry === void 0 ? void 0 : onRetry(attempt + 1, lastError);
                                    return [4 /*yield*/, sleep(backoffMs * Math.pow(2, attempt))];
                                case 3:
                                    _e.sent();
                                    return [2 /*return*/, "continue"];
                                case 4: return [2 /*return*/, { value: res }];
                                case 5:
                                    error_1 = _e.sent();
                                    clearTimeout(timeout);
                                    lastError = error_1;
                                    if (!(attempt < retries)) return [3 /*break*/, 7];
                                    onRetry === null || onRetry === void 0 ? void 0 : onRetry(attempt + 1, error_1);
                                    return [4 /*yield*/, sleep(backoffMs * Math.pow(2, attempt))];
                                case 6:
                                    _e.sent();
                                    return [2 /*return*/, "continue"];
                                case 7: return [3 /*break*/, 8];
                                case 8: return [2 /*return*/];
                            }
                        });
                    };
                    attempt = 0;
                    _d.label = 1;
                case 1:
                    if (!(attempt <= retries)) return [3 /*break*/, 4];
                    return [5 /*yield**/, _loop_1(attempt)];
                case 2:
                    state_1 = _d.sent();
                    if (typeof state_1 === "object")
                        return [2 /*return*/, state_1.value];
                    _d.label = 3;
                case 3:
                    attempt++;
                    return [3 /*break*/, 1];
                case 4: throw lastError instanceof Error ? lastError : new Error("fetchWithRetry exhausted retries for ".concat(url));
            }
        });
    });
}
function sleep(ms) {
    return new Promise(function (resolve) { return setTimeout(resolve, ms); });
}
