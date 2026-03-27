import { describe, it, expect } from 'vitest';
import {
  hashPassword,
  verifyPassword,
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  generateRandomToken,
  generateInviteCode,
  ACCESS_COOKIE_OPTIONS,
  REFRESH_COOKIE_OPTIONS,
} from '../lib/auth.js';

// ─── Password Security ─────────────────────────────────────

describe('Password Security', () => {
  it('uses bcrypt with cost factor ≥12 (hash is slow enough)', async () => {
    const start = Date.now();
    await hashPassword('test-password');
    const elapsed = Date.now() - start;
    // bcrypt with cost 12 should take at least ~200ms
    expect(elapsed).toBeGreaterThan(100);
  });

  it('produces different hashes for same password', async () => {
    const hash1 = await hashPassword('same-password');
    const hash2 = await hashPassword('same-password');
    expect(hash1).not.toBe(hash2);
  });

  it('rejects empty password verification', async () => {
    const hash = await hashPassword('real-password');
    const valid = await verifyPassword('', hash);
    expect(valid).toBe(false);
  });
});

// ─── JWT Edge Cases ─────────────────────────────────────────

describe('JWT Edge Cases', () => {
  it('access token has userId and role in payload', () => {
    const token = generateAccessToken({ userId: 'abc', role: 'ROOT' });
    const decoded = verifyAccessToken(token);
    expect(decoded.userId).toBe('abc');
    expect(decoded.role).toBe('ROOT');
  });

  it('refresh token cannot be verified as access token', () => {
    const token = generateRefreshToken({ userId: 'abc', role: 'BASE' });
    expect(() => verifyAccessToken(token)).toThrow();
  });

  it('access token cannot be verified as refresh token', () => {
    const token = generateAccessToken({ userId: 'abc', role: 'BASE' });
    expect(() => verifyRefreshToken(token)).toThrow();
  });

  it('throws on tampered token', () => {
    const token = generateAccessToken({ userId: 'abc', role: 'BASE' });
    expect(() => verifyAccessToken(token + 'x')).toThrow();
  });

  it('throws on empty string', () => {
    expect(() => verifyAccessToken('')).toThrow();
    expect(() => verifyRefreshToken('')).toThrow();
  });
});

// ─── Cookie Options Security ────────────────────────────────

describe('Cookie Options', () => {
  it('access cookie is httpOnly', () => {
    expect(ACCESS_COOKIE_OPTIONS.httpOnly).toBe(true);
  });

  it('refresh cookie is httpOnly', () => {
    expect(REFRESH_COOKIE_OPTIONS.httpOnly).toBe(true);
  });

  it('access cookie maxAge is 15 minutes', () => {
    expect(ACCESS_COOKIE_OPTIONS.maxAge).toBe(15 * 60 * 1000);
  });

  it('refresh cookie maxAge is 7 days', () => {
    expect(REFRESH_COOKIE_OPTIONS.maxAge).toBe(7 * 24 * 60 * 60 * 1000);
  });

  it('refresh cookie has restricted path /api/auth/refresh', () => {
    expect(REFRESH_COOKIE_OPTIONS.path).toBe('/api/auth/refresh');
  });

  it('access cookie path is /', () => {
    expect(ACCESS_COOKIE_OPTIONS.path).toBe('/');
  });

  it('cookies use sameSite lax in test env', () => {
    // NODE_ENV=test → not production → lax
    expect(ACCESS_COOKIE_OPTIONS.sameSite).toBe('lax');
    expect(REFRESH_COOKIE_OPTIONS.sameSite).toBe('lax');
  });

  it('cookies are not secure in test env', () => {
    expect(ACCESS_COOKIE_OPTIONS.secure).toBe(false);
    expect(REFRESH_COOKIE_OPTIONS.secure).toBe(false);
  });
});

// ─── Random Token Entropy ───────────────────────────────────

describe('Random Token Entropy', () => {
  it('generateRandomToken produces 64 hex chars (32 bytes)', () => {
    const token = generateRandomToken();
    expect(token).toHaveLength(64);
    expect(token).toMatch(/^[0-9a-f]+$/);
  });

  it('generateInviteCode produces 12 uppercase hex chars', () => {
    const code = generateInviteCode();
    expect(code).toHaveLength(12);
    expect(code).toMatch(/^[0-9A-F]+$/);
  });

  it('tokens are unique (collision test, 100 tokens)', () => {
    const tokens = new Set(Array.from({ length: 100 }, () => generateRandomToken()));
    expect(tokens.size).toBe(100);
  });

  it('invite codes are unique (collision test, 50 codes)', () => {
    const codes = new Set(Array.from({ length: 50 }, () => generateInviteCode()));
    expect(codes.size).toBe(50);
  });
});
