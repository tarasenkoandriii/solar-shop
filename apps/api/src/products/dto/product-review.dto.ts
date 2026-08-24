import { IsInt, IsOptional, IsString, Max, Min, MaxLength } from 'class-validator';

// За прямим запитом користувача — "привязать отзывы к покупке" —
// orderItemId тепер обов'язковий, ідентифікує КОНКРЕТНУ позицію
// замовлення, не лише товар взагалі.
export class CreateProductReviewDto {
  @IsString()
  orderItemId!: string;

  @IsInt()
  @Min(1)
  @Max(10)
  reliabilityScore!: number;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  reviewText?: string;
}

// За прямим запитом користувача — "допускается редактировать...
// самим покупателем только". Обидва поля опційні — можна змінити лише
// оцінку, лише текст, або обидва разом.
export class UpdateProductReviewDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10)
  reliabilityScore?: number;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  reviewText?: string;
}
