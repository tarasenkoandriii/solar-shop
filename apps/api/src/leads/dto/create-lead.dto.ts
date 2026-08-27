import { IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

// Аудит 27.08.2026: верхніх меж не було в жодного поля. Форма на сайті
// відкрита без авторизації, тож у базу приймався текст будь-якої довжини —
// а звідти він підставлявся в повідомлення менеджеру, де ліміт Telegram
// 4096 символів. Довгий коментар означав HTTP 400 від Telegram, який ніхто
// не перевіряв (див. NotifyService.send), і заявка зникала мовчки. Обрізка
// на боці відправки тепер теж є, але приймати кілометровий текст у базу
// сенсу немає — межі потрібні з обох боків.
export class CreateLeadDto {
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name!: string;

  @IsString()
  @MinLength(5)
  @MaxLength(32)
  phone!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  comment?: string;

  @IsOptional()
  @IsIn(['WEB', 'TMA'])
  source?: 'WEB' | 'TMA';
}

export class UpdateLeadStatusDto {
  @IsIn(['NEW', 'IN_PROGRESS', 'CLOSED'])
  status!: 'NEW' | 'IN_PROGRESS' | 'CLOSED';
}
