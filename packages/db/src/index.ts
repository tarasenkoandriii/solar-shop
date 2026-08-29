import { PrismaClient } from '@prisma/client';

export * from '@prisma/client';
export * from './pricing';
export * from './matching';
export * from './calculator';
export * from './schema-diagram-templates';
// Аудит 27.08.2026 — розрахунок кількості акумуляторів (ампер-години в
// кВт·год, глибина розряду, ККД інвертора). Живе тут, поруч із pricing і
// matching, бо це та сама категорія: чиста детермінована логіка без
// Prisma, яку можна перевірити тестом.
export * from './battery';

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
