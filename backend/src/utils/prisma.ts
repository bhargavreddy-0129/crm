import dotenv from 'dotenv';
dotenv.config();

if (!process.env.DATABASE_URL && process.env.POSTGRES_URL) {
  process.env.DATABASE_URL = process.env.POSTGRES_URL;
}

import { PrismaClient } from '@prisma/client';

const databaseUrl = process.env.DATABASE_URL;

export const prisma = new PrismaClient(
  databaseUrl
    ? {
        datasources: {
          db: {
            url: databaseUrl.trim(),
          },
        },
      }
    : undefined
);
