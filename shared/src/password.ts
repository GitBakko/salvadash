// ─── Password policy (single source of truth) ──────────────
// Used by both the backend zod schemas (server-authoritative validation) and the
// frontend forms (mapped to i18n messages). IMPORTANT: this policy applies ONLY
// when a password is SET (register / reset / change). It must never be applied to
// login — existing users' passwords stay valid and are never re-validated for
// strength. See loginSchema, which only checks presence.

export const PASSWORD_MIN_LENGTH = 12;
export const PASSWORD_MAX_LENGTH = 128;

export type PasswordIssue = 'too_short' | 'too_long' | 'needs_letter_and_number' | 'too_common';

// A small blocklist of obvious choices. The min-length rule already rejects most
// classic weak passwords; this catches the long-but-predictable ones.
const COMMON_PASSWORDS = new Set<string>([
  'password',
  'password1',
  'password12',
  'password123',
  'password1234',
  'passw0rd123',
  '123456789012',
  '1234567890123',
  'qwertyuiop12',
  'qwerty123456',
  'iloveyou1234',
  'letmein12345',
  'welcome12345',
  'administrator',
  'changeme1234',
]);

/** Returns the first policy violation for a candidate password, or null if it passes. */
export function getPasswordIssue(password: string): PasswordIssue | null {
  if (password.length < PASSWORD_MIN_LENGTH) return 'too_short';
  if (password.length > PASSWORD_MAX_LENGTH) return 'too_long';
  const hasLetter = /[a-zA-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  if (!hasLetter || !hasNumber) return 'needs_letter_and_number';
  if (COMMON_PASSWORDS.has(password.toLowerCase())) return 'too_common';
  return null;
}

/** Italian messages for server-side (zod) responses. The frontend maps codes to i18n instead. */
export const PASSWORD_ISSUE_MESSAGE_IT: Record<PasswordIssue, string> = {
  too_short: `La password deve avere almeno ${PASSWORD_MIN_LENGTH} caratteri`,
  too_long: `La password non può superare ${PASSWORD_MAX_LENGTH} caratteri`,
  needs_letter_and_number: 'La password deve contenere almeno una lettera e un numero',
  too_common: 'Questa password è troppo comune: scegline una meno prevedibile',
};
