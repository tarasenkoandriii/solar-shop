export interface RssItem {
  title: string;
  link: string;
  description: string;
  pubDate?: string;
  imageUrl?: string;
}

// Лёгкий RSS/Atom-парсер без внешних зависимостей (rss-parser и подобные
// пакеты недоступны для проверки в этой sandbox-сети) — регуляркой по
// <item>...</item> блокам, этого достаточно для стандартных RSS 2.0 фидов
// (Ukrinform и большинство крупних СМІ, ТЗ п.14.3).
//
// За прямим запитом користувача ("во многих статьях нет фото - запускал
// повторный поиск много раз") — чесно: без прямого доступу до живого
// фіда з цієї пісочниці я НЕ можу гарантовано визначити точний формат,
// у якому конкретно pv-magazine.com кодує картинку для БІЛЬШОСТІ своїх
// записів (деякі точно спрацьовують — видно з реального скріншоту, "62"
// зі скріншоту про скоринг мала фото — отже формат, що вже
// підтримується, десь трапляється; для решти — ні). Замість чергового
// сліпого здогаду — діагностика: коли жоден з відомих патернів не
// спрацював, у лог (docker-compose logs api) потрапляє РЕАЛЬНИЙ уривок
// XML цього item-блоку (обрізаний, щоб не заспамити лог) — ОДИН раз на
// джерело за прогін (не на кожен елемент, щоб не затопити лог сотнями
// однакових записів). Наступний реальний прогін покаже справжню
// структуру, і можна буде виправити приціл, а не гадати знову.
const sourcesLoggedThisRun = new Set<string>();

// Викликається на початку кожного прогону runParser() — інакше Set
// накопичував би стан НАЗАВЖДИ в межах життя процесу Node (діагностика
// спрацювала б лише ОДИН раз за все життя api-контейнера, не на кожен
// новий прогін парсера користувачем).
export function resetImageDiagnosticsForNewRun(): void {
  sourcesLoggedThisRun.clear();
}

export function parseRssItems(xml: string, sourceNameForDiagnostics?: string): RssItem[] {
  const items: RssItem[] = [];
  const itemBlocks = xml.match(/<item[\s\S]*?<\/item>/gi) ?? [];

  for (const block of itemBlocks) {
    const title = extractTag(block, 'title');
    const link = extractTag(block, 'link');
    const description = extractTag(block, 'description');
    const pubDate = extractTag(block, 'pubDate');
    if (title && link) {
      const imageUrl = extractImageUrl(block);

      if (!imageUrl && sourceNameForDiagnostics && !sourcesLoggedThisRun.has(sourceNameForDiagnostics)) {
        sourcesLoggedThisRun.add(sourceNameForDiagnostics);
        console.log(`[rss.util] Не знайдено картинку для "${sourceNameForDiagnostics}" (перший такий випадок цього прогону): ${logImageRelatedContext(block)}`);
      }

      items.push({
        title: decodeEntities(title),
        link: link.trim(),
        description: decodeEntities(description ?? ''),
        pubDate,
        imageUrl,
      });
    }
  }

  return items;
}

