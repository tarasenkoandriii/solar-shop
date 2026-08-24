import { IsBoolean, IsIn, IsNumber, IsOptional, IsString, IsUrl, Min } from 'class-validator';

export class UpsertTariffDto {
  @IsString()
  key!: string;

  @IsString()
  label!: string;

  @IsNumber()
  @Min(0)
  rateUahPerKwh!: number;

  @IsOptional()
  @IsUrl()
  sourceUrl?: string;
}

export class ApplyPowerRangeThresholdDto {
  @IsIn(['SMALL', 'MEDIUM', 'LARGE', 'COMMERCIAL'])
  tag!: 'SMALL' | 'MEDIUM' | 'LARGE' | 'COMMERCIAL';

  @IsNumber()
  @Min(0)
  minPanelsWattW!: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  maxPanelsWattW?: number | null;
}

export class ApplyScalingThresholdDto {
  @IsNumber()
  @Min(0)
  headroomMaxPricePercent!: number;
}

// За прямим запитом користувача — "На вкладке Налаштування добавить
// секцію Налаштування документообігу".
export class SetDocumentTypeEnabledDto {
  @IsIn(['SPEC', 'ANNOTATION', 'BLOCK_DIAGRAM', 'PRINCIPAL_DIAGRAM', 'BUSINESS_PLAN'])
  key!: string;

  @IsBoolean()
  enabled!: boolean;
}
