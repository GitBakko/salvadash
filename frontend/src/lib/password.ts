import { getPasswordIssue, type PasswordIssue } from '@salvadash/shared';

const ISSUE_KEY: Record<PasswordIssue, string> = {
  too_short: 'auth.password.tooShort',
  too_long: 'auth.password.tooLong',
  needs_letter_and_number: 'auth.password.needsLetterNumber',
  too_common: 'auth.password.tooCommon',
};

/** Returns the i18n key for the first password-policy violation, or null if valid. */
export function passwordErrorKey(password: string): string | null {
  const issue = getPasswordIssue(password);
  return issue ? ISSUE_KEY[issue] : null;
}
