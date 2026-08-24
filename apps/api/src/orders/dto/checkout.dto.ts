import { IsBoolean, IsIn, IsInt, IsOptional, IsString, Min, MinLength } from 'class-validator';

// Общие поля доставки/контакта для чекаута из корзины и "Купить в 1 клик"
// (ТЗ п.22.1) — согласие на обработку ПД обязательно (ТЗ п.28.6).
export class DeliveryContactDto {
  @IsString()
  @MinLength(2)
  contactName!: string;

  @IsString()
  @MinLength(5)
  contactPhone!: string;

  @IsOptional()
  @IsString()
  comment?: string;

  @IsOptional()
  @IsString()
  npCityRef?: string;

  // Требуется адаптером Nova Poshta (RecipientCityName в InternetDocument/
  // save — Ref города недостаточно, нужно и текстовое имя), см.
  // NovaPoshtaService.createTtn.
  @IsOptional()
  @IsString()
  npCityName?: string;

  @IsOptional()
  @IsString()
  npWarehouseRef?: string;

  // Фолбэк для createTtn, если по какой-то причине нет Ref отделения
  @IsOptional()
  @IsString()
  npWarehouseName?: string;

  @IsBoolean()
  consentGiven!: boolean;

  @IsIn(['web', 'tma'])
  source!: 'web' | 'tma';

  // Для гостя (не авторизован через Telegram) — та же гостевая сессия, что
  // и у корзины, нужна чтобы найти/очистить Cart после оформления.
  @IsOptional()
  @IsString()
  sessionId?: string;
}

export class BuyNowDto extends DeliveryContactDto {
  @IsString()
  productId!: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  quantity?: number;
}

export class UpdateOrderStatusDto {
  @IsIn(['NEW', 'INVOICED', 'PAID', 'SHIPPED', 'CANCELLED'])
  status!: 'NEW' | 'INVOICED' | 'PAID' | 'SHIPPED' | 'CANCELLED';
}
