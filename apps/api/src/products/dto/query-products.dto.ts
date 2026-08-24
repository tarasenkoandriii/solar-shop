import { Type } from 'class-transformer';
import { IsArray, IsBoolean, IsIn, IsInt, IsOptional, IsString, Min } from 'class-validator';

export type SortOption = 'price_asc' | 'price_desc' | 'newest';

export class QueryProductsDto {
  // За запитом користувача (категорії тепер таблиця, не жорсткий enum) —
  // прибрано @IsIn(['SOLAR_PANEL','BATTERY','CONTROLLER']), яке б
  // відхиляло фільтрацію по будь-якій щойно затвердженій новій
  // категорії. Невідомий/помилковий category просто природно поверне
  // порожній список (findMany where category: 'typo' — 0 збігів), не
  // падає — та сама поведінка, що й раніше для валідного, але
  // неіснуючого значення.
  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsArray()
  @Type(() => String)
  manufacturerId?: string[];

  @IsOptional()
  @IsIn(['price_asc', 'price_desc', 'newest'])
  sort?: SortOption;

  @IsOptional()
  @IsString()
  type?: string;

  @IsOptional()
  @IsString()
  chemistry?: string;

  @IsOptional()
  @IsString()
  controllerType?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  pageSize?: number = 12;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  inStockOnly?: boolean;

  // ТЗ п.18.4: опциональный фильтр "Только акции"
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  promoOnly?: boolean;

  // ТЗ п.30.2: базовый site search (pg_trgm) по name/articleNumber/manufacturerSku
  @IsOptional()
  @IsString()
  q?: string;
}
