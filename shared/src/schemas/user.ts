import { z } from 'zod';

export const Role = {
  ROOT: 'ROOT',
  ADMIN: 'ADMIN',
  BASE: 'BASE',
} as const;

export type Role = (typeof Role)[keyof typeof Role];

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
});

export const registerSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  password: z.string().min(8).max(128),
  confirmPassword: z.string(),
  inviteCode: z.string().min(1),
  language: z.enum(['it', 'en']).default('it'),
  currency: z.enum(['EUR', 'GBP', 'USD']).default('EUR'),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Le password non corrispondono',
  path: ['confirmPassword'],
});

export const updateProfileSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  language: z.enum(['it', 'en']).optional(),
  currency: z.enum(['EUR', 'GBP', 'USD']).optional(),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'La password attuale è obbligatoria'),
  newPassword: z.string().min(8, 'La nuova password deve avere almeno 8 caratteri').max(128, 'La password è troppo lunga'),
  confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
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

export const resetPasswordSchema = z.object({
  token: z.string(),
  password: z.string().min(8).max(128),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
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
