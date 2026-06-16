import { describe, it, expect } from 'vitest';
import { parseEnv } from '../config/index.js';

// Minimal set of required vars; defaults cover everything else.
const base = {
  DATABASE_URL: 'postgresql://u:p@localhost:5432/db',
  JWT_ACCESS_SECRET: 'a',
  JWT_REFRESH_SECRET: 'r',
  SMTP_HOST: 'localhost',
  SMTP_USER: 'u@test',
  SMTP_PASS: 'p',
  SMTP_FROM: 'from@test',
} as NodeJS.ProcessEnv;

describe('parseEnv', () => {
  it('parses a valid env and applies defaults', () => {
    const c = parseEnv({ ...base });
    expect(c.port).toBe(3000);
    expect(c.nodeEnv).toBe('development');
    expect(c.smtp.port).toBe(587);
    expect(c.smtp.secure).toBe(false);
    expect(c.smtp.fromName).toBe('SalvaDash');
    expect(c.backup.retentionDays).toBe(10);
    expect(c.jwt.accessExpiresIn).toBe('15m');
    expect(c.logLevel).toBe('debug');
    expect(c.sentry.dsn).toBe('');
  });

  it('coerces numbers/booleans and derives prod log level', () => {
    const c = parseEnv({
      ...base,
      API_PORT: '8080',
      SMTP_SECURE: 'true',
      BACKUP_CLOUD_ENABLED: 'true',
      NODE_ENV: 'production',
    });
    expect(c.port).toBe(8080);
    expect(c.smtp.secure).toBe(true);
    expect(c.backup.cloudEnabled).toBe(true);
    expect(c.logLevel).toBe('info');
  });

  it('treats any SMTP_SECURE value other than "true" as false', () => {
    expect(parseEnv({ ...base, SMTP_SECURE: 'false' }).smtp.secure).toBe(false);
    expect(parseEnv({ ...base, SMTP_SECURE: '1' }).smtp.secure).toBe(false);
  });

  it('falls back to the default port when API_PORT is empty', () => {
    expect(parseEnv({ ...base, API_PORT: '' }).port).toBe(3000);
  });

  it('aggregates every missing required var into a single error', () => {
    let message = '';
    try {
      parseEnv({} as NodeJS.ProcessEnv);
    } catch (e) {
      message = (e as Error).message;
    }
    expect(message).toContain('Invalid environment configuration');
    for (const key of [
      'DATABASE_URL',
      'JWT_ACCESS_SECRET',
      'JWT_REFRESH_SECRET',
      'SMTP_HOST',
      'SMTP_FROM',
    ]) {
      expect(message).toContain(key);
    }
  });
});
