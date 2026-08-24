"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyTelegramInitData = verifyTelegramInitData;
var crypto = require("crypto");
function verifyTelegramInitData(initData, botToken, maxAgeSeconds) {
    var _a;
    if (maxAgeSeconds === void 0) { maxAgeSeconds = 86400; }
    var params = new URLSearchParams(initData);
    var hash = params.get('hash');
    if (!hash)
        return null;
    params.delete('hash');
    params.delete('signature'); // bad_hash fix
    var checkString = Array.from(params.entries())
        .sort(function (_a, _b) {
        var a = _a[0];
        var b = _b[0];
        return a.localeCompare(b);
    })
        .map(function (_a) {
        var key = _a[0], value = _a[1];
        return "".concat(key, "=").concat(value);
    })
        .join('\n');
    var secretKey = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest();
    var computedHash = crypto.createHmac('sha256', secretKey).update(checkString).digest('hex');
    if (computedHash !== hash)
        return null;
    var authDate = Number(params.get('auth_date'));
    if (Date.now() / 1000 - authDate > maxAgeSeconds)
        return null;
    var userRaw = params.get('user');
    return {
        user: userRaw ? JSON.parse(userRaw) : undefined,
        auth_date: (_a = params.get('auth_date')) !== null && _a !== void 0 ? _a : '',
        hash: hash,
    };
}
