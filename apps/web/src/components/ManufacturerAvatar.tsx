// Аватар виробника: логотип, якщо він є, інакше — монограма.
//
// Серверний компонент, без 'use client': нічого інтерактивного тут
// немає, а зайвий клієнтський модуль на головній сторінці не потрібен.

// Ініціали. Дві літери з двох слів ("Victron Energy" → "VE"), для
// односкладової назви — перші дві літери ("Pylontech" → "PY"). Одна
// літера читалась би гірше й частіше збігалась би між виробниками.
// Фільтр по літерах — щоб "SolarEdge®" не дало "S®".
//
// Межа слова — не лише пробіл і дефіс, а й перехід «мала → велика»
// всередині слова. Без цього "SolarEdge" вважалось одним словом і
// давало "SO" замість очевидного "SE" — перевірено на рендері,
// виробник у каталозі саме такий. Той самий випадок: "SunPower",
// "LONGi Solar", "GoodWe".
function initialsOf(name: string): string {
  const words = name
    .replace(/([\p{Ll}\d])(\p{Lu})/gu, '$1 $2')
    .split(/[\s\-_/]+/)
    .map((w) => w.replace(/[^\p{L}\p{N}]/gu, ''))
    .filter(Boolean);
  if (words.length === 0) return '?';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

// Колір монограми — детермінований від назви, а не випадковий і не
// один на всіх: сусідні плашки мають розрізнятись, але при кожному
// рендері (SSR + гідратація) виходити ОДНАКОВИМИ, інакше буде
// розбіжність розмітки між сервером і клієнтом.
//
// Пари класів, а не обчислений inline-стиль: Tailwind збирає CSS,
// скануючи вихідний код, тож клас, зібраний у рантаймі з шматків,
// просто не потрапив би у збірку. Заодно кожен варіант має явний
// відповідник для темної теми ([data-theme=modern]) — на #0D1014
// світлі пастельні підкладки виглядали б як дірки.
// Дев'ять варіантів, а не шість: на рендері з шістьма два сусідні
// виробники (Longi Solar і Pylontech) отримали майже однаковий
// бурштиновий і виглядали як одна пара. Виробників у каталозі
// одиниці, тож ширша палітра прямо зменшує ймовірність такого збігу
// поруч.
const PALETTE = [
  'bg-amber-100 text-amber-800 [[data-theme=modern]_&]:bg-amber-400/15 [[data-theme=modern]_&]:text-amber-300',
  'bg-emerald-100 text-emerald-800 [[data-theme=modern]_&]:bg-emerald-400/15 [[data-theme=modern]_&]:text-emerald-300',
  'bg-sky-100 text-sky-800 [[data-theme=modern]_&]:bg-sky-400/15 [[data-theme=modern]_&]:text-sky-300',
  'bg-violet-100 text-violet-800 [[data-theme=modern]_&]:bg-violet-400/15 [[data-theme=modern]_&]:text-violet-300',
  'bg-rose-100 text-rose-800 [[data-theme=modern]_&]:bg-rose-400/15 [[data-theme=modern]_&]:text-rose-300',
  'bg-teal-100 text-teal-800 [[data-theme=modern]_&]:bg-teal-400/15 [[data-theme=modern]_&]:text-teal-300',
  'bg-indigo-100 text-indigo-800 [[data-theme=modern]_&]:bg-indigo-400/15 [[data-theme=modern]_&]:text-indigo-300',
  'bg-lime-100 text-lime-800 [[data-theme=modern]_&]:bg-lime-400/15 [[data-theme=modern]_&]:text-lime-300',
  'bg-orange-100 text-orange-800 [[data-theme=modern]_&]:bg-orange-400/15 [[data-theme=modern]_&]:text-orange-300',
];

// FNV-1a плюс фіналізатор lowbias32, а не звичний `hash * 31 + code`.
// Причина конкретна, не смак: із множником 31 і залишком від ділення
// на довжину палітри реальні назви виробників лягали купами — Longi
// Solar і Pylontech отримували один колір, SolarEdge, Victron Energy й
// JA Solar — інший один на трьох (перевірено на списку з 16 реальних
// брендів: 6 різних кольорів із 9, три збіги поруч). Назви занадто
// схожі за структурою, щоб слабке перемішування їх розвело. З
// фіналізатором на тому самому списку — 8 кольорів із 9 і жодного
// збігу серед чотирьох виробників, які реально є в каталозі.
//
// Math.imul — саме 32-бітне множення; звичайне `*` на великих
// значеннях пішло б через double й дало б інший результат.
function paletteFor(name: string): string {
  let hash = 2166136261;
  for (let i = 0; i < name.length; i++) {
    hash = Math.imul(hash ^ name.charCodeAt(i), 16777619);
  }
  hash = Math.imul(hash ^ (hash >>> 16), 0x7feb352d);
  hash = Math.imul(hash ^ (hash >>> 15), 0x846ca68b);
  hash = (hash ^ (hash >>> 16)) >>> 0;
  return PALETTE[hash % PALETTE.length];
}

export function ManufacturerAvatar({
  name,
  logoUrl,
  size = 40,
}: {
  name: string;
  logoUrl?: string | null;
  size?: number;
}) {
  if (logoUrl) {
    return (
      // Свідомо звичайний <img>, а не next/image. logoUrl — довільний
      // домен виробника, а next/image пропускає лише перелічені в
      // images.remotePatterns (next.config.mjs): чужий домен там дає
      // помилку в рантаймі, а не тихий фолбек. Логотипи виробників
      // через дзеркало на Vercel Blob не проходять — на відміну від
      // фото товарів (product-image-mirror.service.ts).
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={logoUrl}
        alt={name}
        width={size}
        height={size}
        loading="lazy"
        className="shrink-0 rounded-xl bg-white object-contain p-1 ring-1 ring-leaf-800/10 [[data-theme=modern]_&]:bg-white/90"
        style={{ width: size, height: size }}
      />
    );
  }

  return (
    <span
      aria-hidden="true"
      className={`flex shrink-0 items-center justify-center rounded-xl font-semibold tracking-tight ${paletteFor(name)}`}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.36) }}
    >
      {initialsOf(name)}
    </span>
  );
}
