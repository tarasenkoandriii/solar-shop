import { PartialType } from '@nestjs/mapped-types';
import { IsArray, IsIn, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateVendorDto {
  @IsString()
  @MinLength(2)
  name!: string;

  @IsString()
  website!: string;

  @IsArray()
  @IsString({ each: true })
  warehouseCities!: string[];

  @IsOptional()
  @IsString()
  contactPhone?: string;

  @IsOptional()
  @IsString()
  contactAddress?: string;

  @IsOptional()
  @IsString()
  contactPersonName?: string;

  @IsOptional()
  @IsIn(['NOT_CONTACTED', 'NEGOTIATING', 'SIGNED', 'DECLINED'])
  contractStatus?: 'NOT_CONTACTED' | 'NEGOTIATING' | 'SIGNED' | 'DECLINED';

  @IsOptional()
  @IsString()
  contractNote?: string;
}

export class UpdateVendorDto extends PartialType(CreateVendorDto) {}

export class SearchVendorCandidatesDto {
  @IsString()
  @MinLength(2)
  country!: string;

  @IsOptional()
  @IsIn(['SOLAR_PANEL', 'BATTERY', 'CONTROLLER', 'INVERTER', 'CABLE', 'CONNECTOR'])
  category?: 'SOLAR_PANEL' | 'BATTERY' | 'CONTROLLER' | 'INVERTER' | 'CABLE' | 'CONNECTOR';

  @IsOptional()
  @IsString()
  city?: string;
}

export class EstimateVendorCatalogDto {
  @IsString()
  @MinLength(3)
  website!: string;
}
