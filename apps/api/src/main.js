"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
require("reflect-metadata");
var core_1 = require("@nestjs/core");
var common_1 = require("@nestjs/common");
var cookie_parser_1 = require("cookie-parser");
var app_module_1 = require("./app.module");
function bootstrap() {
    return __awaiter(this, void 0, void 0, function () {
        var app, corsOrigins, port, devLoginEnabled, nodeEnv, devLoginActive;
        var _a, _b, _c, _d;
        return __generator(this, function (_e) {
            switch (_e.label) {
                case 0: return [4 /*yield*/, core_1.NestFactory.create(app_module_1.AppModule)];
                case 1:
                    app = _e.sent();
                    app.use((0, cookie_parser_1.default)());
                    app.useGlobalPipes(new common_1.ValidationPipe({
                        whitelist: true,
                        transform: true,
                        forbidNonWhitelisted: true,
                    }));
                    corsOrigins = ((_a = process.env.CORS_ORIGINS) !== null && _a !== void 0 ? _a : '').split(',').filter(Boolean);
                    app.enableCors({
                        origin: corsOrigins.length > 0 ? corsOrigins : true,
                        credentials: true,
                    });
                    port = (_b = process.env.PORT) !== null && _b !== void 0 ? _b : 3001;
                    return [4 /*yield*/, app.listen(port)];
                case 2:
                    _e.sent();
                    // eslint-disable-next-line no-console
                    console.log("solar-shop api listening on :".concat(port));
                    devLoginEnabled = process.env.ENABLE_DEV_LOGIN === 'true';
                    nodeEnv = (_c = process.env.NODE_ENV) !== null && _c !== void 0 ? _c : '(не задано)';
                    devLoginActive = devLoginEnabled && nodeEnv !== 'production';
                    // eslint-disable-next-line no-console
                    console.log("[dev-login] ENABLE_DEV_LOGIN=".concat((_d = process.env.ENABLE_DEV_LOGIN) !== null && _d !== void 0 ? _d : '(не задано)', " NODE_ENV=").concat(nodeEnv, " \u2192 ").concat(devLoginActive ? 'УВІМКНЕНО' : 'вимкнено').concat(!devLoginActive ? ' (це очікувано в проді; для локальної розробки перевір docker-compose.yml environment: для сервісу api)' : ''));
                    return [2 /*return*/];
            }
        });
    });
}
bootstrap();
