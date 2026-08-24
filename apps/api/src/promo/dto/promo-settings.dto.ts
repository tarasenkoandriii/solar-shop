import { IsIn, IsNumber, IsOptional, Min } from 'class-validator';

export class UpsertPromoSettingsDto {
  @IsOptional()
  @IsIn(['SOLAR_PANEL', 'BATTERY', 'CONTROLLER', 'INVERTER', 'CABLE', 'CONNECTOR'])
  category?: 'SOLAR_PANEL' | 'BATTERY' | 'CONTROLLER' | 'INVERTER' | 'CABLE' | 'CONNECTOR' | null;

  @IsNumber()
  @Min(0)
  thresholdPercent!: number;
}
