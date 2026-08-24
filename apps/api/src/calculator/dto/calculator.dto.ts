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
  Min,
  MinLength,
  ValidateNested,
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

export class SendPackageDto {
  @IsIn(['telegram', 'whatsapp', 'viber', 'email'])
  channel!: 'telegram' | 'whatsapp' | 'viber' | 'email';

  @IsString()
  contactValue!: string; // email-адрес, телефон для wa.me/Viber-діплінку — Telegram бере chat_id з User, contactValue ігнорується
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

  @IsString()
  contactValue!: string;

  @IsOptional()
  @IsIn(['HEADROOM', 'IDENTICAL_SEGMENTS'])
  scalingStrategy?: 'HEADROOM' | 'IDENTICAL_SEGMENTS';
}
