"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = handler;
require("reflect-metadata");
const serverless_express_1 = __importDefault(require("@vendia/serverless-express"));
const core_1 = require("@nestjs/core");
const platform_express_1 = require("@nestjs/platform-express");
const common_1 = require("@nestjs/common");
const express_1 = __importDefault(require("express"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const app_module_1 = require("../src/app.module");
let cachedServer;
async function bootstrapServer() {
    const expressApp = (0, express_1.default)();
    const adapter = new platform_express_1.ExpressAdapter(expressApp);
    const app = await core_1.NestFactory.create(app_module_1.AppModule, adapter);
    app.use((0, cookie_parser_1.default)());
    app.useGlobalPipes(new common_1.ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }));
    const corsOrigins = (process.env.CORS_ORIGINS ?? '').split(',').filter(Boolean);
    app.enableCors({ origin: corsOrigins.length > 0 ? corsOrigins : true, credentials: true });
    await app.init();
    return (0, serverless_express_1.default)({ app: expressApp });
}
async function handler(req, res) {
    if (!cachedServer) {
        cachedServer = await bootstrapServer();
    }
    return cachedServer(req, res);
}
//# sourceMappingURL=index.js.map