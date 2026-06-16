import { PrismaClient } from '../generated/prisma/client.js';
import { PrismaPg } from '@prisma/adapter-pg';
import { config } from '../config/index.js';

// Strip Prisma-specific ?schema= param from DATABASE_URL before passing to pg driver
const dbUrl = new URL(config.databaseUrl);
const schema = dbUrl.searchParams.get('schema') || 'public';
dbUrl.searchParams.delete('schema');

// Configure the underlying pg connection pool. Defaults are conservative and
// env-overridable so prod can size the pool to the DB host's max_connections.
const adapter = new PrismaPg(
  {
    connectionString: dbUrl.toString(),
    max: config.db.poolMax,
    idleTimeoutMillis: config.db.idleTimeoutMs,
    connectionTimeoutMillis: config.db.connectionTimeoutMs,
  },
  { schema },
);

const prisma = new PrismaClient({
  adapter,
  log: config.nodeEnv === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

export default prisma;
