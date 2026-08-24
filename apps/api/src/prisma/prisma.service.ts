import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { prisma } from '@solar-shop/db';

// Тонкая обёртка над общим Prisma-клиентом из packages/db, чтобы модули
// NestJS могли инжектить его через DI, не импортируя singleton напрямую.
@Injectable()
export class PrismaService implements OnModuleInit, OnModuleDestroy {
  readonly client = prisma;

  async onModuleInit() {
    await this.client.$connect();
  }

  async onModuleDestroy() {
    await this.client.$disconnect();
  }
}
