import { IsIn, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateLeadDto {
  @IsString()
  @MinLength(2)
  name!: string;

  @IsString()
  @MinLength(5)
  phone!: string;

  @IsOptional()
  @IsString()
  comment?: string;

  @IsOptional()
  @IsIn(['WEB', 'TMA'])
  source?: 'WEB' | 'TMA';
}

export class UpdateLeadStatusDto {
  @IsIn(['NEW', 'IN_PROGRESS', 'CLOSED'])
  status!: 'NEW' | 'IN_PROGRESS' | 'CLOSED';
}
