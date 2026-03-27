import { z } from 'zod';

const balanceItemSchema = z.object({
  accountId: z.string(),
  amount: z.number().min(0),
});

const incomeItemSchema = z.object({
  incomeSourceId: z.string(),
  amount: z.number().min(0),
});

export const createEntrySchema = z.object({
  date: z.string().refine((val) => {
    const date = new Date(val);
    if (isNaN(date.getTime())) return false;
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    return date <= today;
  }, { message: 'La data non può essere nel futuro' }),
  balances: z.array(balanceItemSchema).min(1, 'Inserisci almeno un saldo'),
  incomes: z.array(incomeItemSchema).default([]),
  notes: z.string().max(1000).optional(),
});

export const updateEntrySchema = z.object({
  date: z.string().refine((val) => {
    const date = new Date(val);
    if (isNaN(date.getTime())) return false;
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    return date <= today;
  }, { message: 'La data non può essere nel futuro' }).optional(),
  balances: z.array(balanceItemSchema).min(1).optional(),
  incomes: z.array(incomeItemSchema).optional(),
  notes: z.string().max(1000).optional(),
});

export type CreateEntryInput = z.infer<typeof createEntrySchema>;
export type UpdateEntryInput = z.infer<typeof updateEntrySchema>;
