import { describe, it, expect } from 'vitest';
import { config } from '../config/index.js';

describe('Config', () => {
  it('loads JWT secrets from env', () => {
    expect(config.jwt.accessSecret).toBe('test-access-secret-key-for-vitest');
    expect(config.jwt.refreshSecret).toBe('test-refresh-secret-key-for-vitest');
  });

  it('has correct JWT defaults', () => {
    expect(config.jwt.accessExpiresIn).toBe('15m');
    expect(config.jwt.refreshExpiresIn).toBe('7d');
  });

  it('has correct SMTP config', () => {
    expect(config.smtp.host).toBe('localhost');
    expect(config.smtp.port).toBe(1025);
    expect(config.smtp.user).toBe('test@test.com');
    expect(config.smtp.from).toBe('test@test.com');
  });

  it('has test nodeEnv', () => {
    expect(config.nodeEnv).toBe('test');
  });

  it('has default port', () => {
    expect(config.port).toBe(3000);
  });

  it('has backup defaults', () => {
    expect(config.backup.retentionDays).toBe(10);
    expect(config.backup.cloudEnabled).toBe(false);
    expect(config.backup.dir).toBe('./backups');
  });

  it('has default app/api URLs', () => {
    expect(config.appUrl).toBe('http://localhost:5173');
    expect(config.apiUrl).toBe('http://localhost:3000');
  });

  it('smtp fromName defaults to SalvaDash', () => {
    expect(config.smtp.fromName).toBe('SalvaDash');
  });

  it('smtp secure defaults to false', () => {
    expect(config.smtp.secure).toBe(false);
  });
});
