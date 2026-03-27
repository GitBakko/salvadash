import { Router, type Router as RouterType, type Request, type Response } from 'express';
import { createIncomeSourceSchema, updateIncomeSourceSchema, reorderIncomeSourcesSchema } from '@salvadash/shared';
import prisma from '../lib/prisma.js';
import { authenticate } from '../middleware/auth.js';

const router: RouterType = Router();

router.use(authenticate);

// ─── GET /income-sources ───────────────────────────────────

router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const sources = await prisma.incomeSource.findMany({
      where: { userId: req.user!.userId },
      orderBy: { sortOrder: 'asc' },
    });

    res.json({
      success: true,
      data: sources.map((s) => ({
        id: s.id,
        name: s.name,
        isActive: s.isActive,
        sortOrder: s.sortOrder,
      })),
    });
  } catch (error) {
    console.error('GET /income-sources error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// ─── POST /income-sources ──────────────────────────────────

router.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const parsed = createIncomeSourceSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ success: false, error: 'Validation failed', details: parsed.error.flatten() });
      return;
    }

    const userId = req.user!.userId;

    const maxSort = await prisma.incomeSource.aggregate({
      where: { userId },
      _max: { sortOrder: true },
    });

    const source = await prisma.incomeSource.create({
      data: {
        ...parsed.data,
        userId,
        sortOrder: (maxSort._max.sortOrder ?? -1) + 1,
      },
    });

    res.status(201).json({
      success: true,
      data: {
        id: source.id,
        name: source.name,
        isActive: source.isActive,
        sortOrder: source.sortOrder,
      },
    });
  } catch (error: any) {
    if (error?.code === 'P2002') {
      res.status(409).json({ success: false, error: 'An income source with this name already exists' });
      return;
    }
    console.error('POST /income-sources error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// ─── PUT /income-sources/:id ────────────────────────────────

router.put('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const parsed = updateIncomeSourceSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ success: false, error: 'Validation failed', details: parsed.error.flatten() });
      return;
    }

    const userId = req.user!.userId;
    const id = req.params.id as string;

    const existing = await prisma.incomeSource.findFirst({
      where: { id, userId },
    });

    if (!existing) {
      res.status(404).json({ success: false, error: 'Income source not found' });
      return;
    }

    const source = await prisma.incomeSource.update({
      where: { id },
      data: parsed.data,
    });

    res.json({
      success: true,
      data: {
        id: source.id,
        name: source.name,
        isActive: source.isActive,
        sortOrder: source.sortOrder,
      },
    });
  } catch (error: any) {
    if (error?.code === 'P2002') {
      res.status(409).json({ success: false, error: 'An income source with this name already exists' });
      return;
    }
    console.error('PUT /income-sources/:id error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// ─── DELETE /income-sources/:id ─────────────────────────────

router.delete('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const id = req.params.id as string;

    const existing = await prisma.incomeSource.findFirst({
      where: { id, userId },
      include: { _count: { select: { incomes: true } } },
    });

    if (!existing) {
      res.status(404).json({ success: false, error: 'Income source not found' });
      return;
    }

    if (existing._count.incomes > 0) {
      await prisma.incomeSource.update({
        where: { id },
        data: { isActive: false },
      });
      res.json({ success: true, message: 'Income source deactivated (has existing entries)' });
      return;
    }

    await prisma.incomeSource.delete({ where: { id } });
    res.json({ success: true, message: 'Income source deleted' });
  } catch (error) {
    console.error('DELETE /income-sources/:id error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// ─── PUT /income-sources/reorder ────────────────────────────

router.put('/reorder', async (req: Request, res: Response): Promise<void> => {
  try {
    const parsed = reorderIncomeSourcesSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ success: false, error: 'Validation failed', details: parsed.error.flatten() });
      return;
    }

    const userId = req.user!.userId;

    await prisma.$transaction(
      parsed.data.sources.map((item) =>
        prisma.incomeSource.updateMany({
          where: { id: item.id, userId },
          data: { sortOrder: item.sortOrder },
        }),
      ),
    );

    res.json({ success: true, message: 'Income sources reordered' });
  } catch (error) {
    console.error('PUT /income-sources/reorder error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

export default router;
