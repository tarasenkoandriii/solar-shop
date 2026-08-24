"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseRssItems = parseRssItems;
exports.isRelevantToSolarEnergy = isRelevantToSolarEnergy;
// Лёгкий RSS/Atom-парсер без внешних зависимостей (rss-parser и подобные
// пакеты недоступны для проверки в этой sandbox-сети) — регуляркой по
// <item>...</item> блокам, этого достаточно для стандартных RSS 2.0 фидов
// (Ukrinform и большинство крупных СМИ, ТЗ п.14.3).
function parseRssItems(xml) {
    var _a;
    var items = [];
    var itemBlocks = (_a = xml.match(/<item[\s\S]*?<\/item>/gi)) !== null && _a !== void 0 ? _a : [];
    for (var _i = 0, itemBlocks_1 = itemBlocks; _i < itemBlocks_1.length; _i++) {
        var block = itemBlocks_1[_i];
        var title = extractTag(block, 'title');
        var link = extractTag(block, 'link');
        var description = extractTag(block, 'description');
        var pubDate = extractTag(block, 'pubDate');
        if (title && link) {
            items.push({ title: decodeEntities(title), link: link.trim(), description: decodeEntities(description !== null && description !== void 0 ? description : ''), pubDate: pubDate });
        }
    }
    return items;
}
function extractTag(block, tag) {
    var match = block.match(new RegExp("<".concat(tag, "[^>]*>([\\s\\S]*?)<\\/").concat(tag, ">"), 'i'));
    if (!match)
        return undefined;
    return match[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/, '$1').trim();
}
function decodeEntities(text) {
    return text
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'");
}
// Фильтрация по теме после получения фида (ТЗ п.14.3) — большинство
// источников общие СМИ с разделом/тегом, не узкотематические.
var TOPIC_KEYWORDS = [
    'сонячн', 'сонячна', 'сонячної', 'сонячні',
    'акумулятор', 'акумулятори',
    'контролер заряду', 'контролери заряду',
    'зелений тариф', 'відновлюван', 'СЕС',
];
function isRelevantToSolarEnergy(item) {
    var haystack = "".concat(item.title, " ").concat(item.description).toLowerCase();
    return TOPIC_KEYWORDS.some(function (kw) { return haystack.includes(kw.toLowerCase()); });
}
