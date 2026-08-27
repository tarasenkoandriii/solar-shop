import { IsUUID } from 'class-validator';

// АУДИТ 27.08.2026 — інʼєкція у фільтр Prisma через `@Body('sessionId')`.
//
// Глобальний ValidationPipe налаштований з `transform: true`, і на перший
// погляд цього досить. Але для примітивів він викликає transformPrimitive(),
// а там першим рядком стоїть перевірка `type !== 'param' && type !== 'query'`
// — тобто ТІЛО запиту не приводиться й не валідується взагалі. NestJS не
// має рантайм-метаданих для параметра, оголошеного як `sessionId: string`,
// тож будь-яке значення долітало до сервісу як є.
//
// Наслідок був прямий: POST /calculator/merge з тілом
//   { "sessionId": { "not": null } }
// перетворювало умову `where: { sessionId, userId: null }` на "усі гостьові
// розрахунки в базі" — і updateMany переписував їх на того, хто надіслав
// запит. Той самий прийом у POST /cart/merge віддавав чужий кошик.
//
// Лікується не перевіркою типу в сервісі, а DTO-класом: у класу є
// рантайм-метадані, тому ValidationPipe вмикається штатно.
//
// IsUUID, а не IsString: клієнт генерує sessionId через crypto.randomUUID()
// (apps/web/src/lib/client-api.ts), тож формат відомий точно. Вужча
// перевірка тут коштує стільки ж, а відсікає не лише обʼєкти-оператори, а
// й будь-яке сміття, що дійшло б до запиту в БД.
export class MergeGuestSessionDto {
  @IsUUID()
  sessionId!: string;
}