// Знайдено 18.08.2026 при перевірці реальних фідів (web_fetch): різні
// видання кодують обкладинку по-різному — energy-storage.news через
// <enclosure url="...">, renewableenergyworld.com через <media:content>/
// <media:thumbnail> (іноді разом з тим самим <enclosure>), pv-magazine.com
// іноді взагалі без окремого тега, лише <img> всередині
// <content:encoded>. Пробуємо по черзі, перший знайдений — переможець.
//
// ⚠️ Знайдено й виправлено 20.08.2026 за прямим запитом користувача
// ("ИИ поиск новых статей фотки не подтянул снова") — реальний прогін
// показав 0 спроб (sourceImageUrl теж null, не лише coverImage) саме
// для energy-storage.news статей. Причина: попередній regex для
// enclosure жорстко вимагав `url=...type="image/` У ТАКОМУ порядку
// атрибутів (`[^>]+url=...[^>]*type=`) — якщо реальний XML пише
// `<enclosure type="image/jpeg" url="...">` (type ПЕРЕД url, порядок
// атрибутів у XML довільний за специфікацією), regex просто не
// спрацьовував узагалі. Виправлено — весь тег `<enclosure>` витягується
// цілком, url і type шукаються ОКРЕМО всередині нього, незалежно від
// порядку. Той самий підхід застосовано і для media:content на випадок
// того самого класу проблеми там.
function extractImageUrl(block: string): string | undefined {
  const mediaContentTag = block.match(/<media:content\b[^>]*>/i)?.[0];
  if (mediaContentTag) {
    const url = mediaContentTag.match(/\burl=["']([^"']+)["']/i)?.[1];
    if (url) return url;
  }

  const mediaThumbnailTag = block.match(/<media:thumbnail\b[^>]*>/i)?.[0];
  if (mediaThumbnailTag) {
    const url = mediaThumbnailTag.match(/\burl=["']([^"']+)["']/i)?.[1];
    if (url) return url;
  }

  // Може бути декілька <enclosure> у блоці (рідко) — перебираємо всі,
  // не лише перший, шукаємо той, що явно image/* за type, або просто
  // будь-який з валідним url, якщо жоден не має явного image-типу.
  const enclosureTags = block.match(/<enclosure\b[^>]*>/gi) ?? [];
  let fallbackEnclosureUrl: string | undefined;
  for (const tag of enclosureTags) {
    const url = tag.match(/\burl=["']([^"']+)["']/i)?.[1];
    if (!url) continue;
    const type = tag.match(/\btype=["']([^"']+)["']/i)?.[1];
    if (type?.startsWith('image/')) return url;
    if (!fallbackEnclosureUrl) fallbackEnclosureUrl = url;
  }
  if (fallbackEnclosureUrl) return fallbackEnclosureUrl;

  const inlineImg = block.match(/<img[^>]+src=["']([^"']+)["']/i);
  if (inlineImg) return inlineImg[1];

  return undefined;
}

// За прямим запитом користувача ("во многих статьях нет фото") — знайдено
// на реальному прогоні: попередня діагностика обрізала блок до 800
// символів ВІД ПОЧАТКУ — для pv-magazine.com це обривалось ще на
// <category>-тегах, ДО того, як дійти до <description>/<content:encoded>,
// де реально й міг би бути тег картинки. Замість сліпого обрізання —
// шукаємо ключові підрядки (enclosure/media:content/media:thumbnail/img)
// ПО ВСЬОМУ блоку незалежно від позиції, показуємо контекст навколо
// кожного знайденого. Якщо ЖОДНОГО з них немає взагалі — це чесно
// означає, що RSS-запис просто не містить картинки (не баг парсингу).
function logImageRelatedContext(block: string): string {
  const patterns = ['enclosure', 'media:content', 'media:thumbnail', '<img'];
  const findings: string[] = [];

  for (const pattern of patterns) {
    const idx = block.indexOf(pattern);
    if (idx === -1) continue;
    const start = Math.max(0, idx - 100);
    const end = Math.min(block.length, idx + pattern.length + 200);
    findings.push(`...${block.slice(start, end).replace(/\s+/g, ' ').trim()}...`);
  }

  if (findings.length === 0) {
    const hasContentEncoded = block.includes('content:encoded');
    return `жоден з очікуваних тегів картинки (enclosure/media:content/media:thumbnail/img) не знайдено в цьому item-блоці взагалі — ${
      hasContentEncoded ? 'тег content:encoded присутній, але без <img> всередині' : 'тегу content:encoded теж немає'
    } — ймовірно, цей конкретний RSS-запис просто не містить картинки в фіді.`;
  }

  return `знайдено ${findings.length} потенційно релевантних місць у блоці:\n${findings.join('\n')}`;
}

function extractTag(block: string, tag: string): string | undefined {
  const match = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i'));
  if (!match) return undefined;
  return match[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/, '$1').trim();
}

function decodeEntities(text: string): string {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

// Фильтрация по теме после получения фида (ТЗ п.14.3) — большинство
// источников общие СМИ с разделом/тегом, не узкотематические.
const TOPIC_KEYWORDS = [
  'сонячн', 'сонячна', 'сонячної', 'сонячні',
  'акумулятор', 'акумулятори',
  'контролер заряду', 'контролери заряду',
  'зелений тариф', 'відновлюван', 'СЕС',
];

export function isRelevantToSolarEnergy(item: RssItem): boolean {
  const haystack = `${item.title} ${item.description}`.toLowerCase();
  return TOPIC_KEYWORDS.some((kw) => haystack.includes(kw.toLowerCase()));
}
