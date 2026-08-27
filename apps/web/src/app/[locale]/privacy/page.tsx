import { notFound } from 'next/navigation';
import { isLocale, type Locale } from '../../../lib/i18n';
import { COMPANY } from '../../../lib/company';

// За прямим запитом користувача ("составь по образцу предыдущих
// проектов") — структура (розділи, порядок, рівень деталізації)
// портована з РЕАЛЬНОГО коду попереднього проєкту (ATM-travel.org,
// src/legal/legal.content.ts, завантажений користувачем) — той самий
// патерн, що вже перевірений і реально використовується. Сам ЗМІСТ
// написано заново під РЕАЛЬНИЙ функціонал Solar Shop (не скопійовано
// з ATM-travel буквально — там eSIM/Airalo/WayForPay, тут зовсім інший
// бізнес), звірено з фактичною моделлю даних проєкту (packages/db/
// prisma/schema.prisma — User/Order/Lead/FinancingProgramReview) під
// час написання, не вигадано на око.
//
// За запитом користувача (27.08.2026) — реальні реквізити замість
// плейсхолдерів. Джерело одне: lib/company.ts.
//
// Змінилася й організаційна форма: було "ФОП Тарасенко Андрій
// Євгенійович", стало ТОВ. У політиці конфіденційності це не косметика —
// саме ця особа виступає володільцем персональних даних.
const ENTITY_PLACEHOLDER = {
  uk: `${COMPANY.legalName} (код ЄДРПОУ: ${COMPANY.edrpou}, адреса: ${COMPANY.address})`,
  ru: `ООО «ХЕЙСЛОР ФАСТ» (код ЕГРПОУ: ${COMPANY.edrpou}, адрес: ${COMPANY.address})`,
  en: `HEYSLOR FAST LLC (EDRPOU: ${COMPANY.edrpou}, address: ${COMPANY.address})`,
};

const CONTACT_PLACEHOLDER = {
  uk: `${COMPANY.phone}, ${COMPANY.email}`,
  ru: `${COMPANY.phone}, ${COMPANY.email}`,
  en: `${COMPANY.phone}, ${COMPANY.email}`,
};

