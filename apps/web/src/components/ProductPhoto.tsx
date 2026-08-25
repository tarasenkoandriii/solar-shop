import Image from 'next/image';

// Єдина точка рендерингу фото товару.
//
// Передісторія (25.08.2026, за прямим запитом користувача — "во время
// парсинга товаров не тянутся фотки"): парсер картинки записував справно,
// але next/image ганяє будь-який зовнішній src через власний оптимізатор і
// віддає 400 на домен поза images.remotePatterns — а туди домени
// постачальників не входять. У каталозі були биті іконки.
//
// Рішення — переносити фото на Vercel Blob (джоб product_image_mirror у
// api). Але перенос ПОСТУПОВИЙ і за побудовою неповний: щойно запарсений
// товар кілька хвилин живе з прямим посиланням, а картинка, яку
// постачальник устиг видалити, лишається на ньому назавжди. Тобто в базі
// одночасно є обидва види URL — і компонент має коректно показати будь-який.
//
// Звідси розвилка: свій домен — next/image з усією оптимізацією, чужий —
// звичайний <img>, який просто працює. Не "або оптимізація, або картинки",
// а оптимізація там, де вона можлива, і робоче фото скрізь.
const OPTIMIZABLE_HOSTS = [
  // Мають збігатися з images.remotePatterns у next.config.mjs.
  { suffix: '.public.blob.vercel-storage.com' }, // наше сховище — сюди їдуть фото товарів
  { suffix: '.supabase.co' },
  { exact: 'placehold.co' }, // сідові товари
];

export function isOptimizableImageUrl(url: string): boolean {
  try {
    const { hostname, protocol } = new URL(url);
    if (protocol !== 'https:') return false;
    return OPTIMIZABLE_HOSTS.some((h) => ('exact' in h ? hostname === h.exact : hostname.endsWith(h.suffix!)));
  } catch {
    // Відносний або кривий URL — next/image на ньому все одно спіткнеться.
    return false;
  }
}

export function ProductPhoto({
  src,
  alt,
  sizes,
  priority = false,
  className = '',
}: {
  src: string;
  alt: string;
  /** Тільки для next/image; для звичайного <img> не має сенсу. */
  sizes?: string;
  /** Фото в першому екрані — без lazy-load. */
  priority?: boolean;
  className?: string;
}) {
  if (isOptimizableImageUrl(src)) {
    // fill сам розставляє absolute/inset-0, тому позиціонування тут не дублюємо.
    return <Image src={src} alt={alt} fill sizes={sizes} priority={priority} className={`object-cover ${className}`.trim()} />;
  }

  // Ті самі геометричні класи, які fill проставляє інлайновими стилями —
  // щоб верстка не залежала від того, яку гілку обрано.
  /* eslint-disable-next-line @next/next/no-img-element */
  return (
    <img
      src={src}
      alt={alt}
      className={`absolute inset-0 h-full w-full object-cover ${className}`.trim()}
      loading={priority ? 'eager' : 'lazy'}
    />
  );
}
