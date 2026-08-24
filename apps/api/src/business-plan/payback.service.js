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
exports.PaybackService = void 0;
var common_1 = require("@nestjs/common");
// ТЗ п.31.11.1a — расчёт окупаемости: чистая арифметика над уже
// закэшированными SolarYieldEstimate+TariffRate, Grok здесь не вызывается
// вообще (в отличие от текстовой аннотации) — не создаёт нагрузки на
// бюджет ИИ-вызовов.
var PaybackService = function () {
    var _classDecorators = [(0, common_1.Injectable)()];
    var _classDescriptor;
    var _classExtraInitializers = [];
    var _classThis;
    var PaybackService = _classThis = /** @class */ (function () {
        function PaybackService_1(prisma, pvgis) {
            this.prisma = prisma;
            this.pvgis = pvgis;
        }
        PaybackService_1.prototype.compute = function (estimateId) {
            return __awaiter(this, void 0, void 0, function () {
                var estimate, city, spec, panelsWattTotal, _i, _a, item, product, powerW, perKwp, annualKwh, tariffKey, tariff, rateUahPerKwh, annualSavingsOrIncomeUah, totalUah, paybackYearsCentral;
                var _b, _c;
                return __generator(this, function (_d) {
                    switch (_d.label) {
                        case 0: return [4 /*yield*/, this.prisma.client.projectEstimate.findUnique({ where: { id: estimateId } })];
                        case 1:
                            estimate = _d.sent();
                            if (!estimate || !estimate.cityRef)
                                return [2 /*return*/, null];
                            return [4 /*yield*/, this.prisma.client.novaPoshtaCity.findUnique({ where: { ref: estimate.cityRef } })];
                        case 2:
                            city = _d.sent();
                            if (!(city === null || city === void 0 ? void 0 : city.lat) || !(city === null || city === void 0 ? void 0 : city.lng))
                                return [2 /*return*/, null];
                            spec = estimate.recommendedSpec;
                            panelsWattTotal = 0;
                            _i = 0, _a = spec.filter(function (i) { return i.category === 'SOLAR_PANEL'; });
                            _d.label = 3;
                        case 3:
                            if (!(_i < _a.length)) return [3 /*break*/, 6];
                            item = _a[_i];
                            return [4 /*yield*/, this.prisma.client.product.findUnique({ where: { id: item.productId } })];
                        case 4:
                            product = _d.sent();
                            if (product) {
                                powerW = Number((_b = product.specs.powerW) !== null && _b !== void 0 ? _b : 0);
                                panelsWattTotal += powerW * item.quantity;
                            }
                            _d.label = 5;
                        case 5:
                            _i++;
                            return [3 /*break*/, 3];
                        case 6:
                            if (panelsWattTotal === 0)
                                return [2 /*return*/, null];
                            return [4 /*yield*/, this.pvgis.getAnnualKwhPerKwp(city.lat, city.lng)];
                        case 7:
                            perKwp = _d.sent();
                            if (!perKwp)
                                return [2 /*return*/, null];
                            annualKwh = perKwp * (panelsWattTotal / 1000);
                            tariffKey = estimate.goals.includes('GREEN_TARIFF') ? 'GREEN_TARIFF' : 'RETAIL_AVERAGE';
                            return [4 /*yield*/, this.prisma.client.tariffRate.findUnique({ where: { key: tariffKey } })];
                        case 8:
                            tariff = _d.sent();
                            if (!tariff)
                                return [2 /*return*/, null];
                            rateUahPerKwh = Number(tariff.rateUahPerKwh);
                            annualSavingsOrIncomeUah = annualKwh * rateUahPerKwh;
                            totalUah = Number((_c = estimate.totalUah) !== null && _c !== void 0 ? _c : Number(estimate.totalUsd) * (estimate.exchangeRateUah ? Number(estimate.exchangeRateUah) : 41.5));
                            paybackYearsCentral = annualSavingsOrIncomeUah > 0 ? totalUah / annualSavingsOrIncomeUah : Infinity;
                            // ТЗ п.31.11.1a шаг 5 — несимметричный диапазон, не точная цифра
                            return [2 /*return*/, {
                                    annualKwh: annualKwh,
                                    rateUahPerKwh: rateUahPerKwh,
                                    tariffLabel: tariff.label,
                                    annualSavingsOrIncomeUah: annualSavingsOrIncomeUah,
                                    paybackYearsCentral: paybackYearsCentral,
                                    paybackYearsMin: paybackYearsCentral * 0.8,
                                    paybackYearsMax: paybackYearsCentral * 1.25,
                                }];
                    }
                });
            });
        };
        return PaybackService_1;
    }());
    __setFunctionName(_classThis, "PaybackService");
    (function () {
        var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        PaybackService = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return PaybackService = _classThis;
}();
exports.PaybackService = PaybackService;
