import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
  Validate,
  ValidateNested,
  ValidatorConstraint,
  isEmail,
  type ValidationArguments,
  type ValidatorConstraintInterface,
} from 'class-validator';

// ТЗ п.31.1 — шаги квиза (гео/бюджет/цели/мощность/финансирование)
export class StartCalculatorDto {
  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  cityRef?: string; // Ref города НП — нужен для PVGIS lat/lng при экспорте

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  budgetUsd?: number;

  @IsArray()
  @IsString({ each: true })
  goals!: string[]; // ProjectGoal.key[]

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  dailyConsumptionKwh?: number;

  // За прямим запитом користувача — "как считать если кабель снижения
  // от установки до потребителя - нету вводных в квизе". ФІЗИЧНО
  // неможливо визначити автоматично (залежить від конкретного
  // будинку/ділянки, не від параметрів системи) — прямий ввід від
  // користувача. Nullable — якщо не вказано, calculator.service.ts
  // застосовує консервативний дефолт із явним попередженням в
  // кошторисі (не мовчки занижує вартість).
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(500)
  @Type(() => Number)
  cableRunMeters?: number;

  // За прямим запитом користувача — "Если доп установка инвертор
  // может быть не нужен - добавить в квиз опциональность инвертора".
  // За замовчуванням false (нова система з нуля, інвертор потрібен) —
  // не впливає на існуючу поведінку для тих, хто квиз ще не проходив
  // заново.
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  hasExistingInverter?: boolean;

  // За прямим запитом користувача — "реализовать реальную разницу в
  // логике (второй контроллер меньшего размера для второго этапа) и
  // дать выбрать в квизе с детальной информацией в случае этого
  // кейса". Опційне — актуально ЛИШЕ якщо бюджету не вистачить на
  // повну комплектацію одразу (planPhases() в business-plan-
  // generation.service.ts), але запитується заздалегідь у квизі, не
  // постфактум.
  @IsOptional()
  @IsIn(['HEADROOM', 'IDENTICAL_SEGMENTS'])
  scalingStrategy?: 'HEADROOM' | 'IDENTICAL_SEGMENTS';

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  financingNeeded?: boolean;

  // За прямим запитом користувача — "внести в квиз вопрос - доверять
  // ли рекомендациям". Опціональний — за замовчуванням false (не
  // впливає на існуючу поведінку підбору для тих, хто квиз ще не
  // проходив заново).
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  trustRecommendations?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  @Type(() => Number)
  ownFundsPercent?: number;

  // За прямим запитом користувача — "В квиз при ветке нужно
  // кредитование добавить вопрос кого представляет пользователь -
  // физлицо осбб и тд (значения фильтра из вкладки кредитование)".
  // Ті самі значення, що @IsIn у FinancingProgramDto.eligibility
  // фільтр (FinancingFilters.tsx) — не новий enum.
  @IsOptional()
  @IsIn(['фізичні', 'ОСББ', 'бізнес'])
  clientType?: string;

  @IsOptional()
  @IsString()
  sessionId?: string; // гостевая сессия — тот же паттерн, что у Cart.sessionId
}

// ТЗ п.31.2 — диалоговое уточнение поверх уже подобранной комплектации
export class RefineCalculatorDto {
  @IsString()
  @MinLength(2)
  text!: string;
}

class SpecItemDto {
  @IsString()
  productId!: string;

  @IsInt()
  @Min(1)
  quantity!: number;
}

// ТЗ п.31.2.1 — правки степпера количества persist обратно в recommendedSpec
export class UpdateSpecDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SpecItemDto)
  items!: SpecItemDto[];
}

// ТЗ п.31.2.1 — клик-в-корзину, батч-вызов
export class AddToCartDto {
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  productIds?: string[]; // конкретные позиции; если не передано — вся спецификация целиком
}

