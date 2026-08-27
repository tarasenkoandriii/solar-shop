import { PartialType } from '@nestjs/mapped-types';
import { IsNumber, Max, Min } from 'class-validator';

export class CreateLoyaltyTierDto {
  @IsNumber()
  @Min(0)
  minSpendUah!: number;

  // Аудит 27.08.2026: верхньої межі не було ні тут, ні в LoyaltyService,
  // ні при розрахунку підсумку (`subtotalUsd * (1 - percent / 100)`) —
  // тир зі знижкою 150% давав відʼємну суму замовлення. 90, а не 100:
  // тир, що віддає товар безкоштовно, майже напевно означає помилку при
  // введенні, а не задум. Друга, незалежна межа стоїть у місці
  // застосування (OrdersService) — на випадок тирів, заведених раніше.
  @IsNumber()
  @Min(0)
  @Max(90)
  discountPercent!: number;
}

export class UpdateLoyaltyTierDto extends PartialType(CreateLoyaltyTierDto) {}
