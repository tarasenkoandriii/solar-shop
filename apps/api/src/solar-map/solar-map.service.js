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
exports.SolarMapService = void 0;
var common_1 = require("@nestjs/common");
var idw_interpolation_1 = require("./idw-interpolation");
// Приблизительный bounding box Украины (без учёта временно оккупированных
// территорий отдельно — PVGIS отдаёт данные по координатам независимо от
// границ, это чисто климатологические данные)
var UKRAINE_BOUNDS = { latMin: 44.3, latMax: 52.4, lngMin: 22.0, lngMax: 40.3 };
var DEFAULT_INTERPOLATION_RESOLUTION = 60; // ~60 ячеек по большей стороне bounding box
// ТЗ п.34.2 — offline-этап: разовый прогон регулярной сетки точек по
// Украине через PVGIS API (расширение уже спроектированной модели
// SolarYieldEstimate, используется и калькулятором, и картой — общий кэш),
// затем IDW-интерполяция даёт непрерывный растр вместо дискретных точек.
//
// ОБНОВЛЕНО ПОСЛЕ ПОВТОРНОГО АУДИТА: точки хранятся/передаются в
// компактном формате-кортеже [lat, lng, value] (не {lat, lng, value}) —
// найдено, что объектный массив на тысячах точек означает многократное
// повторение одних и тех же ключей в JSON, реальные лишние байты на
// хранении (SolarMapInterpolatedGrid.cellsJson), в ответе публичного API
// (дёргается на каждой загрузке /solar-map) и в файле экспорта для
// миграции между окружениями (см. ниже). См. idw-interpolation.ts —
// toCompact()/fromCompact().
//
// ОСТАЮЩЕЕСЯ ЧЕСТНОЕ ОГРАНИЧЕНИЕ: результат интерполяции — плотный массив
// точек (JSON), не PMTiles-архив/растровые тайлы — построение реального
// PMTiles-конвейера требует GIS-тулинга (tippecanoe/GDAL-класса
// инструментов или растеризации через `canvas` с нативными биндингами),
// рискованного для serverless-деплоя на Vercel Hobby без возможности
// проверить сборку в этой среде.
var SolarMapService = function () {
    var _classDecorators = [(0, common_1.Injectable)()];
    var _classDescriptor;
    var _classExtraInitializers = [];
    var _classThis;
    var SolarMapService = _classThis = /** @class */ (function () {
        function SolarMapService_1(prisma, pvgis) {
            this.prisma = prisma;
            this.pvgis = pvgis;
            this.logger = new common_1.Logger(SolarMapService.name);
        }
        SolarMapService_1.prototype.getRawSamplePoints = function () {
            return __awaiter(this, void 0, void 0, function () {
                var rows;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.prisma.client.solarYieldEstimate.findMany({
                                where: { tiltDegrees: 35, azimuthDegrees: 0 },
                                select: { lat: true, lng: true, annualKwhPerKwp: true },
                            })];
                        case 1:
                            rows = _a.sent();
                            return [2 /*return*/, rows.map(function (r) { return ({ lat: r.lat, lng: r.lng, value: Number(r.annualKwhPerKwp) }); })];
                    }
                });
            });
        };
        // Публичный метод для карты — возвращает интерполированную сетку
        // компактными кортежами [lat, lng, annualKwhPerKwp]. Если кэш ещё не
        // построен — строит на лету и кэширует.
        SolarMapService_1.prototype.getGridPoints = function () {
            return __awaiter(this, arguments, void 0, function (resolution) {
                var cached;
                if (resolution === void 0) { resolution = DEFAULT_INTERPOLATION_RESOLUTION; }
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.prisma.client.solarMapInterpolatedGrid.findUnique({ where: { resolution: resolution } })];
                        case 1:
                            cached = _a.sent();
                            if (cached)
                                return [2 /*return*/, cached.cellsJson];
                            return [2 /*return*/, this.recomputeInterpolation(resolution)];
                    }
                });
            });
        };
        SolarMapService_1.prototype.recomputeInterpolation = function () {
            return __awaiter(this, arguments, void 0, function (resolution) {
                var samples, grid;
                if (resolution === void 0) { resolution = DEFAULT_INTERPOLATION_RESOLUTION; }
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.getRawSamplePoints()];
                        case 1:
                            samples = _a.sent();
                            if (samples.length === 0)
                                return [2 /*return*/, []];
                            grid = (0, idw_interpolation_1.toCompact)((0, idw_interpolation_1.buildInterpolatedGrid)(samples, UKRAINE_BOUNDS, resolution));
                            return [4 /*yield*/, this.prisma.client.solarMapInterpolatedGrid.upsert({
                                    where: { resolution: resolution },
                                    create: { resolution: resolution, cellsJson: grid, sourcePoints: samples.length },
                                    update: { cellsJson: grid, sourcePoints: samples.length, computedAt: new Date() },
                                })];
                        case 2:
                            _a.sent();
                            return [2 /*return*/, grid];
                    }
                });
            });
        };
        SolarMapService_1.prototype.recomputeGrid = function () {
            return __awaiter(this, arguments, void 0, function (stepDegrees) {
                var computed, failed, lat, lng, roundedLat, roundedLng, value, err_1, interpolated;
                if (stepDegrees === void 0) { stepDegrees = 1; }
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            computed = 0;
                            failed = 0;
                            lat = UKRAINE_BOUNDS.latMin;
                            _a.label = 1;
                        case 1:
                            if (!(lat <= UKRAINE_BOUNDS.latMax)) return [3 /*break*/, 8];
                            lng = UKRAINE_BOUNDS.lngMin;
                            _a.label = 2;
                        case 2:
                            if (!(lng <= UKRAINE_BOUNDS.lngMax)) return [3 /*break*/, 7];
                            roundedLat = Math.round(lat * 100) / 100;
                            roundedLng = Math.round(lng * 100) / 100;
                            _a.label = 3;
                        case 3:
                            _a.trys.push([3, 5, , 6]);
                            return [4 /*yield*/, this.pvgis.getAnnualKwhPerKwp(roundedLat, roundedLng)];
                        case 4:
                            value = _a.sent();
                            if (value !== null)
                                computed++;
                            else
                                failed++;
                            return [3 /*break*/, 6];
                        case 5:
                            err_1 = _a.sent();
                            this.logger.warn("Grid point (".concat(roundedLat, ", ").concat(roundedLng, ") failed: ").concat(err_1));
                            failed++;
                            return [3 /*break*/, 6];
                        case 6:
                            lng += stepDegrees;
                            return [3 /*break*/, 2];
                        case 7:
                            lat += stepDegrees;
                            return [3 /*break*/, 1];
                        case 8: return [4 /*yield*/, this.recomputeInterpolation()];
                        case 9:
                            interpolated = _a.sent();
                            return [2 /*return*/, { pointsComputed: computed, pointsFailed: failed, interpolatedCells: interpolated.length }];
                    }
                });
            });
        };
        // ---- Экспорт/импорт для миграции между окружениями ----
        // Тот же паттерн, что VendorDataTransferService (Фаза 2) — экспорт сырых
        // точек PVGIS (дорого пересчитывать заново без сетевого доступа к PVGIS
        // в целевом окружении, напр. локальная разработка) + закэшированных
        // интерполированных сеток разом, идемпотентный импорт.
        SolarMapService_1.prototype.exportData = function () {
            return __awaiter(this, void 0, void 0, function () {
                var rawRows, gridRows;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.prisma.client.solarYieldEstimate.findMany()];
                        case 1:
                            rawRows = _a.sent();
                            return [4 /*yield*/, this.prisma.client.solarMapInterpolatedGrid.findMany()];
                        case 2:
                            gridRows = _a.sent();
                            return [2 /*return*/, {
                                    formatVersion: 1,
                                    exportedAt: new Date().toISOString(),
                                    rawPoints: rawRows.map(function (r) { return ({
                                        lat: r.lat,
                                        lng: r.lng,
                                        tiltDegrees: r.tiltDegrees,
                                        azimuthDegrees: r.azimuthDegrees,
                                        annualKwhPerKwp: Number(r.annualKwhPerKwp),
                                    }); }),
                                    interpolatedGrids: gridRows.map(function (g) { return ({
                                        resolution: g.resolution,
                                        sourcePoints: g.sourcePoints,
                                        cells: g.cellsJson,
                                    }); }),
                                }];
                    }
                });
            });
        };
        SolarMapService_1.prototype.importData = function (payload) {
            return __awaiter(this, void 0, void 0, function () {
                var data, result, _i, _a, p, existing, err_2, _b, _c, g, existing, err_3;
                return __generator(this, function (_d) {
                    switch (_d.label) {
                        case 0:
                            data = this.validateImportPayload(payload);
                            result = { rawPointsCreated: 0, rawPointsUpdated: 0, gridsCreated: 0, gridsUpdated: 0, errors: [] };
                            _i = 0, _a = data.rawPoints;
                            _d.label = 1;
                        case 1:
                            if (!(_i < _a.length)) return [3 /*break*/, 10];
                            p = _a[_i];
                            _d.label = 2;
                        case 2:
                            _d.trys.push([2, 8, , 9]);
                            return [4 /*yield*/, this.prisma.client.solarYieldEstimate.findUnique({
                                    where: {
                                        lat_lng_tiltDegrees_azimuthDegrees: {
                                            lat: p.lat,
                                            lng: p.lng,
                                            tiltDegrees: p.tiltDegrees,
                                            azimuthDegrees: p.azimuthDegrees,
                                        },
                                    },
                                })];
                        case 3:
                            existing = _d.sent();
                            if (!existing) return [3 /*break*/, 5];
                            return [4 /*yield*/, this.prisma.client.solarYieldEstimate.update({
                                    where: { id: existing.id },
                                    data: { annualKwhPerKwp: p.annualKwhPerKwp, fetchedAt: new Date() },
                                })];
                        case 4:
                            _d.sent();
                            result.rawPointsUpdated++;
                            return [3 /*break*/, 7];
                        case 5: return [4 /*yield*/, this.prisma.client.solarYieldEstimate.create({
                                data: {
                                    lat: p.lat,
                                    lng: p.lng,
                                    tiltDegrees: p.tiltDegrees,
                                    azimuthDegrees: p.azimuthDegrees,
                                    annualKwhPerKwp: p.annualKwhPerKwp,
                                },
                            })];
                        case 6:
                            _d.sent();
                            result.rawPointsCreated++;
                            _d.label = 7;
                        case 7: return [3 /*break*/, 9];
                        case 8:
                            err_2 = _d.sent();
                            result.errors.push("point (".concat(p.lat, ", ").concat(p.lng, "): ").concat(err_2 instanceof Error ? err_2.message : err_2));
                            return [3 /*break*/, 9];
                        case 9:
                            _i++;
                            return [3 /*break*/, 1];
                        case 10:
                            _b = 0, _c = data.interpolatedGrids;
                            _d.label = 11;
                        case 11:
                            if (!(_b < _c.length)) return [3 /*break*/, 17];
                            g = _c[_b];
                            _d.label = 12;
                        case 12:
                            _d.trys.push([12, 15, , 16]);
                            return [4 /*yield*/, this.prisma.client.solarMapInterpolatedGrid.findUnique({ where: { resolution: g.resolution } })];
                        case 13:
                            existing = _d.sent();
                            return [4 /*yield*/, this.prisma.client.solarMapInterpolatedGrid.upsert({
                                    where: { resolution: g.resolution },
                                    create: { resolution: g.resolution, cellsJson: g.cells, sourcePoints: g.sourcePoints },
                                    update: { cellsJson: g.cells, sourcePoints: g.sourcePoints, computedAt: new Date() },
                                })];
                        case 14:
                            _d.sent();
                            if (existing)
                                result.gridsUpdated++;
                            else
                                result.gridsCreated++;
                            return [3 /*break*/, 16];
                        case 15:
                            err_3 = _d.sent();
                            result.errors.push("grid resolution=".concat(g.resolution, ": ").concat(err_3 instanceof Error ? err_3.message : err_3));
                            return [3 /*break*/, 16];
                        case 16:
                            _b++;
                            return [3 /*break*/, 11];
                        case 17: return [2 /*return*/, result];
                    }
                });
            });
        };
        SolarMapService_1.prototype.validateImportPayload = function (payload) {
            if (!payload || typeof payload !== 'object') {
                throw new Error("Некоректний файл — очікувався JSON-об'єкт");
            }
            var data = payload;
            if (data.formatVersion !== 1) {
                throw new Error("\u041D\u0435\u043F\u0456\u0434\u0442\u0440\u0438\u043C\u0443\u0432\u0430\u043D\u0430 \u0432\u0435\u0440\u0441\u0456\u044F \u0444\u043E\u0440\u043C\u0430\u0442\u0443: ".concat(data.formatVersion, " (\u043E\u0447\u0456\u043A\u0443\u0454\u0442\u044C\u0441\u044F 1)"));
            }
            if (!Array.isArray(data.rawPoints) || !Array.isArray(data.interpolatedGrids)) {
                throw new Error('Поля rawPoints/interpolatedGrids мають бути масивами');
            }
            return data;
        };
        return SolarMapService_1;
    }());
    __setFunctionName(_classThis, "SolarMapService");
    (function () {
        var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        SolarMapService = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return SolarMapService = _classThis;
}();
exports.SolarMapService = SolarMapService;
