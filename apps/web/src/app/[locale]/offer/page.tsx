import { notFound } from 'next/navigation';
import Link from 'next/link';
import { isLocale, type Locale } from '../../../lib/i18n';
import { COMPANY } from '../../../lib/company';

// За прямим запитом користувача ("составь по образцу предыдущих
// проектов") — структура портована з РЕАЛЬНОГО коду попереднього
// проєкту (ATM-travel.org, src/legal/legal.content.ts, розділ
// "terms" — завантажений користувачем), сам зміст написано заново під
// реальний функціонал Solar Shop (роздрібний продаж комплектуючих для
// СЕС, не eSIM). Свідомо узгоджено з payment/page.tsx (розділ "Оплата"
// нижче — "лише безготівковий розрахунок" — та сама умова, що вже
// реально відображена на сторінці оплати, не суперечить їй).
//
// Повернення технічно складних товарів — навмисно ОБЕРЕЖНЕ
// формулювання ("може підпадати під перелік", не категоричне
// твердження) — сонячні панелі/акумулятори/контролери з електронними
// компонентами потенційно підпадають під Постанову КМУ №172 про
// технічно складні побутові товари, це вимагає юридичної перевірки
// конкретних моделей, не мій здогад.
// За запитом користувача (27.08.2026) — реальні реквізити замість
// плейсхолдерів, джерело одне: lib/company.ts.
//
// Форма змінилася з ФОП на ТОВ. Для публічної оферти це принципово: саме
// ця юридична особа є стороною договору, який покупець приймає натисканням
// кнопки. Договір із неіснуючим ФОП не був би договором.
const ENTITY_PLACEHOLDER = {
  uk: `${COMPANY.legalName} (код ЄДРПОУ: ${COMPANY.edrpou}, юридична адреса: ${COMPANY.address})`,
  ru: `ООО «ХЕЙСЛОР ФАСТ» (код ЕГРПОУ: ${COMPANY.edrpou}, юридический адрес: ${COMPANY.address})`,
  en: `HEYSLOR FAST LLC (EDRPOU: ${COMPANY.edrpou}, registered address: ${COMPANY.address})`,
};

const CONTACT_PLACEHOLDER = {
  uk: `${COMPANY.phone}, ${COMPANY.email}`,
  ru: `${COMPANY.phone}, ${COMPANY.email}`,
  en: `${COMPANY.phone}, ${COMPANY.email}`,
};

