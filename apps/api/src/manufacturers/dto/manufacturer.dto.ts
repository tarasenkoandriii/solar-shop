import { PartialType } from '@nestjs/mapped-types';
import { IsIn, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateManufacturerDto {
  @IsString()
  @MinLength(2)
  name!: string;

  @IsIn(['EUROPE', 'CHINA'])
  region!: 'EUROPE' | 'CHINA';

  @IsString()
  country!: string;

  @IsOptional()
  @IsString()
  logoUrl?: string;
}

export class UpdateManufacturerDto extends PartialType(CreateManufacturerDto) {}
