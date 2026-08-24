import { IsOptional, IsString, MinLength } from 'class-validator';

export class UpdateSchemaTemplateDto {
  @IsString()
  @MinLength(20) // хоть какой-то валидный SVG-каркас
  svgTemplate!: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
