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
exports.OrdersService = void 0;
var common_1 = require("@nestjs/common");
var OrdersService = function () {
    var _classDecorators = [(0, common_1.Injectable)()];
    var _classDescriptor;
    var _classExtraInitializers = [];
    var _classThis;
    var OrdersService = _classThis = /** @class */ (function () {
        function OrdersService_1(prisma, cart, products, loyalty, novaPoshta, notify, invoice) {
            this.prisma = prisma;
            this.cart = cart;
            this.products = products;
            this.loyalty = loyalty;
            this.novaPoshta = novaPoshta;
            this.notify = notify;
            this.invoice = invoice;
            this.logger = new common_1.Logger(OrdersService.name);
        }
        // ТЗ п.19.2 — оформление из корзины, доступно и гостю.
        OrdersService_1.prototype.checkoutFromCart = function (userId, sessionId, dto) {
            return __awaiter(this, void 0, void 0, function () {
                var cart, items, order;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            this.assertConsent(dto);
                            return [4 /*yield*/, this.cart.getCart(userId, sessionId)];
                        case 1:
                            cart = _a.sent();
                            if (!cart.items || cart.items.length === 0)
                                throw new common_1.BadRequestException('Cart is empty');
                            items = cart.items.map(function (i) { return ({
                                productId: i.productId,
                                listingId: i.listingId,
                                quantity: i.quantity,
                                priceUsd: Number(i.priceSnapshot),
                            }); });
                            return [4 /*yield*/, this.createOrder(userId, items, dto)];
                        case 2:
                            order = _a.sent();
                            return [4 /*yield*/, this.cart.clearCart(cart.id)];
                        case 3:
                            _a.sent();
                            return [2 /*return*/, order];
                    }
                });
            });
        };
        // ТЗ п.3.3/19.2 — "Купить в 1 клик", создаёт Order из одной позиции без корзины.
        OrdersService_1.prototype.buyNow = function (userId, dto) {
            return __awaiter(this, void 0, void 0, function () {
                var cheapest, items;
                var _a;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            this.assertConsent(dto);
                            return [4 /*yield*/, this.products.getCheapestInStockListing(dto.productId)];
                        case 1:
                            cheapest = _b.sent();
                            if (!cheapest)
                                throw new common_1.BadRequestException('Product has no in-stock listing right now');
                            items = [
                                {
                                    productId: dto.productId,
                                    listingId: cheapest.sourceListingId,
                                    quantity: (_a = dto.quantity) !== null && _a !== void 0 ? _a : 1,
                                    priceUsd: Number(cheapest.sourceListing.priceUsd),
                                },
                            ];
                            return [2 /*return*/, this.createOrder(userId, items, dto)];
                    }
                });
            });
        };
        OrdersService_1.prototype.assertConsent = function (dto) {
            // ТЗ п.28.6 — обязательный чекбокс согласия на обработку ПД, валидация и на бэке
            if (!dto.consentGiven) {
                throw new common_1.BadRequestException('Consent to personal data processing is required');
            }
        };
        OrdersService_1.prototype.createOrder = function (userId, items, dto) {
            return __awaiter(this, void 0, void 0, function () {
                var subtotalUsd, loyaltyDiscountPercent, rate, exchangeRateUah, totalUsd, totalUah, order, ttn;
                var _a, _b;
                return __generator(this, function (_c) {
                    switch (_c.label) {
                        case 0:
                            subtotalUsd = items.reduce(function (sum, i) { return sum + i.priceUsd * i.quantity; }, 0);
                            return [4 /*yield*/, this.loyalty.getDiscountForUser(userId)];
                        case 1:
                            loyaltyDiscountPercent = _c.sent();
                            return [4 /*yield*/, this.prisma.client.exchangeRate.findFirst({
                                    where: { currency: 'USD' },
                                    orderBy: { rateDate: 'desc' },
                                })];
                        case 2:
                            rate = _c.sent();
                            exchangeRateUah = rate ? Number(rate.rateUah) : 41.5;
                            totalUsd = subtotalUsd * (1 - loyaltyDiscountPercent / 100);
                            totalUah = totalUsd * exchangeRateUah;
                            return [4 /*yield*/, this.prisma.client.order.create({
                                    data: {
                                        userId: userId !== null && userId !== void 0 ? userId : undefined,
                                        contactName: dto.contactName,
                                        contactPhone: dto.contactPhone,
                                        comment: dto.comment,
                                        subtotalUsd: subtotalUsd,
                                        loyaltyDiscountPercent: loyaltyDiscountPercent,
                                        totalUsd: totalUsd,
                                        exchangeRateUah: exchangeRateUah,
                                        totalUah: totalUah,
                                        source: dto.source,
                                        consentGivenAt: new Date(),
                                        npCityRef: dto.npCityRef,
                                        npCityName: dto.npCityName,
                                        npWarehouseRef: dto.npWarehouseRef,
                                        npWarehouseName: dto.npWarehouseName,
                                        npRecipientName: dto.contactName,
                                        npRecipientPhone: dto.contactPhone,
                                        items: {
                                            create: items.map(function (i) { return ({
                                                productId: i.productId,
                                                listingId: i.listingId,
                                                quantity: i.quantity,
                                                priceUsd: i.priceUsd,
                                            }); }),
                                        },
                                    },
                                    include: { items: { include: { product: true } } },
                                })];
                        case 3:
                            order = _c.sent();
                            if (!(dto.npCityName && (dto.npWarehouseRef || dto.npWarehouseName))) return [3 /*break*/, 8];
                            return [4 /*yield*/, this.novaPoshta.createTtn({
                                    recipientName: dto.contactName,
                                    recipientPhone: dto.contactPhone,
                                    cityName: dto.npCityName,
                                    warehouseRef: dto.npWarehouseRef,
                                    branchName: (_a = dto.npWarehouseName) !== null && _a !== void 0 ? _a : '',
                                    description: order.items.map(function (i) { return i.product.articleNumber; }).join(', '),
                                    costUah: totalUah,
                                })];
                        case 4:
                            ttn = _c.sent();
                            if (!(ttn.status === 'created' && ttn.ttn)) return [3 /*break*/, 6];
                            return [4 /*yield*/, this.prisma.client.order.update({
                                    where: { id: order.id },
                                    data: { ttnNumber: ttn.ttn, ttnRef: ttn.uuid, ttnStatus: 'RESERVED' },
                                })];
                        case 5:
                            _c.sent();
                            return [3 /*break*/, 8];
                        case 6:
                            this.logger.warn("TTN auto-creation failed for order ".concat(order.id, ": ").concat(ttn.error));
                            return [4 /*yield*/, this.notify.notifyTtnCreationFailed(order.id, (_b = ttn.error) !== null && _b !== void 0 ? _b : 'unknown error')];
                        case 7:
                            _c.sent();
                            _c.label = 8;
                        case 8: return [4 /*yield*/, this.notify.notifyNewOrder({
                                id: order.id,
                                contactName: order.contactName,
                                contactPhone: order.contactPhone,
                                totalUah: Number(order.totalUah),
                                itemsSummary: order.items.map(function (i) { return "".concat(i.product.name, " \u00D7 ").concat(i.quantity); }).join(', '),
                            })];
                        case 9:
                            _c.sent();
                            return [2 /*return*/, this.findById(order.id)];
                    }
                });
            });
        };
        OrdersService_1.prototype.findById = function (id) {
            return __awaiter(this, void 0, void 0, function () {
                var order;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.prisma.client.order.findUnique({
                                where: { id: id },
                                include: { items: { include: { product: true } } },
                            })];
                        case 1:
                            order = _a.sent();
                            if (!order)
                                throw new common_1.NotFoundException('Order not found');
                            return [2 /*return*/, order];
                    }
                });
            });
        };
        // ТЗ п.23.1 — /account/orders, только свои заказы
        OrdersService_1.prototype.findMyOrders = function (userId) {
            return this.prisma.client.order.findMany({
                where: { userId: userId },
                include: { items: { include: { product: true } } },
                orderBy: { createdAt: 'desc' },
            });
        };
        OrdersService_1.prototype.findAllForAdmin = function (status) {
            return this.prisma.client.order.findMany({
                where: status ? { status: status } : undefined,
                include: { items: { include: { product: true } }, user: true },
                orderBy: { createdAt: 'desc' },
            });
        };
        // ТЗ п.19.3 — NEW → INVOICED → PAID → SHIPPED, ручной переключатель менеджера.
        OrdersService_1.prototype.updateStatus = function (id, status) {
            return __awaiter(this, void 0, void 0, function () {
                var order, data, updated;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.findById(id)];
                        case 1:
                            order = _a.sent();
                            data = { status: status };
                            if (status === 'PAID' && order.ttnStatus === 'RESERVED') {
                                data.ttnStatus = 'READY_TO_SHIP'; // сигнал складу, что можно передавать перевозчику (ТЗ п.22.2 шаг 5)
                            }
                            return [4 /*yield*/, this.prisma.client.order.update({ where: { id: id }, data: data })];
                        case 2:
                            updated = _a.sent();
                            if (!(status === 'PAID')) return [3 /*break*/, 6];
                            if (!order.userId) return [3 /*break*/, 4];
                            return [4 /*yield*/, this.loyalty.recalculateLifetimeSpend(order.userId)];
                        case 3:
                            _a.sent();
                            _a.label = 4;
                        case 4: return [4 /*yield*/, this.notify.notifyOrderPaid(id)];
                        case 5:
                            _a.sent();
                            _a.label = 6;
                        case 6: return [2 /*return*/, updated];
                    }
                });
            });
        };
        // ТЗ п.21 — "Сформировать счёт" (если не сгенерирован автоматически)
        OrdersService_1.prototype.generateInvoice = function (id) {
            return __awaiter(this, void 0, void 0, function () {
                var order, url;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.findById(id)];
                        case 1:
                            order = _a.sent();
                            return [4 /*yield*/, this.invoice.generateAndStore(id)];
                        case 2:
                            url = _a.sent();
                            return [4 /*yield*/, this.prisma.client.order.update({
                                    where: { id: id },
                                    data: { invoicePdfUrl: url, status: order.status === 'NEW' ? 'INVOICED' : undefined },
                                })];
                        case 3:
                            _a.sent();
                            return [2 /*return*/, { invoicePdfUrl: url }];
                    }
                });
            });
        };
        // ТЗ п.22.4 — ручное создание ТТН, если автосоздание не сработало
        OrdersService_1.prototype.createTtnManually = function (id) {
            return __awaiter(this, void 0, void 0, function () {
                var order, ttn;
                var _a, _b, _c;
                return __generator(this, function (_d) {
                    switch (_d.label) {
                        case 0: return [4 /*yield*/, this.findById(id)];
                        case 1:
                            order = _d.sent();
                            if (!order.npCityName || (!order.npWarehouseRef && !order.npWarehouseName)) {
                                throw new common_1.BadRequestException('Order has no delivery city/warehouse set');
                            }
                            return [4 /*yield*/, this.novaPoshta.createTtn({
                                    recipientName: order.contactName,
                                    recipientPhone: order.contactPhone,
                                    cityName: order.npCityName,
                                    warehouseRef: (_a = order.npWarehouseRef) !== null && _a !== void 0 ? _a : undefined,
                                    branchName: (_b = order.npWarehouseName) !== null && _b !== void 0 ? _b : '',
                                    description: order.items.map(function (i) { return i.product.articleNumber; }).join(', '),
                                    costUah: Number(order.totalUah),
                                })];
                        case 2:
                            ttn = _d.sent();
                            if (ttn.status !== 'created' || !ttn.ttn) {
                                throw new common_1.BadRequestException("Nova Poshta: ".concat((_c = ttn.error) !== null && _c !== void 0 ? _c : 'failed to create TTN'));
                            }
                            return [2 /*return*/, this.prisma.client.order.update({
                                    where: { id: id },
                                    data: { ttnNumber: ttn.ttn, ttnRef: ttn.uuid, ttnStatus: 'RESERVED' },
                                })];
                    }
                });
            });
        };
        OrdersService_1.prototype.printLabel = function (id) {
            return __awaiter(this, void 0, void 0, function () {
                var order, url;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.findById(id)];
                        case 1:
                            order = _a.sent();
                            if (!order.ttnRef)
                                throw new common_1.BadRequestException('Order has no TTN yet');
                            return [4 /*yield*/, this.novaPoshta.getPrintLabelUrl([order.ttnRef])];
                        case 2:
                            url = _a.sent();
                            return [4 /*yield*/, this.prisma.client.order.update({ where: { id: id }, data: { ttnLabelUrl: url } })];
                        case 3:
                            _a.sent();
                            return [2 /*return*/, { ttnLabelUrl: url }];
                    }
                });
            });
        };
        OrdersService_1.prototype.cancelTtn = function (id) {
            return __awaiter(this, void 0, void 0, function () {
                var order;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.findById(id)];
                        case 1:
                            order = _a.sent();
                            if (!order.ttnRef)
                                throw new common_1.BadRequestException('Order has no TTN to cancel');
                            return [4 /*yield*/, this.novaPoshta.deleteTtn(order.ttnRef)];
                        case 2:
                            _a.sent();
                            return [2 /*return*/, this.prisma.client.order.update({ where: { id: id }, data: { ttnStatus: 'CANCELLED' } })];
                    }
                });
            });
        };
        return OrdersService_1;
    }());
    __setFunctionName(_classThis, "OrdersService");
    (function () {
        var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        OrdersService = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return OrdersService = _classThis;
}();
exports.OrdersService = OrdersService;
