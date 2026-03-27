import { z } from 'zod';

export const createIncomeSourceSchema = z.object({
  name: z.string().min(1).max(100),
});

export const updateIncomeSourceSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  isActive: z.boolean().optional(),
  sortOrder: z.number().int().min(0).optional(),
});

export const reorderIncomeSourcesSchema = z.object({
  sources: z.array(z.object({
    id: z.string(),
    sortOrder: z.number().int().min(0),
  })),
});

export type CreateIncomeSourceInput = z.infer<typeof createIncomeSourceSchema>;
export type UpdateIncomeSourceInput = z.infer<typeof updateIncomeSourceSchema>;
export type ReorderIncomeSourcesInput = z.infer<typeof reorderIncomeSourcesSchema>;
