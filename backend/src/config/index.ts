import 'dotenv/config';
import { z } from 'zod';

// Centralized, validated environment config. `parseEnv` is pure (takes an env
// bag) so it can be unit-tested; the module-level `config` parses the real
// `process.env` once at boot and fails fast — reporting *all* missing/invalid
// vars at once instead of throwing on the first one like the old `requireEnv`.

/** Optional number from a string env var; empty/absent falls back to `def`. */
const numEnv = (def: number) =>
  z.preprocess(
    (v) => (v === undefined || v === '' ? undefined : v),
    z.coerce.number().default(def),
  );

/** Boolean env var using the historical `=== 'true'` semantics. */
const boolEnv = z.preprocess((v) => v === 'true', z.boolean());

const envSchema = z.object({
  NODE_ENV: z.string().default('development'),
  API_PORT: numEnv(3000),
  APP_URL: z.string().default('http://localhost:5173'),
  API_URL: z.string().default('http://localhost:3000'),

  LOG_LEVEL: z.string().optional(),

  // Bearer token guarding GET /api/metrics. Unset → the endpoint is disabled.
  METRICS_TOKEN: z.string().default(''),

  SENTRY_DSN: z.string().default(''),
  SENTRY_TRACES_SAMPLE_RATE: numEnv(0),

  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  DB_POOL_MAX: numEnv(10),
  DB_POOL_IDLE_TIMEOUT_MS: numEnv(10_000),
  DB_POOL_CONNECTION_TIMEOUT_MS: numEnv(10_000),

  JWT_ACCESS_SECRET: z.string().min(1, 'JWT_ACCESS_SECRET is required'),
  JWT_REFRESH_SECRET: z.string().min(1, 'JWT_REFRESH_SECRET is required'),
  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),

  SMTP_HOST: z.string().min(1, 'SMTP_HOST is required'),
  SMTP_PORT: numEnv(587),
  SMTP_SECURE: boolEnv,
  SMTP_USER: z.string().min(1, 'SMTP_USER is required'),
  SMTP_PASS: z.string().min(1, 'SMTP_PASS is required'),
  SMTP_FROM: z.string().min(1, 'SMTP_FROM is required'),
  SMTP_FROM_NAME: z.string().default('SalvaDash'),

  VAPID_PUBLIC_KEY: z.string().default(''),
  VAPID_PRIVATE_KEY: z.string().default(''),
  VAPID_SUBJECT: z.string().default(''),

  BACKUP_DIR: z.string().default('./backups'),
  BACKUP_RETENTION_DAYS: numEnv(10),
  BACKUP_CLOUD_ENABLED: boolEnv,
  PG_BIN_PATH: z.string().default(''),

  BRANDFETCH_API_KEY: z.string().default(''),
});

export function parseEnv(env: NodeJS.ProcessEnv) {
  const parsed = envSchema.safeParse(env);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  - ${i.path.join('.') || '(root)'}: ${i.message}`)
      .join('\n');
    throw new Error(`Invalid environment configuration:\n${issues}`);
  }
  const e = parsed.data;

  return {
    nodeEnv: e.NODE_ENV,
    port: e.API_PORT,
    appUrl: e.APP_URL,
    apiUrl: e.API_URL,

    logLevel: e.LOG_LEVEL ?? (e.NODE_ENV === 'production' ? 'info' : 'debug'),

    metrics: {
      token: e.METRICS_TOKEN,
    },

    sentry: {
      dsn: e.SENTRY_DSN,
      tracesSampleRate: e.SENTRY_TRACES_SAMPLE_RATE,
    },

    databaseUrl: e.DATABASE_URL,

    db: {
      poolMax: e.DB_POOL_MAX,
      idleTimeoutMs: e.DB_POOL_IDLE_TIMEOUT_MS,
      connectionTimeoutMs: e.DB_POOL_CONNECTION_TIMEOUT_MS,
    },

    jwt: {
      accessSecret: e.JWT_ACCESS_SECRET,
      refreshSecret: e.JWT_REFRESH_SECRET,
      accessExpiresIn: e.JWT_ACCESS_EXPIRES_IN,
      refreshExpiresIn: e.JWT_REFRESH_EXPIRES_IN,
    },

    smtp: {
      host: e.SMTP_HOST,
      port: e.SMTP_PORT,
      secure: e.SMTP_SECURE,
      user: e.SMTP_USER,
      pass: e.SMTP_PASS,
      from: e.SMTP_FROM,
      fromName: e.SMTP_FROM_NAME,
    },

    vapid: {
      publicKey: e.VAPID_PUBLIC_KEY,
      privateKey: e.VAPID_PRIVATE_KEY,
      subject: e.VAPID_SUBJECT,
    },

    backup: {
      dir: e.BACKUP_DIR,
      retentionDays: e.BACKUP_RETENTION_DAYS,
      cloudEnabled: e.BACKUP_CLOUD_ENABLED,
      // Absolute path to PostgreSQL bin dir on app server (must contain pg_dump + psql).
      // Required when DB is on a remote host and pg_dump is not on system PATH.
      // Example (Windows): C:\Program Files\PostgreSQL\18\bin
      pgBinPath: e.PG_BIN_PATH,
    },

    brandfetch: {
      apiKey: e.BRANDFETCH_API_KEY,
    },
  };
}

export const config = parseEnv(process.env);