const CONTENT: Record<Locale, { title: string; sections: { h: string; p: string }[] }> = {
  uk: {
    title: 'Політика конфіденційності',
    sections: [
      {
        h: 'Загальні положення',
        p: `Ця Політика описує, як ${ENTITY_PLACEHOLDER.uk} (далі — «Продавець») обробляє персональні дані користувачів сайту Solar Shop відповідно до Закону України «Про захист персональних даних» (№ 2297-VI). Використовуючи сайт, ви погоджуєтесь із цією Політикою.`,
      },
      {
        h: 'Які дані ми обробляємо',
        p: "Дані профілю Telegram при авторизації (ідентифікатор, ім'я, юзернейм, фото — надаються самим Telegram при вході); номер телефону (якщо вказаний при оформленні замовлення); дані замовлення та доставки (ПІБ отримувача, адреса/відділення Нової Пошти, склад замовлення); дані заявки з калькулятора проєкту СЕС (ім'я, телефон, e-mail, параметри об'єкта); дані відгуку про програму кредитування (місто, відділення банку, оцінки — див. окремий розділ «Відгуки про банки» нижче); технічні дані (IP-адреса, cookies для збереження мови інтерфейсу та обраної валюти).",
      },
      {
        h: 'Мета та правові підстави обробки',
        p: 'Оформлення та виконання замовлень, доставка, авторизація через Telegram, розрахунок орієнтовної вартості СЕС за заявкою з калькулятора, запобігання зловживанням (обмеження частоти запитів). Підстави: виконання договору, згода (вхід через Telegram, подача заявки), законний інтерес (захист від спаму/зловживань).',
      },
      {
        h: 'Відгуки про банки — особливий режим анонімності',
        p: 'Якщо ви залишаєте відгук про програму кредитування, вхід через Telegram потрібен ЛИШЕ для запобігання накрутці (не більше одного відгуку на програму від акаунта, не більше одного на годину) — ваш Telegram-профіль НІКОЛИ не публікується разом із відгуком і не передається третім особам. Публічно показуються лише місто, відділення, числові оцінки та (після модерації) текст відгуку — без жодних ідентифікаційних даних.',
      },
      {
        h: 'Передача третім особам',
        p: "Telegram (авторизація — обробляється згідно з політикою Telegram); Нова Пошта (доставка замовлень — ПІБ отримувача та адреса/відділення передаються виключно для формування накладної); хостинг-провайдер бази даних та застосунку. Ми НЕ передаємо ваші дані рекламодавцям і не продаємо їх третім особам.",
      },
      {
        h: 'Зберігання даних',
        p: "Дані замовлень зберігаються стільки, скільки вимагає законодавство про бухгалтерський облік. Заявки з калькулятора та дані профілю зберігаються до видалення акаунта або звернення про видалення. Ви можете запросити видалення даних, що не підлягають обов'язковому зберіганню.",
      },
      {
        h: 'Ваші права',
        p: 'Доступ до своїх даних, виправлення, видалення, обмеження обробки, відкликання згоди та звернення до Уповноваженого Верховної Ради України з прав людини (орган захисту персональних даних) у разі порушення ваших прав.',
      },
      {
        h: 'Cookies',
        p: 'Використовуються необхідні cookies (обрана мова інтерфейсу, обрана валюта, сесія кошика для гостя) — без них частина функціоналу сайту не працюватиме коректно.',
      },
      {
        h: 'Контакти',
        p: CONTACT_PLACEHOLDER.uk,
      },
    ],
  },
  ru: {
    title: 'Политика конфиденциальности',
    sections: [
      {
        h: 'Общие положения',
        p: `Настоящая Политика описывает, как ${ENTITY_PLACEHOLDER.ru} (далее — «Продавец») обрабатывает персональные данные пользователей сайта Solar Shop в соответствии с Законом Украины «О защите персональных данных» (№ 2297-VI). Используя сайт, вы соглашаетесь с этой Политикой.`,
      },
      {
        h: 'Какие данные мы обрабатываем',
        p: 'Данные профиля Telegram при авторизации (идентификатор, имя, юзернейм, фото — предоставляются самим Telegram при входе); номер телефона (если указан при оформлении заказа); данные заказа и доставки (ФИО получателя, адрес/отделение Новой Почты, состав заказа); данные заявки из калькулятора проекта СЭС (имя, телефон, e-mail, параметры объекта); данные отзыва о программе кредитования (город, отделение банка, оценки — см. отдельный раздел «Отзывы о банках» ниже); технические данные (IP-адрес, cookies для сохранения языка интерфейса и выбранной валюты).',
      },
      {
        h: 'Цели и правовые основания обработки',
        p: 'Оформление и выполнение заказов, доставка, авторизация через Telegram, расчёт ориентировочной стоимости СЭС по заявке из калькулятора, предотвращение злоупотреблений (ограничение частоты запросов). Основания: исполнение договора, согласие (вход через Telegram, подача заявки), законный интерес (защита от спама/злоупотреблений).',
      },
      {
        h: 'Отзывы о банках — особый режим анонимности',
        p: 'Если вы оставляете отзыв о программе кредитования, вход через Telegram нужен ТОЛЬКО для предотвращения накрутки (не более одного отзыва на программу от аккаунта, не более одного в час) — ваш Telegram-профиль НИКОГДА не публикуется вместе с отзывом и не передаётся третьим лицам. Публично показываются только город, отделение, числовые оценки и (после модерации) текст отзыва — без каких-либо идентификационных данных.',
      },
      {
        h: 'Передача третьим лицам',
        p: 'Telegram (авторизация — обрабатывается согласно политике Telegram); Новая Почта (доставка заказов — ФИО получателя и адрес/отделение передаются исключительно для формирования накладной); хостинг-провайдер базы данных и приложения. Мы НЕ передаём ваши данные рекламодателям и не продаём их третьим лицам.',
      },
      {
        h: 'Хранение данных',
        p: 'Данные заказов хранятся столько, сколько требует законодательство о бухгалтерском учёте. Заявки из калькулятора и данные профиля хранятся до удаления аккаунта или обращения об удалении. Вы можете запросить удаление данных, не подлежащих обязательному хранению.',
      },
      {
        h: 'Ваши права',
        p: 'Доступ к своим данным, исправление, удаление, ограничение обработки, отзыв согласия и обращение к Уполномоченному Верховной Рады Украины по правам человека (орган защиты персональных данных) в случае нарушения ваших прав.',
      },
      {
        h: 'Cookies',
        p: 'Используются необходимые cookies (выбранный язык интерфейса, выбранная валюта, сессия корзины для гостя) — без них часть функционала сайта не будет работать корректно.',
      },
      {
        h: 'Контакты',
        p: CONTACT_PLACEHOLDER.ru,
      },
    ],
  },
  en: {
    title: 'Privacy Policy',
    sections: [
      {
        h: 'General provisions',
        p: `This Policy explains how ${ENTITY_PLACEHOLDER.en} (the "Seller") processes personal data of Solar Shop website users in accordance with the Law of Ukraine "On Personal Data Protection" (No. 2297-VI). By using the site you agree to this Policy.`,
      },
      {
        h: 'Data we process',
        p: 'Telegram profile data on sign-in (ID, name, username, photo — provided by Telegram itself at login); phone number (if provided when placing an order); order and delivery data (recipient name, Nova Poshta address/branch, order contents); solar project calculator inquiry data (name, phone, email, project parameters); financing program review data (city, bank branch, ratings — see the separate "Bank reviews" section below); technical data (IP address, cookies for remembering interface language and selected currency).',
      },
      {
        h: 'Purposes and legal bases',
        p: 'Processing and fulfilling orders, delivery, Telegram-based authentication, estimating solar system cost from calculator inquiries, preventing abuse (rate limiting). Legal bases: performance of a contract, consent (Telegram sign-in, submitting an inquiry), legitimate interest (anti-spam/anti-abuse protection).',
      },
      {
        h: 'Bank reviews — special anonymity regime',
        p: 'If you leave a review about a financing program, Telegram sign-in is required ONLY to prevent abuse (at most one review per program per account, at most one per hour) — your Telegram profile is NEVER published alongside the review and is never shared with third parties. Only the city, branch, numeric ratings, and (after moderation) the review text are shown publicly — with no identifying data whatsoever.',
      },
      {
        h: 'Sharing with third parties',
        p: "Telegram (authentication — processed under Telegram's own policy); Nova Poshta (order delivery — recipient name and address/branch are shared solely to generate the waybill); the database and application hosting provider. We do NOT share your data with advertisers and do not sell it to third parties.",
      },
      {
        h: 'Data retention',
        p: 'Order data is retained for as long as required by accounting legislation. Calculator inquiries and profile data are retained until account deletion or a deletion request. You may request deletion of data not subject to mandatory retention.',
      },
      {
        h: 'Your rights',
        p: 'Access to your data, rectification, erasure, restriction of processing, withdrawal of consent, and the right to lodge a complaint with the Ukrainian Parliament Commissioner for Human Rights (the personal data protection authority) if your rights are violated.',
      },
      {
        h: 'Cookies',
        p: 'We use essential cookies (selected interface language, selected currency, guest cart session) — without them some site functionality will not work correctly.',
      },
      {
        h: 'Contacts',
        p: CONTACT_PLACEHOLDER.en,
      },
    ],
  },
};

export const dynamic = 'force-dynamic';

export default function PrivacyPage({ params }: { params: { locale: string } }) {
  if (!isLocale(params.locale)) notFound();
  const locale = params.locale as Locale;
  const content = CONTENT[locale];

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 text-leaf-900/80">
      <h1 className="mb-2 text-2xl font-semibold text-leaf-900">{content.title}</h1>
      <p className="mb-8 text-xs text-leaf-900/40">
        {locale === 'uk' ? 'Проєкт документа' : locale === 'ru' ? 'Проект документа' : 'Draft document'} —{' '}
        {locale === 'uk'
          ? 'структура на основі попереднього проєкту, реквізити та деталі потребують перевірки юристом перед запуском.'
          : locale === 'ru'
            ? 'структура на основе предыдущего проекта, реквизиты и детали требуют проверки юристом перед запуском.'
            : 'structure based on a previous project, details and business registration data require legal review before launch.'}
      </p>
      <div className="flex flex-col gap-6">
        {content.sections.map((s) => (
          <section key={s.h}>
            <h2 className="mb-2 font-semibold text-leaf-900">{s.h}</h2>
            <p className="text-sm leading-relaxed">{s.p}</p>
          </section>
        ))}
      </div>
    </div>
  );
}
