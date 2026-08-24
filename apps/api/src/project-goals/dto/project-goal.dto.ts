import { IsBoolean, IsIn, IsOptional, IsString, Matches, MinLength } from 'class-validator';

const TOPOLOGIES = ['OFF_GRID', 'BACKUP_UPS', 'GRID_TIE', 'COMMERCIAL'];

export class CreateProjectGoalDto {
  @IsString()
  @Matches(/^[A-Z][A-Z0-9_]*$/, { message: 'key має бути LATIN_SNAKE_CASE' })
  key!: string;

  @IsString()
  @MinLength(2)
  label!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsIn(TOPOLOGIES)
  defaultTopology?: string;
}

export class UpdateProjectGoalDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  label?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsIn(TOPOLOGIES)
  defaultTopology?: string | null;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class SuggestProjectGoalsDto {
  @IsOptional()
  @IsString()
  brief?: string;
}
