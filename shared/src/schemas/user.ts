import { z } from 'zod';
import { getPasswordIssue, PASSWORD_ISSUE_MESSAGE_IT, PASSWORD_MAX_LENGTH } from '../password.js';

export const Role = {
  ROOT: 'ROOT',
  ADMIN: 'ADMIN',
  BASE: 'BASE',
} as const;

export type Role = (typeof Role)[keyof typeof Role];

// Complexity policy — applied ONLY where a NEW password is set (register/reset/change).
const strongPassword = z.string().superRefine((val, ctx) => {
  const issue = getPasswordIssue(val);
  if (issue) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: PASSWORD_ISSUE_MESSAGE_IT[issue] });
  }
});

// Login must NOT enforce strength: existing users keep their (possibly old, weak)
// passwords. Only require a non-empty value; the hash check is the real gate.
export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1).max(PASSWORD_MAX_LENGTH),
});

export const registerSchema = z
  .object({
    name: z.string().min(2).max(100),
    email: z.string().email(),
    password: strongPassword,
    confirmPassword: z.string(),
    inviteCode: z.string().min(1),
    language: z.enum(['it', 'en']).default('it'),
    currency: z.enum(['EUR', 'GBP', 'USD']).default('EUR'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Le password non corrispondono',
    path: ['confirmPassword'],
  });

export const updateProfileSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  language: z.enum(['it', 'en']).optional(),
  currency: z.enum(['EUR', 'GBP', 'USD']).optional(),
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'La password attuale è obbligatoria'),
    newPassword: strongPassword,
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Le password non corrispondono',
    path: ['confirmPassword'],
  });

export const changeEmailSchema = z.object({
  newEmail: z.string().email('Indirizzo email non valido'),
  password: z.string().min(1, 'La password è obbligatoria'),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

export const resetPasswordSchema = z
  .object({
    token: z.string(),
    password: strongPassword,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Le password non corrispondono',
    path: ['confirmPassword'],
  });

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type ChangeEmailInput = z.infer<typeof changeEmailSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
