import { IsInt, IsNotEmpty, IsOptional, IsString, Max, Min, MaxLength } from 'class-validator';

// Справжній DTO-клас з class-validator (не inline @Body()) — той самий
// клас проблеми, що вже виправлявся системно в AUDIT-FULL.md.
export class CreateFinancingReviewDto {
  @IsString()
  @IsNotEmpty()
  city!: string;

  @IsString()
  @IsNotEmpty()
  branch!: string;

  @IsInt()
  @Min(1)
  @Max(10)
  businessPlanQualityScore!: number;

  @IsInt()
  @Min(1)
  @Max(10)
  bankResponsivenessScore!: number;

  @IsInt()
  @Min(1)
  @Max(10)
  processingSpeedScore!: number;

  @IsInt()
  @Min(1)
  @Max(10)
  applicationSuccessScore!: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  coveragePercent?: number;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  reviewText?: string;
}
