"use strict";
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
exports.verifyTelegramLoginPayload = verifyTelegramLoginPayload;
var crypto = require("crypto");
function verifyTelegramLoginPayload(payload, botToken, maxAgeSeconds) {
    if (maxAgeSeconds === void 0) { maxAgeSeconds = 86400; }
    var hash = payload.hash, rest = __rest(payload, ["hash"]);
    if (!hash)
        return false;
    var checkString = Object.keys(rest)
        .sort()
        .map(function (key) { return "".concat(key, "=").concat(rest[key]); })
        .join('\n');
    var secretKey = crypto.createHash('sha256').update(botToken).digest();
    var hmac = crypto.createHmac('sha256', secretKey).update(checkString).digest('hex');
    if (hmac !== hash)
        return false;
    var authAgeSeconds = Math.floor(Date.now() / 1000) - Number(payload.auth_date);
    if (authAgeSeconds > maxAgeSeconds)
        return false;
    return true;
}
