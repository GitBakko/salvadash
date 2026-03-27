import { z } from 'zod';

export const adminUpdateUserSchema = z.object({
  role: z.enum(['ADMIN', 'BASE']).optional(),
  isActive: z.boolean().optional(),
});

export type AdminUpdateUserInput = z.infer<typeof adminUpdateUserSchema>;
