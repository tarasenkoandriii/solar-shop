import { IsNumber, IsOptional, IsString, IsUrl, MinLength } from 'class-validator';

// Найдено при полном аудите (AUDIT-FULL.md): раньше контроллер принимал
// `Record<string, unknown>` напрямую в Prisma update — mass-assignment
// риск (можно было передать произвольные поля, включая не предназначенные
// для ручного редактирования). Явный DTO со списком разрешённых полей.
export class UpdateFinancingProgramDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  name?: string;

  @IsOptional()
  @IsString()
  eligibility?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsUrl()
  url?: string;

  @IsOptional()
  @IsNumber()
  minLoanUsd?: number;

  @IsOptional()
  @IsNumber()
  maxLoanUsd?: number;

  @IsOptional()
  @IsUrl()
  imageUrl?: string;
}
