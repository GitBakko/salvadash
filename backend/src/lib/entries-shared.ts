import type { Response } from 'express';
import prisma from './prisma.js';
import type { Prisma } from '../generated/prisma/client.js';

export const entryInclude = {
  balances: { include: { account: { select: { name: true, color: true } } } },
  incomes: { include: { incomeSource: { select: { name: true } } } },
} as const satisfies Prisma.MonthlyEntryInclude;

export type EntryWithRelations = Prisma.MonthlyEntryGetPayload<{ include: typeof entryInclude }>;

export interface FormattedEntry {
  id: string;
  date: string;
  notes: string | null;
  balances: { id: string; accountId: string; accountName: string; amount: number }[];
  incomes: { id: string; incomeSourceId: string; incomeSourceName: string; amount: number }[];
  total: number;
  totalIncome: number;
  createdAt: string;
  updatedAt: string;
}

export function formatEntry(entry: EntryWithRelations): FormattedEntry {
  const balances = entry.balances.map((b) => ({
    id: b.id,
    accountId: b.accountId,
    accountName: b.account?.name ?? '',
    amount: Number(b.amount),
  }));
  const incomes = entry.incomes.map((i) => ({
    id: i.id,
    incomeSourceId: i.incomeSourceId,
    incomeSourceName: i.incomeSource?.name ?? '',
    amount: Number(i.amount),
  }));
  return {
    id: entry.id,
    date: entry.date.toISOString().split('T')[0],
    notes: entry.notes,
    balances,
    incomes,
    total: balances.reduce((sum, b) => sum + b.amount, 0),
    totalIncome: incomes.reduce((sum, i) => sum + i.amount, 0),
    createdAt: entry.createdAt.toISOString(),
    updatedAt: entry.updatedAt.toISOString(),
  };
}

interface OwnershipCheck {
  accountIds?: string[];
  incomeSourceIds?: string[];
}

export async function validateUserOwnership(
  res: Response,
  userId: string,
  { accountIds, incomeSourceIds }: OwnershipCheck,
): Promise<boolean> {
  if (accountIds && accountIds.length > 0) {
    const owned = await prisma.account.findMany({
      where: { userId, id: { in: accountIds } },
      select: { id: true },
    });
    if (owned.length !== new Set(accountIds).size) {
      res.status(400).json({ success: false, error: 'One or more account IDs are invalid' });
      return false;
    }
  }
  if (incomeSourceIds && incomeSourceIds.length > 0) {
    const owned = await prisma.incomeSource.findMany({
      where: { userId, id: { in: incomeSourceIds } },
      select: { id: true },
    });
    if (owned.length !== new Set(incomeSourceIds).size) {
      res.status(400).json({ success: false, error: 'One or more income source IDs are invalid' });
      return false;
    }
  }
  return true;
}
