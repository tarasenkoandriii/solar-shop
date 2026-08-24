import { IsArray, IsIn, IsOptional, IsString, MinLength } from 'class-validator';

const POWER_TAGS = ['SMALL', 'MEDIUM', 'LARGE', 'COMMERCIAL'];

export class CreateManifestDto {
  @IsArray()
  @IsString({ each: true })
  goalTags!: string[];

  @IsOptional()
  @IsIn(POWER_TAGS)
  powerRangeTag?: string | null;

  @IsString()
  @MinLength(10)
  content!: string;

  @IsOptional()
  @IsString()
  changeNote?: string;
}

export class GenerateManifestDto {
  @IsArray()
  @IsString({ each: true })
  goalTags!: string[];

  @IsOptional()
  @IsIn(POWER_TAGS)
  powerRangeTag?: string | null;

  @IsOptional()
  @IsString()
  brief?: string;
}
