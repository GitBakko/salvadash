import { z } from 'zod';

export const AccountType = {
  MAIN: 'MAIN',
  SUB: 'SUB',
} as const;

export type AccountType = (typeof AccountType)[keyof typeof AccountType];

export const createAccountSchema = z.object({
  name: z.string().min(1).max(100),
  type: z.enum(['MAIN', 'SUB']).default('MAIN'),
  icon: z.string().max(50).optional(),
  iconUrl: z.string().max(500).optional(),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .optional(),
});

export const updateAccountSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  type: z.enum(['MAIN', 'SUB']).optional(),
  icon: z.string().max(50).optional(),
  iconUrl: z.string().max(500).nullable().optional(),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .optional(),
  isActive: z.boolean().optional(),
  sortOrder: z.number().int().min(0).optional(),
});

export const importLogoSchema = z.object({
  accountId: z.string().min(1),
  iconUrl: z.string().url().max(2000),
});

export const reorderAccountsSchema = z.object({
  accounts: z.array(
    z.object({
      id: z.string(),
      sortOrder: z.number().int().min(0),
    }),
  ),
});

export type CreateAccountInput = z.infer<typeof createAccountSchema>;
export type UpdateAccountInput = z.infer<typeof updateAccountSchema>;
export type ReorderAccountsInput = z.infer<typeof reorderAccountsSchema>;
export type ImportLogoInput = z.infer<typeof importLogoSchema>;
