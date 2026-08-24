import { PartialType, OmitType } from '@nestjs/mapped-types';
import { Type } from 'class-transformer';
import { IsArray, IsBoolean, IsIn, IsObject, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateProductDto {
  // За прямим запитом користувача ("явно упущен раздел кабели и
  // соединители") — знайдено реальний блокер: жорсткий @IsIn([...])
  // фізично не давав адміну створити товар у категорії CABLE/CONNECTOR
  // через стандартну форму (class-validator відхиляв запит ще до
  // сервісу). Той самий принцип, що вже застосований для query-
  // products.dto.ts (категорії — таблиця, не enum) — прибрано
  // захардкоджений список, лишено просто рядок.
  @IsString()
  category!: string;

  @IsString()
  @MinLength(2)
  name!: string;

  @IsOptional()
  @IsString()
  manufacturerId?: string;

  @IsOptional()
  @IsString()
  manufacturerSku?: string;

  // По одному URL на элемент — сервис пересоздаёт ProductImage-галерею
  // целиком при каждом update (ТЗ п.26.2: первый элемент = обложка).
  @IsArray()
  @IsString({ each: true })
  images!: string[];

  @IsString()
  shortDescription!: string;

  @IsString()
  description!: string;

  @IsObject()
  specs!: Record<string, unknown>;

  @IsOptional()
  @IsIn(['DRAFT', 'PUBLISHED', 'ARCHIVED'])
  status?: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';

  // Маркетинговый флаг "новинка" — вручную в админке, парсер это не определяет.
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  isNew?: boolean;

  @IsOptional()
  @IsString()
  metaTitle?: string;

  @IsOptional()
  @IsString()
  metaDescription?: string;
}

export class UpdateProductDto extends PartialType(OmitType(CreateProductDto, ['category'] as const)) {}
