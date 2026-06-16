import { describe, it, expect } from 'vitest';
import {
  getPasswordIssue,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
  changePasswordSchema,
} from '@salvadash/shared';

describe('password policy', () => {
  describe('getPasswordIssue', () => {
    it('accepts a strong password', () => {
      expect(getPasswordIssue('Str0ngPass2026')).toBeNull();
    });

    it('rejects too short (< 12)', () => {
      expect(getPasswordIssue('Ab1cdef')).toBe('too_short');
    });

    it('rejects missing letter or number', () => {
      expect(getPasswordIssue('aaaaaaaaaaaaaa')).toBe('needs_letter_and_number'); // letters, no digit
      expect(getPasswordIssue('123456789012')).toBe('needs_letter_and_number'); // digits, no letter
    });

    it('rejects common passwords even when long enough', () => {
      expect(getPasswordIssue('password1234')).toBe('too_common');
      expect(getPasswordIssue('Password1234'.toLowerCase())).toBe('too_common');
    });

    it('rejects too long (> 128)', () => {
      expect(getPasswordIssue('A1' + 'x'.repeat(200))).toBe('too_long');
    });
  });

  describe('schemas enforce the policy only where a password is SET', () => {
    it('login accepts any non-empty password (existing users never re-validated)', () => {
      expect(loginSchema.safeParse({ email: 'a@b.com', password: 'old' }).success).toBe(true);
      expect(loginSchema.safeParse({ email: 'a@b.com', password: '12345678' }).success).toBe(true);
      expect(loginSchema.safeParse({ email: 'a@b.com', password: '' }).success).toBe(false);
    });

    it('register rejects a weak new password', () => {
      const base = { name: 'Mario Rossi', email: 'm@test.com', inviteCode: 'ABC123' };
      const weak = registerSchema.safeParse({
        ...base,
        password: 'password',
        confirmPassword: 'password',
      });
      expect(weak.success).toBe(false);
      const strong = registerSchema.safeParse({
        ...base,
        password: 'Str0ngPass2026',
        confirmPassword: 'Str0ngPass2026',
      });
      expect(strong.success).toBe(true);
    });

    it('reset and change enforce the policy on the new password', () => {
      expect(
        resetPasswordSchema.safeParse({
          token: 't',
          password: 'short1',
          confirmPassword: 'short1',
        }).success,
      ).toBe(false);
      expect(
        changePasswordSchema.safeParse({
          currentPassword: 'whatever',
          newPassword: 'short1',
          confirmPassword: 'short1',
        }).success,
      ).toBe(false);
      expect(
        changePasswordSchema.safeParse({
          currentPassword: 'whatever',
          newPassword: 'Str0ngPass2026',
          confirmPassword: 'Str0ngPass2026',
        }).success,
      ).toBe(true);
    });
  });
});
