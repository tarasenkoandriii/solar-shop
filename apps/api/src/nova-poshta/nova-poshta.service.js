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
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.NovaPoshtaService = void 0;
var common_1 = require("@nestjs/common");
var fetch_with_retry_1 = require("../common/fetch-with-retry");
// Nova Poshta API v2.0 client — портировано из проверенного в проде адаптера
// (SilverFinance/sibionics-ai lineage, silverfinance-main/src/lib/server/
// nova-poshta.ts), а не написано с нуля. Ключевые вещи, взятые как есть,
// потому что уже отработали на живом трафике:
// - `Address.searchSettlements` для поиска городов (не `getSettlements` —
//   последний для полного дампа справочника, первый — именно под
//   автокомплит по запросу пользователя и отдаёт нужный `DeliveryCity` ref)
// - двойной фолбэк CityRef → SettlementRef при получении отделений (не
//   у всех населённых пунктов совпадает)
// - точная структура полей `InternetDocument/save`, нормализация телефона
//   в формат 380XXXXXXXXX
var NovaPoshtaService = function () {
    var _classDecorators = [(0, common_1.Injectable)()];
    var _classDescriptor;
    var _classExtraInitializers = [];
    var _classThis;
    var NovaPoshtaService = _classThis = /** @class */ (function () {
        function NovaPoshtaService_1(config, prisma) {
            var _a;
            this.config = config;
            this.prisma = prisma;
            this.logger = new common_1.Logger(NovaPoshtaService.name);
            this.apiUrl = (_a = this.config.get('NOVA_POSHTA_API_URL')) !== null && _a !== void 0 ? _a : 'https://api.novaposhta.ua/v2.0/json/';
        }
        NovaPoshtaService_1.prototype.env = function (key, fallback) {
            var _a;
            if (fallback === void 0) { fallback = ''; }
            return (_a = this.config.get(key)) !== null && _a !== void 0 ? _a : fallback;
        };
        NovaPoshtaService_1.prototype.npRequest = function (modelName, calledMethod, methodProperties) {
            return __awaiter(this, void 0, void 0, function () {
                var apiKey, res, text, payload, details;
                var _a, _b, _c, _d;
                return __generator(this, function (_e) {
                    switch (_e.label) {
                        case 0:
                            apiKey = this.env('NOVA_POSHTA_API_KEY');
                            if (!apiKey)
                                throw new Error('NOVA_POSHTA_API_KEY not set');
                            return [4 /*yield*/, (0, fetch_with_retry_1.fetchWithRetry)(this.apiUrl, {
                                    method: 'POST',
                                    retries: 2,
                                    headers: { 'Content-Type': 'application/json; charset=utf-8' },
                                    body: JSON.stringify({ apiKey: apiKey, modelName: modelName, calledMethod: calledMethod, methodProperties: methodProperties }),
                                })];
                        case 1:
                            res = _e.sent();
                            return [4 /*yield*/, res.text()];
                        case 2:
                            text = _e.sent();
                            try {
                                payload = JSON.parse(text);
                            }
                            catch (_f) {
                                throw new Error("Nova Poshta non-JSON response: ".concat(text.slice(0, 300)));
                            }
                            if (!res.ok || payload.success === false) {
                                details = __spreadArray(__spreadArray(__spreadArray([], ((_a = payload.errors) !== null && _a !== void 0 ? _a : []), true), ((_b = payload.warnings) !== null && _b !== void 0 ? _b : []), true), ((_c = payload.errorCodes) !== null && _c !== void 0 ? _c : []), true).filter(Boolean);
                                throw new Error(details.length ? details.join('; ') : "Nova Poshta HTTP ".concat(res.status));
                            }
                            return [2 /*return*/, { data: (_d = payload.data) !== null && _d !== void 0 ? _d : [] }];
                    }
                });
            });
        };
        NovaPoshtaService_1.prototype.normalizePhone = function (phone) {
            var d = phone.replace(/\D/g, '');
            if (d.startsWith('380'))
                return d;
            if (d.startsWith('0'))
                return "38".concat(d);
            return d;
        };
        NovaPoshtaService_1.prototype.npDate = function (date) {
            if (date === void 0) { date = new Date(); }
            return new Intl.DateTimeFormat('uk-UA', {
                timeZone: 'Europe/Kyiv',
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
            })
                .format(date)
                .replace(/\//g, '.');
        };
        // Автокомплит города при чекауті (ТЗ п.22.1) — живий пошук через
        // searchSettlements (не з локального кешу), той самий метод, що вже
        // перевірений у SilverFinance.
        NovaPoshtaService_1.prototype.searchCities = function (query) {
            return __awaiter(this, void 0, void 0, function () {
                var data, addresses;
                var _a, _b;
                return __generator(this, function (_c) {
                    switch (_c.label) {
                        case 0:
                            if (!query || query.trim().length < 2)
                                return [2 /*return*/, []];
                            return [4 /*yield*/, this.npRequest('Address', 'searchSettlements', { CityName: query.trim(), Limit: '15' })];
                        case 1:
                            data = (_c.sent()).data;
                            addresses = ((_b = (_a = data[0]) === null || _a === void 0 ? void 0 : _a.Addresses) !== null && _b !== void 0 ? _b : []);
                            return [2 /*return*/, addresses
                                    .map(function (a) { return ({
                                    ref: a.DeliveryCity || a.Ref || '',
                                    name: a.MainDescription || a.Present || '',
                                    area: a.Area || a.ParentRegionTypes || '',
                                }); })
                                    .filter(function (c) { return c.ref; })];
                    }
                });
            });
        };
        NovaPoshtaService_1.prototype.getWarehouses = function (cityRef_1) {
            return __awaiter(this, arguments, void 0, function (cityRef, query) {
                var map, find, data, rows;
                if (query === void 0) { query = ''; }
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            if (!cityRef)
                                return [2 /*return*/, []];
                            map = function (data) {
                                return data
                                    .map(function (w) { var _a, _b, _c; return ({ ref: (_a = w.Ref) !== null && _a !== void 0 ? _a : '', name: (_b = w.Description) !== null && _b !== void 0 ? _b : '', number: String((_c = w.Number) !== null && _c !== void 0 ? _c : '') }); })
                                    .filter(function (w) { return w.ref; });
                            };
                            find = query.trim() ? { FindByString: query.trim() } : {};
                            return [4 /*yield*/, this.npRequest('Address', 'getWarehouses', __assign({ CityRef: cityRef, Limit: '500' }, find))];
                        case 1:
                            data = (_a.sent()).data;
                            rows = map(data);
                            if (!(rows.length === 0)) return [3 /*break*/, 3];
                            return [4 /*yield*/, this.npRequest('Address', 'getWarehouses', __assign({ SettlementRef: cityRef, Limit: '500' }, find))];
                        case 2:
                            (data = (_a.sent()).data);
                            rows = map(data);
                            _a.label = 3;
                        case 3: return [2 /*return*/, rows];
                    }
                });
            });
        };
        // ТЗ п.22.2 — создаётся сразу при сабмите заказа, до оплаты. Ошибка НЕ
        // бросается наружу — возвращается { status: 'failed' }, вызывающий код
        // (OrdersService) решает, что делать (как в SilverFinance: заказ создаётся
        // в любом случае, TTN можно досоздать вручную).
        NovaPoshtaService_1.prototype.createTtn = function (input) {
            return __awaiter(this, void 0, void 0, function () {
                var weight, props, data, first, ttn, e_1;
                var _a;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            _b.trys.push([0, 2, , 3]);
                            weight = Number(this.env('NOVA_POSHTA_DEFAULT_WEIGHT_KG', '0.5')) || 0.5;
                            props = {
                                PayerType: this.env('NOVA_POSHTA_PAYER_TYPE', 'Recipient'),
                                PaymentMethod: this.env('NOVA_POSHTA_PAYMENT_METHOD', 'Cash'),
                                CargoType: this.env('NOVA_POSHTA_CARGO_TYPE', 'Parcel'),
                                VolumeGeneral: this.env('NOVA_POSHTA_DEFAULT_VOLUME', '0.002'),
                                Weight: String(weight),
                                ServiceType: 'WarehouseWarehouse',
                                SeatsAmount: '1',
                                Description: input.description.slice(0, 100),
                                Cost: String(Math.max(1, Math.round(input.costUah))),
                                CitySender: this.env('NOVA_POSHTA_CITY_SENDER_REF'),
                                Sender: this.env('NOVA_POSHTA_SENDER_REF'),
                                SenderAddress: this.env('NOVA_POSHTA_SENDER_ADDRESS_REF'),
                                ContactSender: this.env('NOVA_POSHTA_CONTACT_SENDER_REF'),
                                SendersPhone: this.normalizePhone(this.env('NOVA_POSHTA_SENDER_PHONE')),
                                RecipientCityName: input.cityName,
                                RecipientName: input.recipientName,
                                RecipientType: 'PrivatePerson',
                                RecipientsPhone: this.normalizePhone(input.recipientPhone),
                                DateTime: this.npDate(),
                                NewAddress: '1',
                            };
                            if (input.warehouseRef) {
                                props.RecipientAddress = input.warehouseRef;
                            }
                            else {
                                props.RecipientAddressName = input.branchName.replace(/\D/g, '') || input.branchName;
                            }
                            return [4 /*yield*/, this.npRequest('InternetDocument', 'save', props)];
                        case 1:
                            data = (_b.sent()).data;
                            first = ((_a = data[0]) !== null && _a !== void 0 ? _a : {});
                            ttn = first.IntDocNumber || first.Number;
                            if (!ttn)
                                return [2 /*return*/, { status: 'failed', error: 'No TTN returned' }];
                            return [2 /*return*/, { status: 'created', ttn: ttn, uuid: first.Ref }];
                        case 2:
                            e_1 = _b.sent();
                            this.logger.warn("createTtn failed: ".concat(e_1 instanceof Error ? e_1.message : e_1));
                            return [2 /*return*/, { status: 'failed', error: e_1 instanceof Error ? e_1.message : 'TTN error' }];
                        case 3: return [2 /*return*/];
                    }
                });
            });
        };
        NovaPoshtaService_1.prototype.getPrintLabelUrl = function (ttnRefs) {
            return __awaiter(this, void 0, void 0, function () {
                var apiKey, refsParam;
                return __generator(this, function (_a) {
                    apiKey = this.env('NOVA_POSHTA_API_KEY');
                    refsParam = ttnRefs.join(',');
                    return [2 /*return*/, "https://my.novaposhta.ua/orders/printMarking60x100/orders[]/".concat(refsParam, "/type/pdf/apiKey/").concat(apiKey)];
                });
            });
        };
        NovaPoshtaService_1.prototype.deleteTtn = function (ttnRef) {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.npRequest('InternetDocument', 'delete', { DocumentRefs: ttnRef })];
                        case 1:
                            _a.sent();
                            return [2 /*return*/];
                    }
                });
            });
        };
        // Суточный крон nova_poshta_directory_sync (ТЗ п.16/27.1) — не используется
        // для самого автокомплита (тот теперь живой, см. searchCities выше), но
        // держим локальный кэш для сопоставления Vercel geo-заголовка города при
        // чекауте (ТЗ п.29.3) без лишнего вызова API на каждый визит.
        NovaPoshtaService_1.prototype.syncDirectory = function () {
            return __awaiter(this, void 0, void 0, function () {
                var citiesRaw, cities, _i, cities_1, city, warehouseCount, majorCities, _a, majorCities_1, city, warehouses, _b, warehouses_1, wh;
                return __generator(this, function (_c) {
                    switch (_c.label) {
                        case 0: return [4 /*yield*/, this.npRequest('Address', 'getSettlements', { Limit: 5000 })];
                        case 1:
                            citiesRaw = (_c.sent()).data;
                            cities = citiesRaw;
                            _i = 0, cities_1 = cities;
                            _c.label = 2;
                        case 2:
                            if (!(_i < cities_1.length)) return [3 /*break*/, 5];
                            city = cities_1[_i];
                            return [4 /*yield*/, this.prisma.client.novaPoshtaCity.upsert({
                                    where: { ref: city.Ref },
                                    create: { ref: city.Ref, name: city.Description, region: city.AreaDescription },
                                    update: { name: city.Description, region: city.AreaDescription },
                                })];
                        case 3:
                            _c.sent();
                            _c.label = 4;
                        case 4:
                            _i++;
                            return [3 /*break*/, 2];
                        case 5:
                            warehouseCount = 0;
                            return [4 /*yield*/, this.prisma.client.novaPoshtaCity.findMany({
                                    where: { name: { in: ['Київ', 'Харків', 'Одеса', 'Львів', 'Дніпро'] } },
                                })];
                        case 6:
                            majorCities = _c.sent();
                            _a = 0, majorCities_1 = majorCities;
                            _c.label = 7;
                        case 7:
                            if (!(_a < majorCities_1.length)) return [3 /*break*/, 13];
                            city = majorCities_1[_a];
                            return [4 /*yield*/, this.getWarehouses(city.ref)];
                        case 8:
                            warehouses = _c.sent();
                            _b = 0, warehouses_1 = warehouses;
                            _c.label = 9;
                        case 9:
                            if (!(_b < warehouses_1.length)) return [3 /*break*/, 12];
                            wh = warehouses_1[_b];
                            return [4 /*yield*/, this.prisma.client.novaPoshtaWarehouse.upsert({
                                    where: { ref: wh.ref },
                                    create: { ref: wh.ref, cityRef: city.ref, name: wh.name },
                                    update: { name: wh.name },
                                })];
                        case 10:
                            _c.sent();
                            warehouseCount++;
                            _c.label = 11;
                        case 11:
                            _b++;
                            return [3 /*break*/, 9];
                        case 12:
                            _a++;
                            return [3 /*break*/, 7];
                        case 13: return [2 /*return*/, { cities: cities.length, warehouses: warehouseCount }];
                    }
                });
            });
        };
        return NovaPoshtaService_1;
    }());
    __setFunctionName(_classThis, "NovaPoshtaService");
    (function () {
        var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        NovaPoshtaService = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return NovaPoshtaService = _classThis;
}();
exports.NovaPoshtaService = NovaPoshtaService;