const CONTENT: Record<Locale, { title: string; sections: { h: string; p: string }[] }> = {
  uk: {
    title: 'Публічна оферта',
    sections: [
      {
        h: 'Загальні положення',
        p: `Ця Оферта є пропозицією ${ENTITY_PLACEHOLDER.uk} (далі — «Продавець») укласти договір роздрібної купівлі-продажу на умовах, викладених нижче. Оформлення замовлення на сайті Solar Shop є повним і безумовним прийняттям (акцептом) цієї Оферти відповідно до ст. 633, 641 Цивільного кодексу України.`,
      },
      {
        h: 'Предмет договору',
        p: 'Продавець зобов\'язується передати у власність Покупця товар (сонячні панелі, акумулятори, контролери заряду та супутні комплектуючі), а Покупець — прийняти та оплатити товар на умовах цієї Оферти. Найменування, кількість, ціна товару визначаються на підставі оформленого на сайті замовлення.',
      },
      {
        h: 'Порядок оформлення замовлення',
        p: 'Замовлення оформлюється через кошик на сайті. Після оформлення менеджер Продавця зв\'язується з Покупцем для підтвердження складу, ціни та умов доставки замовлення. Договір вважається укладеним з моменту підтвердження замовлення менеджером.',
      },
      {
        h: 'Ціна та оплата',
        p: 'Ціни на сайті вказані в гривнях (з можливістю перегляду в доларах США за довідковим курсом) і можуть змінюватись до моменту підтвердження замовлення. Оплата здійснюється виключно безготівковим банківським переказом на реквізити, вказані на сторінці «Оплата» — готівкова оплата та оплата карткою онлайн на цьому етапі не приймаються.',
      },
      {
        h: 'Доставка',
        p: 'Доставка здійснюється перевізником «Нова Пошта» (відділення або адресна доставка, за вибором Покупця) за рахунок Покупця, якщо інше не погоджено окремо. Строк доставки залежить від наявності товару на складі та строків роботи перевізника.',
      },
      {
        h: 'Гарантія',
        p: 'На товар поширюється гарантія виробника згідно з гарантійним талоном/документами, що додаються до товару. Гарантійне обслуговування здійснюється відповідно до умов виробника та законодавства України про захист прав споживачів.',
      },
      {
        h: 'Повернення та обмін',
        p: 'Повернення товару належної якості здійснюється відповідно до Закону України «Про захист прав споживачів». Звертаємо увагу: окремі категорії товарів з електронними компонентами можуть підпадати під перелік технічно складних побутових товарів (Постанова КМУ № 172), що підлягають поверненню/обміну лише в разі істотного недоліку — уточнюйте можливість повернення конкретного товару в менеджера до оформлення замовлення.',
      },
      {
        h: 'Права та обов\'язки сторін',
        p: 'Продавець зобов\'язується передати товар належної якості в узгоджений строк. Покупець зобов\'язується своєчасно оплатити та прийняти замовлений товар. Сторони несуть відповідальність згідно з чинним законодавством України.',
      },
      {
        h: 'Форс-мажор',
        p: 'Сторони звільняються від відповідальності за часткове або повне невиконання зобов\'язань, якщо це стало наслідком обставин непереборної сили (воєнний стан, стихійні лиха, дії органів влади тощо), що підтверджується в установленому порядку.',
      },
      {
        h: 'Строк дії оферти',
        p: 'Оферта діє безстроково та може бути змінена Продавцем в односторонньому порядку шляхом публікації нової редакції на сайті.',
      },
      {
        h: 'Реквізити Продавця',
        p: CONTACT_PLACEHOLDER.uk,
      },
    ],
  },
  ru: {
    title: 'Публичная оферта',
    sections: [
      {
        h: 'Общие положения',
        p: `Настоящая Оферта является предложением ${ENTITY_PLACEHOLDER.ru} (далее — «Продавец») заключить договор розничной купли-продажи на условиях, изложенных ниже. Оформление заказа на сайте Solar Shop является полным и безусловным принятием (акцептом) настоящей Оферты в соответствии со ст. 633, 641 Гражданского кодекса Украины.`,
      },
      {
        h: 'Предмет договора',
        p: 'Продавец обязуется передать в собственность Покупателя товар (солнечные панели, аккумуляторы, контроллеры заряда и сопутствующие комплектующие), а Покупатель — принять и оплатить товар на условиях настоящей Оферты. Наименование, количество, цена товара определяются на основании оформленного на сайте заказа.',
      },
      {
        h: 'Порядок оформления заказа',
        p: 'Заказ оформляется через корзину на сайте. После оформления менеджер Продавца связывается с Покупателем для подтверждения состава, цены и условий доставки заказа. Договор считается заключённым с момента подтверждения заказа менеджером.',
      },
      {
        h: 'Цена и оплата',
        p: 'Цены на сайте указаны в гривнах (с возможностью просмотра в долларах США по справочному курсу) и могут изменяться до момента подтверждения заказа. Оплата производится исключительно безналичным банковским переводом на реквизиты, указанные на странице «Оплата» — наличная оплата и оплата картой онлайн на этом этапе не принимаются.',
      },
      {
        h: 'Доставка',
        p: 'Доставка осуществляется перевозчиком «Новая Почта» (отделение или адресная доставка, по выбору Покупателя) за счёт Покупателя, если иное не согласовано отдельно. Срок доставки зависит от наличия товара на складе и сроков работы перевозчика.',
      },
      {
        h: 'Гарантия',
        p: 'На товар распространяется гарантия производителя согласно гарантийному талону/документам, прилагаемым к товару. Гарантийное обслуживание осуществляется в соответствии с условиями производителя и законодательством Украины о защите прав потребителей.',
      },
      {
        h: 'Возврат и обмен',
        p: 'Возврат товара надлежащего качества осуществляется в соответствии с Законом Украины «О защите прав потребителей». Обращаем внимание: отдельные категории товаров с электронными компонентами могут подпадать под перечень технически сложных бытовых товаров (Постановление КМУ № 172), подлежащих возврату/обмену только при существенном недостатке — уточняйте возможность возврата конкретного товара у менеджера до оформления заказа.',
      },
      {
        h: 'Права и обязанности сторон',
        p: 'Продавец обязуется передать товар надлежащего качества в согласованный срок. Покупатель обязуется своевременно оплатить и принять заказанный товар. Стороны несут ответственность согласно действующему законодательству Украины.',
      },
      {
        h: 'Форс-мажор',
        p: 'Стороны освобождаются от ответственности за частичное или полное невыполнение обязательств, если это явилось следствием обстоятельств непреодолимой силы (военное положение, стихийные бедствия, действия органов власти и т.д.), что подтверждается в установленном порядке.',
      },
      {
        h: 'Срок действия оферты',
        p: 'Оферта действует бессрочно и может быть изменена Продавцом в одностороннем порядке путём публикации новой редакции на сайте.',
      },
      {
        h: 'Реквизиты Продавца',
        p: CONTACT_PLACEHOLDER.ru,
      },
    ],
  },
  en: {
    title: 'Public Offer',
    sections: [
      {
        h: 'General provisions',
        p: `This Offer is a proposal by ${ENTITY_PLACEHOLDER.en} (the "Seller") to enter into a retail sale agreement on the terms set out below. Placing an order on the Solar Shop website constitutes full and unconditional acceptance of this Offer under Articles 633 and 641 of the Civil Code of Ukraine.`,
      },
      {
        h: 'Subject of the agreement',
        p: 'The Seller undertakes to transfer ownership of the goods (solar panels, batteries, charge controllers, and related components) to the Buyer, and the Buyer undertakes to accept and pay for the goods under the terms of this Offer. Item names, quantities, and prices are determined by the order placed on the website.',
      },
      {
        h: 'Placing an order',
        p: 'Orders are placed via the site\'s cart. After placing an order, the Seller\'s manager contacts the Buyer to confirm the order contents, price, and delivery terms. The agreement is considered concluded once the manager confirms the order.',
      },
      {
        h: 'Price and payment',
        p: 'Prices on the site are quoted in Ukrainian hryvnia (with a US dollar reference view available) and may change before order confirmation. Payment is accepted exclusively by bank transfer to the details shown on the Payment page — cash payment and online card payment are not currently accepted.',
      },
      {
        h: 'Delivery',
        p: 'Delivery is carried out by Nova Poshta (branch pickup or address delivery, at the Buyer\'s choice) at the Buyer\'s expense unless otherwise agreed. Delivery time depends on stock availability and the carrier\'s schedule.',
      },
      {
        h: 'Warranty',
        p: "The goods are covered by the manufacturer's warranty as per the warranty card/documents supplied with the goods. Warranty service is provided in accordance with the manufacturer's terms and Ukrainian consumer protection law.",
      },
      {
        h: 'Returns and exchanges',
        p: "Goods of proper quality may be returned in accordance with the Law of Ukraine \"On Consumer Rights Protection\". Please note: certain product categories with electronic components may fall under the list of technically complex household goods (Cabinet of Ministers Resolution No. 172), which can only be returned/exchanged in case of a significant defect — check the return eligibility of a specific item with our manager before ordering.",
      },
      {
        h: 'Rights and obligations of the parties',
        p: 'The Seller undertakes to deliver goods of proper quality within the agreed timeframe. The Buyer undertakes to pay for and accept the ordered goods on time. Both parties are liable in accordance with applicable Ukrainian law.',
      },
      {
        h: 'Force majeure',
        p: 'Neither party is liable for partial or complete non-performance of obligations resulting from force majeure circumstances (martial law, natural disasters, actions of government authorities, etc.), confirmed in the manner prescribed by law.',
      },
      {
        h: 'Validity period',
        p: 'This Offer is valid indefinitely and may be amended by the Seller unilaterally by publishing a new version on the website.',
      },
      {
        h: 'Seller details',
        p: CONTACT_PLACEHOLDER.en,
      },
    ],
  },
};

export const dynamic = 'force-dynamic';

export default function OfferPage({ params }: { params: { locale: string } }) {
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
            : 'structure based on a previous project, details and business registration data require legal review before launch.'}{' '}
        {/* Веде на /contacts, а не на /payment: сторінки об'єднано
            (27.08.2026). Редирект спрацював би й зі старим посиланням, але
            гнати відвідувача через зайвий перехід усередині власного сайту
            ні до чого. */}
        <Link href={`/${locale}/contacts`} className="underline">
          {locale === 'uk' ? 'Реквізити оплати' : locale === 'ru' ? 'Реквизиты оплаты' : 'Payment details'}
        </Link>
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
