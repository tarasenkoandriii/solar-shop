"use strict";
// IDW (Inverse Distance Weighting) — стандартный геопространственный метод
// интерполяции скалярного поля между разреженными точками, дающий
// непрерывный растр вместо дискретных точек (ТЗ п.34.2 шаг "Интерполяция").
// Чистая математика, без внешних GIS-зависимостей (GDAL/scipy и т.п.) —
// специально выбран за это: работает в обычном Node.js без нативных
// биндингов, безопасно для serverless (Vercel Hobby), см. AUDIT-FULL.md
// по поводу того, почему полный PMTiles-конвейер не реализован при этом.
Object.defineProperty(exports, "__esModule", { value: true });
exports.idwInterpolate = idwInterpolate;
exports.buildInterpolatedGrid = buildInterpolatedGrid;
exports.toCompact = toCompact;
exports.fromCompact = fromCompact;
var EARTH_RADIUS_KM = 6371;
function haversineDistanceKm(lat1, lng1, lat2, lng2) {
    var toRad = function (d) { return (d * Math.PI) / 180; };
    var dLat = toRad(lat2 - lat1);
    var dLng = toRad(lng2 - lng1);
    var a = Math.pow(Math.sin(dLat / 2), 2) + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.pow(Math.sin(dLng / 2), 2);
    return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(a));
}
// power=2 — стандартное значение для IDW (квадрат обратного расстояния),
// более высокие значения дают более "локальную" интерполяцию (ближайшие
// точки доминируют сильнее), более низкие — более сглаженную.
function idwInterpolate(samples, targetLat, targetLng, power) {
    if (power === void 0) { power = 2; }
    var weightedSum = 0;
    var weightSum = 0;
    for (var _i = 0, samples_1 = samples; _i < samples_1.length; _i++) {
        var sample = samples_1[_i];
        var distanceKm = haversineDistanceKm(targetLat, targetLng, sample.lat, sample.lng);
        if (distanceKm < 0.001)
            return sample.value; // точное совпадение — избегаем деления на почти-ноль
        var weight = 1 / Math.pow(distanceKm, power);
        weightedSum += weight * sample.value;
        weightSum += weight;
    }
    return weightSum > 0 ? weightedSum / weightSum : 0;
}
// Строит целевую сетку заданного разрешения и интерполирует значение в
// каждой ячейке по разреженным исходным точкам — это и есть шаг
// "растр вместо дискретных точек" из ТЗ, только не сохраняется как файл
// растра/тайлов, а отдаётся клиенту как плотный массив точек (см.
// SolarMapService — рендер через клиентскую тепловую карту).
function buildInterpolatedGrid(samples, bounds, resolution) {
    if (samples.length === 0)
        return [];
    var latSpan = bounds.latMax - bounds.latMin;
    var lngSpan = bounds.lngMax - bounds.lngMin;
    var largerSpan = Math.max(latSpan, lngSpan);
    var stepDeg = largerSpan / resolution;
    var grid = [];
    for (var lat = bounds.latMin; lat <= bounds.latMax; lat += stepDeg) {
        for (var lng = bounds.lngMin; lng <= bounds.lngMax; lng += stepDeg) {
            var value = idwInterpolate(samples, lat, lng);
            grid.push({ lat: Math.round(lat * 1000) / 1000, lng: Math.round(lng * 1000) / 1000, value: value });
        }
    }
    return grid;
}
function toCompact(points) {
    return points.map(function (p) { return [p.lat, p.lng, p.value]; });
}
function fromCompact(points) {
    return points.map(function (_a) {
        var lat = _a[0], lng = _a[1], value = _a[2];
        return ({ lat: lat, lng: lng, value: value });
    });
}
