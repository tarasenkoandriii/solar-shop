import { PartialType } from '@nestjs/mapped-types';
import { IsNumber, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateOfficeDto {
  @IsString()
  @MinLength(2)
  city!: string;

  @IsString()
  address!: string;

  @IsString()
  phone!: string;

  @IsString()
  email!: string;

  @IsString()
  workHours!: string;

  @IsOptional()
  @IsNumber()
  lat?: number;

  @IsOptional()
  @IsNumber()
  lng?: number;
}

export class UpdateOfficeDto extends PartialType(CreateOfficeDto) {}
