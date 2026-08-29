import { COMPANY } from '../lib/company';

// Карта офісу. За запитом користувача (27.08.2026) — "сразу показать
// точку на карте": раніше на сторінці контактів було лише текстове
// посилання "Google Maps →", тобто щоб побачити, де ми, треба було піти
// на інший сайт і повернутись.
//
// OpenStreetMap, а не Google Maps: карта видно одразу, без ключа API, без
// оплати за перегляди й без сторонніх cookie. Останнє не дрібниця — у
// вбудованого Google Maps є трекінг, який довелось би окремо описувати в
// політиці конфіденційності (вона в проєкті вже написана й нічого такого
// не згадує).
//
// Серверний компонент: жодного JS на клієнт, звичайний iframe.
export function OfficeMap({ title }: { title: string }) {
  if (COMPANY.lat === null || COMPANY.lng === null) return null;

  // Рамка приблизно 500 м навколо точки — достатньо, щоб побачити
  // сусідні вулиці й зрозуміти, як під'їхати, і не так далеко, щоб
  // мітка загубилася.
  const d = 0.0035;
  const bbox = [COMPANY.lng - d, COMPANY.lat - d, COMPANY.lng + d, COMPANY.lat + d].join('%2C');
  const src = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${COMPANY.lat}%2C${COMPANY.lng}`;

  return (
    <div className="overflow-hidden rounded-2xl border border-leaf-800/10">
      <iframe
        src={src}
        title={title}
        // loading="lazy" свідомо НЕ ставимо: користувач просив показати
        // точку одразу, а lazy на елементі в першому екрані дає порожній
        // прямокутник до скролу.
        className="block h-72 w-full border-0"
        // Карта нічого не запитує в браузера — фіксуємо це явно, щоб
        // iframe не міг попросити геолокацію чи камеру.
        allow=""
        referrerPolicy="no-referrer-when-downgrade"
      />
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-leaf-800/10 px-4 py-3 text-sm">
        <span className="text-leaf-900/70">{COMPANY.address}</span>
        <a
          href={`https://www.openstreetmap.org/directions?to=${COMPANY.lat}%2C${COMPANY.lng}`}
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-leaf-700 underline underline-offset-2 hover:text-leaf-800"
        >
          Прокласти маршрут →
        </a>
      </div>
    </div>
  );
}
