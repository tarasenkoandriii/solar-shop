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
exports.PvgisService = void 0;
var common_1 = require("@nestjs/common");
var fetch_with_retry_1 = require("../common/fetch-with-retry");
// ТЗ п.31.10.2a — интеграция PVGIS (Photovoltaic Geographical Information
// System), бесплатный публичный API Объединённого исследовательского
// центра Еврокомиссии. Эндпоинт и структура ответа (outputs.totals.fixed.
// E_y) подтверждены через web_search документации JRC на этапе написания
// кода — не выдуманы (сеть песочницы не пускает на сам re.jrc.ec.europa.eu,
// поэтому реальный вызов в этой сессии не протестирован).
var PvgisService = function () {
    var _classDecorators = [(0, common_1.Injectable)()];
    var _classDescriptor;
    var _classExtraInitializers = [];
    var _classThis;
    var PvgisService = _classThis = /** @class */ (function () {
        function PvgisService_1(prisma) {
            this.prisma = prisma;
            this.logger = new common_1.Logger(PvgisService.name);
            this.apiUrl = 'https://re.jrc.ec.europa.eu/api/v5_2/PVcalc';
        }
        // Кэш практически без срока годности (климатология не меняется год к
        // году) — новый вызов PVGIS только для координат, которых ещё нет в кэше.
        PvgisService_1.prototype.getAnnualKwhPerKwp = function (lat_1, lng_1) {
            return __awaiter(this, arguments, void 0, function (lat, lng, tiltDegrees, azimuthDegrees) {
                var cached, url, res, data, annualKwhPerKwp, err_1;
                var _a, _b, _c;
                if (tiltDegrees === void 0) { tiltDegrees = 35; }
                if (azimuthDegrees === void 0) { azimuthDegrees = 0; }
                return __generator(this, function (_d) {
                    switch (_d.label) {
                        case 0: return [4 /*yield*/, this.prisma.client.solarYieldEstimate.findUnique({
                                where: { lat_lng_tiltDegrees_azimuthDegrees: { lat: lat, lng: lng, tiltDegrees: tiltDegrees, azimuthDegrees: azimuthDegrees } },
                            })];
                        case 1:
                            cached = _d.sent();
                            if (cached)
                                return [2 /*return*/, Number(cached.annualKwhPerKwp)];
                            _d.label = 2;
                        case 2:
                            _d.trys.push([2, 6, , 7]);
                            url = "".concat(this.apiUrl, "?lat=").concat(lat, "&lon=").concat(lng, "&peakpower=1&loss=14&angle=").concat(tiltDegrees, "&aspect=").concat(azimuthDegrees, "&outputformat=json");
                            return [4 /*yield*/, (0, fetch_with_retry_1.fetchWithRetry)(url, { retries: 2, timeoutMs: 15000 })];
                        case 3:
                            res = _d.sent();
                            if (!res.ok)
                                throw new Error("PVGIS HTTP ".concat(res.status));
                            return [4 /*yield*/, res.json()];
                        case 4:
                            data = (_d.sent());
                            annualKwhPerKwp = (_c = (_b = (_a = data.outputs) === null || _a === void 0 ? void 0 : _a.totals) === null || _b === void 0 ? void 0 : _b.fixed) === null || _c === void 0 ? void 0 : _c.E_y;
                            if (typeof annualKwhPerKwp !== 'number')
                                throw new Error('PVGIS response missing outputs.totals.fixed.E_y');
                            return [4 /*yield*/, this.prisma.client.solarYieldEstimate.create({
                                    data: { lat: lat, lng: lng, tiltDegrees: tiltDegrees, azimuthDegrees: azimuthDegrees, annualKwhPerKwp: annualKwhPerKwp },
                                })];
                        case 5:
                            _d.sent();
                            return [2 /*return*/, annualKwhPerKwp];
                        case 6:
                            err_1 = _d.sent();
                            // ТЗ: "если PVGIS недоступен или город вне покрытия — аннотация
                            // генерируется без этого блока, не блокируется полностью"
                            this.logger.warn("PVGIS unavailable for (".concat(lat, ", ").concat(lng, "): ").concat(err_1));
                            return [2 /*return*/, null];
                        case 7: return [2 /*return*/];
                    }
                });
            });
        };
        // Ручное обновление кэша из админки (кнопка «Обновить») — TZ п.31.10.2a шаг 2
        PvgisService_1.prototype.refresh = function (lat_1, lng_1) {
            return __awaiter(this, arguments, void 0, function (lat, lng, tiltDegrees, azimuthDegrees) {
                if (tiltDegrees === void 0) { tiltDegrees = 35; }
                if (azimuthDegrees === void 0) { azimuthDegrees = 0; }
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.prisma.client.solarYieldEstimate
                                .delete({ where: { lat_lng_tiltDegrees_azimuthDegrees: { lat: lat, lng: lng, tiltDegrees: tiltDegrees, azimuthDegrees: azimuthDegrees } } })
                                .catch(function () { return undefined; })];
                        case 1:
                            _a.sent(); // не страшно, если записи ещё не было
                            return [2 /*return*/, this.getAnnualKwhPerKwp(lat, lng, tiltDegrees, azimuthDegrees)];
                    }
                });
            });
        };
        return PvgisService_1;
    }());
    __setFunctionName(_classThis, "PvgisService");
    (function () {
        var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        PvgisService = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return PvgisService = _classThis;
}();
exports.PvgisService = PvgisService;
