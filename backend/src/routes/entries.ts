import { Router, type Router as RouterType, type Request, type Response } from 'express';
import { createEntrySchema, updateEntrySchema } from '@salvadash/shared';
import prisma from '../lib/prisma.js';
import { authenticate } from '../middleware/auth.js';
import { Prisma } from '@prisma/client';

const router: RouterType = Router();

router.use(authenticate);

// ─── Helpers ────────────────────────────────────────────────

function formatEntry(entry: any) {
  const balances = (entry.balances ?? []).map((b: any) => ({
    id: b.id,
    accountId: b.accountId,
    accountName: b.account?.name ?? '',
    amount: Number(b.amount),
  }));
  const incomes = (entry.incomes ?? []).map((i: any) => ({
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
    total: balances.reduce((sum: number, b: any) => sum + b.amount, 0),
    totalIncome: incomes.reduce((sum: number, i: any) => sum + i.amount, 0),
    createdAt: entry.createdAt.toISOString(),
    updatedAt: entry.updatedAt.toISOString(),
  };
}

const entryInclude = {
  balances: { include: { account: { select: { name: true } } } },
  incomes: { include: { incomeSource: { select: { name: true } } } },
};

// ─── GET /entries ───────────────────────────────────────────

router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const { year, page = '1', limit = '50' } = req.query;

    const where: Prisma.MonthlyEntryWhereInput = { userId };

    if (year) {
      const y = parseInt(year as string, 10);
      where.date = {
        gte: new Date(`${y}-01-01`),
        lte: new Date(`${y}-12-31`),
      };
    }

    const pageNum = Math.max(1, parseInt(page as string, 10));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string, 10)));

    const [entries, total] = await Promise.all([
      prisma.monthlyEntry.findMany({
        where,
        include: entryInclude,
        orderBy: { date: 'desc' },
        skip: (pageNum - 1) * limitNum,
        take: limitNum,
      }),
      prisma.monthlyEntry.count({ where }),
    ]);

    // Compute deltas between consecutive entries
    const formatted = entries.map(formatEntry);
    const withDeltas = formatted.map((entry, i) => {
      const prev = formatted[i + 1]; // previous chronologically (sorted desc)
      const delta = prev ? entry.total - prev.total : null;
      const deltaPercent =
        prev && prev.total !== 0
          ? Math.round(((entry.total - prev.total) / prev.total) * 10000) / 100
          : null;
      return { ...entry, delta, deltaPercent };
    });

    res.json({
      success: true,
      data: withDeltas,
      total,
      page: pageNum,
      limit: limitNum,
    });
  } catch (error) {
    console.error('GET /entries error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// ─── GET /entries/:id ───────────────────────────────────────

router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const id = req.params.id as string;

    const entry = await prisma.monthlyEntry.findFirst({
      where: { id, userId },
      include: entryInclude,
    });

    if (!entry) {
      res.status(404).json({ success: false, error: 'Entry not found' });
      return;
    }

    res.json({ success: true, data: formatEntry(entry) });
  } catch (error) {
    console.error('GET /entries/:id error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// ─── POST /entries ──────────────────────────────────────────

router.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const parsed = createEntrySchema.safeParse(req.body);
    if (!parsed.success) {
      res
        .status(400)
        .json({ success: false, error: 'Validation failed', details: parsed.error.flatten() });
      return;
    }

    const userId = req.user!.userId;
    const { date, balances, incomes, notes } = parsed.data;

    // Verify user has at least 1 account
    const accountCount = await prisma.account.count({ where: { userId, isActive: true } });
    if (accountCount === 0) {
      res
        .status(400)
        .json({ success: false, error: 'You need at least one active account to create entries' });
      return;
    }

    // Verify all accountIds belong to the user
    const userAccountIds = (
      await prisma.account.findMany({ where: { userId }, select: { id: true } })
    ).map((a) => a.id);
    const invalidAccounts = balances.filter((b) => !userAccountIds.includes(b.accountId));
    if (invalidAccounts.length > 0) {
      res.status(400).json({ success: false, error: 'One or more account IDs are invalid' });
      return;
    }

    // Verify all incomeSourceIds belong to the user
    if (incomes.length > 0) {
      const userSourceIds = (
        await prisma.incomeSource.findMany({ where: { userId }, select: { id: true } })
      ).map((s) => s.id);
      const invalidSources = incomes.filter((i) => !userSourceIds.includes(i.incomeSourceId));
      if (invalidSources.length > 0) {
        res
          .status(400)
          .json({ success: false, error: 'One or more income source IDs are invalid' });
        return;
      }
    }

    const entry = await prisma.monthlyEntry.create({
      data: {
        userId,
        date: new Date(date),
        notes,
        balances: {
          create: balances.map((b) => ({
            accountId: b.accountId,
            amount: new Prisma.Decimal(b.amount),
          })),
        },
        incomes: {
          create: incomes.map((i) => ({
            incomeSourceId: i.incomeSourceId,
            amount: new Prisma.Decimal(i.amount),
          })),
        },
      },
      include: entryInclude,
    });

    res.status(201).json({ success: true, data: formatEntry(entry) });
  } catch (error) {
    console.error('POST /entries error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// ─── PUT /entries/:id ───────────────────────────────────────

router.put('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const parsed = updateEntrySchema.safeParse(req.body);
    if (!parsed.success) {
      res
        .status(400)
        .json({ success: false, error: 'Validation failed', details: parsed.error.flatten() });
      return;
    }

    const userId = req.user!.userId;
    const id = req.params.id as string;

    const existing = await prisma.monthlyEntry.findFirst({ where: { id, userId } });
    if (!existing) {
      res.status(404).json({ success: false, error: 'Entry not found' });
      return;
    }

    const { date, balances, incomes, notes } = parsed.data;

    // Validate accountIds if balances provided
    if (balances) {
      const userAccountIds = (
        await prisma.account.findMany({ where: { userId }, select: { id: true } })
      ).map((a) => a.id);
      const invalid = balances.filter((b) => !userAccountIds.includes(b.accountId));
      if (invalid.length > 0) {
        res.status(400).json({ success: false, error: 'One or more account IDs are invalid' });
        return;
      }
    }

    // Validate incomeSourceIds if incomes provided
    if (incomes) {
      const userSourceIds = (
        await prisma.incomeSource.findMany({ where: { userId }, select: { id: true } })
      ).map((s) => s.id);
      const invalid = incomes.filter((i) => !userSourceIds.includes(i.incomeSourceId));
      if (invalid.length > 0) {
        res
          .status(400)
          .json({ success: false, error: 'One or more income source IDs are invalid' });
        return;
      }
    }

    const entry = await prisma.$transaction(async (tx) => {
      // Update base fields
      const updateData: Prisma.MonthlyEntryUpdateInput = {};
      if (date !== undefined) updateData.date = new Date(date);
      if (notes !== undefined) updateData.notes = notes;

      await tx.monthlyEntry.update({ where: { id }, data: updateData });

      // Replace balances if provided
      if (balances) {
        await tx.entryBalance.deleteMany({ where: { entryId: id } });
        await tx.entryBalance.createMany({
          data: balances.map((b) => ({
            entryId: id,
            accountId: b.accountId,
            amount: new Prisma.Decimal(b.amount),
          })),
        });
      }

      // Replace incomes if provided
      if (incomes) {
        await tx.entryIncome.deleteMany({ where: { entryId: id } });
        await tx.entryIncome.createMany({
          data: incomes.map((i) => ({
            entryId: id,
            incomeSourceId: i.incomeSourceId,
            amount: new Prisma.Decimal(i.amount),
          })),
        });
      }

      return tx.monthlyEntry.findUniqueOrThrow({
        where: { id },
        include: entryInclude,
      });
    });

    res.json({ success: true, data: formatEntry(entry) });
  } catch (error) {
    console.error('PUT /entries/:id error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// ─── DELETE /entries/:id ────────────────────────────────────

router.delete('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const id = req.params.id as string;

    const existing = await prisma.monthlyEntry.findFirst({ where: { id, userId } });
    if (!existing) {
      res.status(404).json({ success: false, error: 'Entry not found' });
      return;
    }

    await prisma.monthlyEntry.delete({ where: { id } });
    res.json({ success: true, message: 'Entry deleted' });
  } catch (error) {
    console.error('DELETE /entries/:id error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

export default router;
