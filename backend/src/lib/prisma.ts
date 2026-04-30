import { PrismaClient } from '../generated/prisma/client.js';
import { PrismaPg } from '@prisma/adapter-pg';
import { config } from '../config/index.js';

// Strip Prisma-specific ?schema= param from DATABASE_URL before passing to pg driver
const dbUrl = new URL(config.databaseUrl);
const schema = dbUrl.searchParams.get('schema') || 'public';
dbUrl.searchParams.delete('schema');

const adapter = new PrismaPg(dbUrl.toString(), { schema });

const prisma = new PrismaClient({
  adapter,
  log: config.nodeEnv === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

export default prisma;
