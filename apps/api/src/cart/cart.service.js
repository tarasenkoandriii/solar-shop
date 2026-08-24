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
Object.defineProperty(exports, "__esModule", { value: true });
exports.CartService = void 0;
var common_1 = require("@nestjs/common");
var CartService = function () {
    var _classDecorators = [(0, common_1.Injectable)()];
    var _classDescriptor;
    var _classExtraInitializers = [];
    var _classThis;
    var CartService = _classThis = /** @class */ (function () {
        function CartService_1(prisma, products) {
            this.prisma = prisma;
            this.products = products;
        }
        CartService_1.prototype.getOrCreateCart = function (userId, sessionId) {
            return __awaiter(this, void 0, void 0, function () {
                var existing, existing;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            if (!userId) return [3 /*break*/, 2];
                            return [4 /*yield*/, this.prisma.client.cart.findFirst({ where: { userId: userId } })];
                        case 1:
                            existing = _a.sent();
                            if (existing)
                                return [2 /*return*/, existing];
                            return [2 /*return*/, this.prisma.client.cart.create({ data: { userId: userId } })];
                        case 2:
                            if (!sessionId) return [3 /*break*/, 4];
                            return [4 /*yield*/, this.prisma.client.cart.findFirst({ where: { sessionId: sessionId } })];
                        case 3:
                            existing = _a.sent();
                            if (existing)
                                return [2 /*return*/, existing];
                            return [2 /*return*/, this.prisma.client.cart.create({ data: { sessionId: sessionId } })];
                        case 4: throw new common_1.NotFoundException('Neither userId nor sessionId provided');
                    }
                });
            });
        };
        CartService_1.prototype.getCart = function (userId, sessionId) {
            return __awaiter(this, void 0, void 0, function () {
                var cart;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.getOrCreateCart(userId, sessionId)];
                        case 1:
                            cart = _a.sent();
                            return [2 /*return*/, this.getCartWithTotals(cart.id)];
                    }
                });
            });
        };
        CartService_1.prototype.addItem = function (userId_1, sessionId_1, productId_1) {
            return __awaiter(this, arguments, void 0, function (userId, sessionId, productId, quantity) {
                var cart, cheapest;
                if (quantity === void 0) { quantity = 1; }
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.getOrCreateCart(userId, sessionId)];
                        case 1:
                            cart = _a.sent();
                            return [4 /*yield*/, this.products.getCheapestInStockListing(productId)];
                        case 2:
                            cheapest = _a.sent();
                            if (!cheapest)
                                throw new common_1.NotFoundException('Product has no in-stock listing right now');
                            return [4 /*yield*/, this.prisma.client.cartItem.upsert({
                                    where: {
                                        cartId_productId_listingId: {
                                            cartId: cart.id,
                                            productId: productId,
                                            listingId: cheapest.sourceListingId,
                                        },
                                    },
                                    create: {
                                        cartId: cart.id,
                                        productId: productId,
                                        listingId: cheapest.sourceListingId,
                                        quantity: quantity,
                                        priceSnapshot: cheapest.sourceListing.priceUsd,
                                    },
                                    update: { quantity: { increment: quantity } },
                                })];
                        case 3:
                            _a.sent();
                            return [2 /*return*/, this.getCartWithTotals(cart.id)];
                    }
                });
            });
        };
        CartService_1.prototype.updateItemQuantity = function (cartItemId, quantity) {
            return __awaiter(this, void 0, void 0, function () {
                var item;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.prisma.client.cartItem.findUnique({ where: { id: cartItemId } })];
                        case 1:
                            item = _a.sent();
                            if (!item)
                                throw new common_1.NotFoundException('Cart item not found');
                            return [4 /*yield*/, this.prisma.client.cartItem.update({ where: { id: cartItemId }, data: { quantity: quantity } })];
                        case 2:
                            _a.sent();
                            return [2 /*return*/, this.getCartWithTotals(item.cartId)];
                    }
                });
            });
        };
        CartService_1.prototype.removeItem = function (cartItemId) {
            return __awaiter(this, void 0, void 0, function () {
                var item;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.prisma.client.cartItem.findUnique({ where: { id: cartItemId } })];
                        case 1:
                            item = _a.sent();
                            if (!item)
                                throw new common_1.NotFoundException('Cart item not found');
                            return [4 /*yield*/, this.prisma.client.cartItem.delete({ where: { id: cartItemId } })];
                        case 2:
                            _a.sent();
                            return [2 /*return*/, this.getCartWithTotals(item.cartId)];
                    }
                });
            });
        };
        // Гостевая корзина мёрджится с корзиной пользователя при входе через
        // Telegram (ТЗ п.19.2) — вызывается из AuthService после успешного логина.
        CartService_1.prototype.mergeGuestCartIntoUser = function (sessionId, userId) {
            return __awaiter(this, void 0, void 0, function () {
                var guestCart, userCart, _i, _a, item, listingId, existing;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0: return [4 /*yield*/, this.prisma.client.cart.findFirst({ where: { sessionId: sessionId }, include: { items: true } })];
                        case 1:
                            guestCart = _b.sent();
                            if (!guestCart || guestCart.items.length === 0)
                                return [2 /*return*/];
                            return [4 /*yield*/, this.getOrCreateCart(userId, null)];
                        case 2:
                            userCart = _b.sent();
                            _i = 0, _a = guestCart.items;
                            _b.label = 3;
                        case 3:
                            if (!(_i < _a.length)) return [3 /*break*/, 11];
                            item = _a[_i];
                            if (!item.listingId) return [3 /*break*/, 5];
                            listingId = item.listingId;
                            return [4 /*yield*/, this.prisma.client.cartItem.upsert({
                                    where: {
                                        cartId_productId_listingId: { cartId: userCart.id, productId: item.productId, listingId: listingId },
                                    },
                                    create: {
                                        cartId: userCart.id,
                                        productId: item.productId,
                                        listingId: listingId,
                                        quantity: item.quantity,
                                        priceSnapshot: item.priceSnapshot,
                                    },
                                    update: { quantity: { increment: item.quantity } },
                                })];
                        case 4:
                            _b.sent();
                            return [3 /*break*/, 10];
                        case 5: return [4 /*yield*/, this.prisma.client.cartItem.findFirst({
                                where: { cartId: userCart.id, productId: item.productId, listingId: null },
                            })];
                        case 6:
                            existing = _b.sent();
                            if (!existing) return [3 /*break*/, 8];
                            return [4 /*yield*/, this.prisma.client.cartItem.update({
                                    where: { id: existing.id },
                                    data: { quantity: { increment: item.quantity } },
                                })];
                        case 7:
                            _b.sent();
                            return [3 /*break*/, 10];
                        case 8: return [4 /*yield*/, this.prisma.client.cartItem.create({
                                data: {
                                    cartId: userCart.id,
                                    productId: item.productId,
                                    listingId: null,
                                    quantity: item.quantity,
                                    priceSnapshot: item.priceSnapshot,
                                },
                            })];
                        case 9:
                            _b.sent();
                            _b.label = 10;
                        case 10:
                            _i++;
                            return [3 /*break*/, 3];
                        case 11: return [4 /*yield*/, this.prisma.client.cart.delete({ where: { id: guestCart.id } })];
                        case 12:
                            _b.sent();
                            return [2 /*return*/];
                    }
                });
            });
        };
        CartService_1.prototype.clearCart = function (cartId) {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.prisma.client.cartItem.deleteMany({ where: { cartId: cartId } })];
                        case 1:
                            _a.sent();
                            return [2 /*return*/];
                    }
                });
            });
        };
        CartService_1.prototype.getCartWithTotals = function (cartId) {
            return __awaiter(this, void 0, void 0, function () {
                var cart, subtotalUsd;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.prisma.client.cart.findUniqueOrThrow({
                                where: { id: cartId },
                                include: { items: { include: { product: { include: { images: true } } } } },
                            })];
                        case 1:
                            cart = _a.sent();
                            subtotalUsd = cart.items.reduce(function (sum, i) { return sum + Number(i.priceSnapshot) * i.quantity; }, 0);
                            return [2 /*return*/, __assign(__assign({}, cart), { subtotalUsd: subtotalUsd })];
                    }
                });
            });
        };
        return CartService_1;
    }());
    __setFunctionName(_classThis, "CartService");
    (function () {
        var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        CartService = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return CartService = _classThis;
}();
exports.CartService = CartService;
