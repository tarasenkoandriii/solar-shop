import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class LogEmbedViewDto {
  @IsString()
  widgetKey!: string;

  @IsOptional()
  @IsString()
  refererHost?: string;
}

export class RecomputeGridDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5) // шаг сітки в градусах — обмежуємо, щоб випадково не запустили місяцями рахувати (крок < 1 = тисячі PVGIS-викликів)
  stepDegrees?: number;
}

export class RecomputeInterpolationDto {
  @IsOptional()
  @IsInt()
  @Min(10)
  @Max(200) // верхня межа — захист від випадкового запуску занадто важкої інтерполяції
  resolution?: number;
}
