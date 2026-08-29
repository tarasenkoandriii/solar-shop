// Визначення міста відвідувача за заголовками Vercel.
//
// За запитом користувача (27.08.2026): підставляти місто в перше питання
// калькулятора, лишаючи можливість змінити — як і раніше.
//
// ВАЖЛИВО, щоб не сплутати з іншим рішенням у цьому ж проєкті: у
// middleware.ts geo-IP свідомо НЕ використовується для вибору МОВИ — там
// вимога була "дефолт український, поки людина не обрала сама". Тут
// випадок протилежний: значення не вирішує нічого за користувача, а лише
// заповнює поле, яке він бачить і будь-якої миті переписує. Це підказка,
// а не рішення.
//
// Vercel надсилає `x-vercel-ip-city` у percent-encoded вигляді й
// ЛАТИНКОЮ: "Kyiv", "L%27viv". А поле в квизі — автодоповнення по
// довіднику Нової Пошти, де міста українською. Тобто підставити заголовок
// як є означає підставити рядок, на який довідник нічого не знайде, і
// користувач побачить порожній список замість свого міста.
//
// Звідси таблиця нижче: найбільші міста України в тій транслітерації, яку
// віддає Vercel. Це не спроба покрити всі 30 тисяч населених пунктів —
// решта просто піде в пошук як є (раптом довідник упорається), а не
// зламає крок квизу.

const LATIN_TO_UA: Record<string, string> = {
  kyiv: 'Київ',
  kiev: 'Київ',
  kharkiv: 'Харків',
  odesa: 'Одеса',
  odessa: 'Одеса',
  dnipro: 'Дніпро',
  donetsk: 'Донецьк',
  zaporizhzhia: 'Запоріжжя',
  zaporozhye: 'Запоріжжя',
  lviv: "Львів",
  "l'viv": 'Львів',
  'kryvyi rih': 'Кривий Ріг',
  mykolaiv: 'Миколаїв',
  sevastopol: 'Севастополь',
  mariupol: 'Маріуполь',
  luhansk: 'Луганськ',
  vinnytsia: 'Вінниця',
  makiivka: 'Макіївка',
  simferopol: 'Сімферополь',
  chernihiv: 'Чернігів',
  kherson: 'Херсон',
  poltava: 'Полтава',
  khmelnytskyi: 'Хмельницький',
  cherkasy: 'Черкаси',
  chernivtsi: 'Чернівці',
  zhytomyr: 'Житомир',
  sumy: 'Суми',
  rivne: 'Рівне',
  'ivano-frankivsk': 'Івано-Франківськ',
  ternopil: 'Тернопіль',
  lutsk: 'Луцьк',
  bila: 'Біла Церква',
  'bila tserkva': 'Біла Церква',
  kramatorsk: 'Краматорськ',
  melitopol: 'Мелітополь',
  kerch: 'Керч',
  uzhhorod: 'Ужгород',
  berdiansk: 'Бердянськ',
  brovary: 'Бровари',
  irpin: 'Ірпінь',
  kremenchuk: 'Кременчук',
  nikopol: 'Нікополь',
  slovyansk: "Слов'янськ",
  pavlohrad: 'Павлоград',
  kropyvnytskyi: 'Кропивницький',
  kirovohrad: 'Кропивницький',
};

// Приймає СИРЕ значення заголовка (може бути undefined або порожнім) і
// повертає назву міста, придатну для пошуку в довіднику Нової Пошти, або
// null — тоді крок квизу поводиться рівно як раніше, з порожнім полем.
export function resolveGeoCity(rawHeader: string | null | undefined): string | null {
  if (!rawHeader) return null;

  let decoded: string;
  try {
    decoded = decodeURIComponent(rawHeader);
  } catch {
    // Некоректний percent-encoding — краще нічого не підставити, ніж
    // покласти крок квизу через виняток у рендері.
    decoded = rawHeader;
  }

  const trimmed = decoded.trim();
  if (!trimmed) return null;

  // Vercel для невідомого міста надсилає літерал "unknown".
  if (trimmed.toLowerCase() === 'unknown') return null;

  // Уже кирилиця — беремо як є, транслітерувати нічого не треба.
  if (/[Ѐ-ӿ]/.test(trimmed)) return trimmed;

  return LATIN_TO_UA[trimmed.toLowerCase()] ?? trimmed;
}
