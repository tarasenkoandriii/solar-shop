import { IsInt, IsNumber, IsOptional, IsString } from 'class-validator';

export class TelegramLoginDto {
  @IsInt()
  id!: number;

  @IsOptional()
  @IsString()
  first_name?: string;

  @IsOptional()
  @IsString()
  last_name?: string;

  @IsOptional()
  @IsString()
  username?: string;

  @IsOptional()
  @IsString()
  photo_url?: string;

  @IsNumber()
  auth_date!: number;

  @IsString()
  hash!: string;

  // Index signature — совместимость с TelegramAuthPayload из telegram.util.ts,
  // где checkString строится по всем полям объекта динамически.
  [key: string]: unknown;
}
