import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class AddCartItemDto {
  @IsString()
  productId!: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  quantity?: number;

  // Гостевая корзина — sessionId генерируется клиентом (crypto.randomUUID())
  // и хранится в localStorage/cookie, ТЗ п.19.1. Игнорируется, если запрос
  // авторизован (Telegram-сессия) — тогда используется userId.
  @IsOptional()
  @IsString()
  sessionId?: string;
}

export class UpdateCartItemDto {
  @IsInt()
  @Min(1)
  quantity!: number;
}
