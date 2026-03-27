import { z } from 'zod';

export const createInviteCodeSchema = z.object({
  code: z.string().min(6).max(20).optional(), // auto-generate if not provided
});

export type CreateInviteCodeInput = z.infer<typeof createInviteCodeSchema>;
