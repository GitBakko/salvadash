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
} from '../lib/auth.js';

describe('Auth Utilities', () => {
  describe('Password hashing', () => {
    it('hashes and verifies a password correctly', async () => {
      const password = 'test-password-123';
      const hash = await hashPassword(password);

      expect(hash).not.toBe(password);
      expect(hash.length).toBeGreaterThan(50);

      const valid = await verifyPassword(password, hash);
      expect(valid).toBe(true);
    });

    it('rejects wrong password', async () => {
      const hash = await hashPassword('correct-password');
      const valid = await verifyPassword('wrong-password', hash);
      expect(valid).toBe(false);
    });
  });

  describe('JWT tokens', () => {
    const payload = { userId: 'test-user-id', role: 'BASE' };

    it('generates and verifies access token', () => {
      const token = generateAccessToken(payload);
      expect(token).toBeTruthy();

      const decoded = verifyAccessToken(token);
      expect(decoded.userId).toBe(payload.userId);
      expect(decoded.role).toBe(payload.role);
    });

    it('generates and verifies refresh token', () => {
      const token = generateRefreshToken(payload);
      expect(token).toBeTruthy();

      const decoded = verifyRefreshToken(token);
      expect(decoded.userId).toBe(payload.userId);
      expect(decoded.role).toBe(payload.role);
    });

    it('access token fails with wrong secret (cross-verify)', () => {
      const token = generateRefreshToken(payload);
      expect(() => verifyAccessToken(token)).toThrow();
    });
  });

  describe('Random token generation', () => {
    it('generates unique tokens', () => {
      const t1 = generateRandomToken();
      const t2 = generateRandomToken();

      expect(t1).toHaveLength(64); // 32 bytes hex
      expect(t1).not.toBe(t2);
    });
  });

  describe('Invite code generation', () => {
    it('generates uppercase hex code', () => {
      const code = generateInviteCode();

      expect(code).toHaveLength(12); // 6 bytes hex
      expect(code).toMatch(/^[0-9A-F]+$/);
    });
  });
});
