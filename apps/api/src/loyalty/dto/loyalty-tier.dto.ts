import { PartialType } from '@nestjs/mapped-types';
import { IsNumber, Min } from 'class-validator';

export class CreateLoyaltyTierDto {
  @IsNumber()
  @Min(0)
  minSpendUah!: number;

  @IsNumber()
  @Min(0)
  discountPercent!: number;
}

export class UpdateLoyaltyTierDto extends PartialType(CreateLoyaltyTierDto) {}