// Два DTO нижче називають поле каналу по-різному: SendPackageDto — channel,
// RequestDocumentsDto — contactChannel. Читаємо обидва: якщо взяти лише
// одне ім'я, для другого DTO значення виявиться undefined і перевірка
// email мовчки не спрацює — рівно той тип помилки, який цей аудит і ловить.
function channelOf(object: object): string | undefined {
  const o = object as { channel?: string; contactChannel?: string };
  return o.channel ?? o.contactChannel;
}

@ValidatorConstraint({ name: 'contactValueMatchesChannel' })
export class ContactValueMatchesChannel implements ValidatorConstraintInterface {
  validate(value: unknown, args: ValidationArguments): boolean {
    if (typeof value !== 'string') return false;
    // Для email — сувора перевірка адреси. Для whatsapp/viber те саме поле
    // означає телефон для діплінку, для telegram воно ігнорується
    // (chat_id береться з User) — там достатньо непорожнього рядка
    // розумної довжини.
    if (channelOf(args.object) === 'email') return isEmail(value);
    return value.trim().length > 0 && value.length <= 64;
  }

  defaultMessage(args: ValidationArguments): string {
    return channelOf(args.object) === 'email'
      ? 'Для каналу email потрібна коректна email-адреса'
      : 'Некоректний контакт для обраного каналу';
  }
}

export class SendPackageDto {
  @IsIn(['telegram', 'whatsapp', 'viber', 'email'])
  channel!: 'telegram' | 'whatsapp' | 'viber' | 'email';

  // Аудит 27.08.2026: тут стояв самий лише @IsString(), а нижче за текстом
  // це значення йшло прямо в `to:` при відправці листа — тобто наш домен
  // (noreply@solarshop.ua) розсилав листи на будь-яку адресу, яку попросив
  // анонімний відвідувач. Це репутація домену і ліміти Resend.
  //
  // Перевірка залежить від каналу: суцільний @IsEmail не годиться, бо для
  // whatsapp/viber те саме поле — це телефон для діплінку, а для telegram
  // воно взагалі ігнорується (chat_id береться з User).
  //
  // Лишається залишковий ризик: надіслати СВІЙ кошторис на чужу адресу все
  // одно можна — це, власне, і є фіча ("надішли монтажнику"). Від спаму
  // тримає RateLimitGuard (5/хв); окремо зазначу, що до цього аудиту він
  // обходився підробкою X-Forwarded-For, і лише тепер справді працює —
  // див. hardenExpress().
  //
  // Реалізовано власним валідатором, а не парою @ValidateIf: кілька
  // @ValidateIf на одному полі складаються через І, тож
  // `channel === 'email'` разом із `channel !== 'email'` дали б умову, яка
  // не виконується ніколи — і поле не перевірялося б узагалі.
  @IsString()
  @MaxLength(254)
  @Validate(ContactValueMatchesChannel)
  contactValue!: string;
}


// ТЗ п.31.11.0 — чек-лист документів перед batch-генерацией. Найдено при
// полном аудите (AUDIT-FULL.md): раньше типизировался inline-объектом в
// контроллере, что полностью обходило global ValidationPipe (NestJS не
// видит рантайм-метаданные для TS-интерфейсов/inline-типов) — теперь
// настоящий класс с валидацией допустимых значений документов/каналов.
export class RequestDocumentsDto {
  @IsArray()
  @IsIn(['SPEC', 'ANNOTATION', 'BLOCK_DIAGRAM', 'PRINCIPAL_DIAGRAM', 'BUSINESS_PLAN'], { each: true })
  requestedDocuments!: string[];

  @IsIn(['telegram', 'whatsapp', 'viber', 'email'])
  contactChannel!: 'telegram' | 'whatsapp' | 'viber' | 'email';

  // Той самий випадок, що й у SendPackageDto вище: звідси адреса теж їде
  // прямо в `to:` при відправці бізнес-плану.
  @IsString()
  @MaxLength(254)
  @Validate(ContactValueMatchesChannel)
  contactValue!: string;

  @IsOptional()
  @IsIn(['HEADROOM', 'IDENTICAL_SEGMENTS'])
  scalingStrategy?: 'HEADROOM' | 'IDENTICAL_SEGMENTS';
}
