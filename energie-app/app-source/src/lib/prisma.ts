import 'dotenv/config';
import { PrismaClient } from '.prisma/client';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL is missing. Set it in your local environment before starting the app.');
}

const adapter = new PrismaMariaDb(connectionString);

const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;