import { Router, type Router as RouterType, type Request, type Response } from 'express';
import {
  createIncomeSourceSchema,
  updateIncomeSourceSchema,
  reorderIncomeSourcesSchema,
} from '@salvadash/shared';
import prisma from '../lib/prisma.js';
import { authenticate } from '../middleware/auth.js';
import { asyncHandler, HttpError, isValidationOk } from '../lib/http.js';

const router: RouterType = Router();

router.use(authenticate);

// ─── GET /income-sources ───────────────────────────────────

router.get(
  '/',
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
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
  }),
);

// ─── POST /income-sources ──────────────────────────────────

router.post(
  '/',
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const parsed = createIncomeSourceSchema.safeParse(req.body);
    if (!isValidationOk(res, parsed)) return;

    const userId = req.user!.userId;

    const maxSort = await prisma.incomeSource.aggregate({
      where: { userId },
      _max: { sortOrder: true },
    });

    try {
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
    } catch (err) {
      if ((err as { code?: string })?.code === 'P2002') {
        throw new HttpError(409, 'An income source with this name already exists');
      }
      throw err;
    }
  }),
);

// ─── PUT /income-sources/:id ────────────────────────────────

router.put(
  '/:id',
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const parsed = updateIncomeSourceSchema.safeParse(req.body);
    if (!isValidationOk(res, parsed)) return;

    const userId = req.user!.userId;
    const id = req.params.id as string;

    const existing = await prisma.incomeSource.findFirst({
      where: { id, userId },
    });

    if (!existing) {
      res.status(404).json({ success: false, error: 'Income source not found' });
      return;
    }

    try {
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
    } catch (err) {
      if ((err as { code?: string })?.code === 'P2002') {
        throw new HttpError(409, 'An income source with this name already exists');
      }
      throw err;
    }
  }),
);

// ─── DELETE /income-sources/:id ─────────────────────────────

router.delete(
  '/:id',
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
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
  }),
);

// ─── PUT /income-sources/reorder ────────────────────────────

router.put(
  '/reorder',
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const parsed = reorderIncomeSourcesSchema.safeParse(req.body);
    if (!isValidationOk(res, parsed)) return;

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
  }),
);

export default router;
