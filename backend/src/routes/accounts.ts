import { Router, type Router as RouterType, type Request, type Response } from 'express';
import { createAccountSchema, updateAccountSchema, reorderAccountsSchema } from '@salvadash/shared';
import prisma from '../lib/prisma.js';
import { authenticate } from '../middleware/auth.js';

const router: RouterType = Router();

router.use(authenticate);

// ─── GET /accounts ─────────────────────────────────────────

router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const accounts = await prisma.account.findMany({
      where: { userId: req.user!.userId },
      orderBy: { sortOrder: 'asc' },
    });

    res.json({
      success: true,
      data: accounts.map((a) => ({
        id: a.id,
        name: a.name,
        type: a.type,
        icon: a.icon,
        color: a.color,
        isActive: a.isActive,
        sortOrder: a.sortOrder,
      })),
    });
  } catch (error) {
    console.error('GET /accounts error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// ─── POST /accounts ────────────────────────────────────────

router.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const parsed = createAccountSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ success: false, error: 'Validation failed', details: parsed.error.flatten() });
      return;
    }

    const userId = req.user!.userId;

    // Get next sortOrder
    const maxSort = await prisma.account.aggregate({
      where: { userId },
      _max: { sortOrder: true },
    });

    const account = await prisma.account.create({
      data: {
        ...parsed.data,
        userId,
        sortOrder: (maxSort._max.sortOrder ?? -1) + 1,
      },
    });

    res.status(201).json({
      success: true,
      data: {
        id: account.id,
        name: account.name,
        type: account.type,
        icon: account.icon,
        color: account.color,
        isActive: account.isActive,
        sortOrder: account.sortOrder,
      },
    });
  } catch (error: any) {
    if (error?.code === 'P2002') {
      res.status(409).json({ success: false, error: 'An account with this name already exists' });
      return;
    }
    console.error('POST /accounts error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// ─── PUT /accounts/:id ─────────────────────────────────────

router.put('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const parsed = updateAccountSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ success: false, error: 'Validation failed', details: parsed.error.flatten() });
      return;
    }

    const userId = req.user!.userId;
    const id = req.params.id as string;

    const existing = await prisma.account.findFirst({
      where: { id, userId },
    });

    if (!existing) {
      res.status(404).json({ success: false, error: 'Account not found' });
      return;
    }

    const account = await prisma.account.update({
      where: { id },
      data: parsed.data,
    });

    res.json({
      success: true,
      data: {
        id: account.id,
        name: account.name,
        type: account.type,
        icon: account.icon,
        color: account.color,
        isActive: account.isActive,
        sortOrder: account.sortOrder,
      },
    });
  } catch (error: any) {
    if (error?.code === 'P2002') {
      res.status(409).json({ success: false, error: 'An account with this name already exists' });
      return;
    }
    console.error('PUT /accounts/:id error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// ─── DELETE /accounts/:id ───────────────────────────────────

router.delete('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const id = req.params.id as string;

    const existing = await prisma.account.findFirst({
      where: { id, userId },
      include: { _count: { select: { balances: true } } },
    });

    if (!existing) {
      res.status(404).json({ success: false, error: 'Account not found' });
      return;
    }

    // If account has balances, soft-delete (deactivate) instead
    if (existing._count.balances > 0) {
      await prisma.account.update({
        where: { id },
        data: { isActive: false },
      });
      res.json({ success: true, message: 'Account deactivated (has existing entries)' });
      return;
    }

    await prisma.account.delete({ where: { id } });
    res.json({ success: true, message: 'Account deleted' });
  } catch (error) {
    console.error('DELETE /accounts/:id error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// ─── PUT /accounts/reorder ──────────────────────────────────

router.put('/reorder', async (req: Request, res: Response): Promise<void> => {
  try {
    const parsed = reorderAccountsSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ success: false, error: 'Validation failed', details: parsed.error.flatten() });
      return;
    }

    const userId = req.user!.userId;

    await prisma.$transaction(
      parsed.data.accounts.map((item) =>
        prisma.account.updateMany({
          where: { id: item.id, userId },
          data: { sortOrder: item.sortOrder },
        }),
      ),
    );

    res.json({ success: true, message: 'Accounts reordered' });
  } catch (error) {
    console.error('PUT /accounts/reorder error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

export default router;
