import { PrismaClient } from '@prisma/client';

export * from '@prisma/client';
export * from './pricing';
export * from './matching';
export * from './calculator';
export * from './schema-diagram-templates';

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
