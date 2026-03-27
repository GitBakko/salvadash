import { Router, type Router as RouterType, type Request, type Response } from 'express';
import { adminUpdateUserSchema } from '@salvadash/shared';
import prisma from '../lib/prisma.js';
import { authenticate, requireRole } from '../middleware/auth.js';

const router: RouterType = Router();

// All admin routes require ADMIN or ROOT role
router.use(authenticate);
router.use(requireRole('ADMIN', 'ROOT'));

// ─── GET /admin/overview — System-wide stats ────────────────

router.get('/overview', async (_req: Request, res: Response): Promise<void> => {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [totalUsers, totalEntries, activeUsers30d, allEntries] = await Promise.all([
      prisma.user.count(),
      prisma.monthlyEntry.count(),
      prisma.user.count({
        where: {
          entries: { some: { createdAt: { gte: thirtyDaysAgo } } },
        },
      }),
      // Compute avg growth: get all entries with balances for delta calculation
      prisma.monthlyEntry.findMany({
        orderBy: { date: 'asc' },
        include: { balances: { select: { amount: true } } },
      }),
    ]);

    // Compute avg growth across all entries
    let avgGrowth = 0;
    if (allEntries.length > 1) {
      const totals = allEntries.map((e) =>
        e.balances.reduce((sum, b) => sum + Number(b.amount), 0),
      );
      const deltas: number[] = [];
      for (let i = 1; i < totals.length; i++) {
        deltas.push(totals[i] - totals[i - 1]);
      }
      avgGrowth = deltas.reduce((s, d) => s + d, 0) / deltas.length;
    }

    res.json({
      success: true,
      data: { totalUsers, totalEntries, avgGrowth, activeUsers30d },
    });
  } catch (err) {
    console.error('Admin overview error:', err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// ─── GET /admin/users — List users with search/filter ───────

router.get('/users', async (req: Request, res: Response): Promise<void> => {
  try {
    const search = (req.query.search as string) || '';
    const role = req.query.role as string | undefined;
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 20));
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { username: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (role && ['ROOT', 'ADMIN', 'BASE'].includes(role)) {
      where.role = role;
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: { select: { entries: true } },
          entries: {
            orderBy: { date: 'desc' },
            take: 1,
            include: { balances: { select: { amount: true } } },
          },
        },
      }),
      prisma.user.count({ where }),
    ]);

    const data = users.map((u) => {
      const lastEntry = u.entries[0] ?? null;
      const totalSavings = lastEntry
        ? lastEntry.balances.reduce((sum, b) => sum + Number(b.amount), 0)
        : 0;

      return {
        id: u.id,
        name: u.name,
        email: u.email,
        username: u.username,
        role: u.role,
        isActive: u.isActive,
        createdAt: u.createdAt,
        entriesCount: u._count.entries,
        lastEntryDate: lastEntry?.date?.toISOString() ?? null,
        totalSavings,
      };
    });

    res.json({ success: true, data, total, page, limit });
  } catch (err) {
    console.error('Admin list users error:', err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// ─── GET /admin/users/:id — User detail ─────────────────────

router.get('/users/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;

    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        _count: { select: { entries: true, accounts: true } },
        entries: {
          orderBy: { date: 'desc' },
          take: 1,
          include: { balances: { select: { amount: true } } },
        },
      },
    });

    if (!user) {
      res.status(404).json({ success: false, error: 'User not found' });
      return;
    }

    // Get first entry date
    const firstEntry = await prisma.monthlyEntry.findFirst({
      where: { userId: id },
      orderBy: { date: 'asc' },
      select: { date: true },
    });

    const lastEntry = user.entries[0] ?? null;
    const totalSavings = lastEntry
      ? lastEntry.balances.reduce((sum: number, b) => sum + Number(b.amount), 0)
      : 0;

    res.json({
      success: true,
      data: {
        id: user.id,
        name: user.name,
        email: user.email,
        username: user.username,
        role: user.role,
        isActive: user.isActive,
        createdAt: user.createdAt,
        language: user.language,
        currency: user.currency,
        emailVerified: user.emailVerified,
        entriesCount: user._count.entries,
        accountsCount: user._count.accounts,
        lastEntryDate: lastEntry?.date?.toISOString() ?? null,
        firstEntryDate: firstEntry?.date?.toISOString() ?? null,
        totalSavings,
      },
    });
  } catch (err) {
    console.error('Admin get user error:', err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// ─── PUT /admin/users/:id — Update user role/status ─────────

router.put('/users/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const parsed = adminUpdateUserSchema.safeParse(req.body);

    if (!parsed.success) {
      res
        .status(400)
        .json({ success: false, error: 'Validation failed', details: parsed.error.flatten() });
      return;
    }

    const target = await prisma.user.findUnique({ where: { id } });
    if (!target) {
      res.status(404).json({ success: false, error: 'User not found' });
      return;
    }

    // Cannot modify ROOT users (only ROOT can exist, immutable)
    if (target.role === 'ROOT') {
      res.status(403).json({ success: false, error: 'Cannot modify ROOT user' });
      return;
    }

    // Cannot deactivate yourself
    if (parsed.data.isActive === false && id === req.user!.userId) {
      res.status(400).json({ success: false, error: 'Cannot deactivate yourself' });
      return;
    }

    // Only ROOT can change roles
    if (parsed.data.role && req.user!.role !== 'ROOT') {
      res.status(403).json({ success: false, error: 'Only ROOT can change user roles' });
      return;
    }

    const updated = await prisma.user.update({
      where: { id },
      data: parsed.data,
      select: { id: true, name: true, role: true, isActive: true },
    });

    res.json({ success: true, data: updated });
  } catch (err) {
    console.error('Admin update user error:', err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// ─── DELETE /admin/users/:id — Delete user (ROOT only) ──────

router.delete('/users/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    // Only ROOT can delete users
    if (req.user!.role !== 'ROOT') {
      res.status(403).json({ success: false, error: 'Only ROOT can delete users' });
      return;
    }

    const id = req.params.id as string;

    const target = await prisma.user.findUnique({ where: { id } });
    if (!target) {
      res.status(404).json({ success: false, error: 'User not found' });
      return;
    }

    // Cannot delete ROOT user
    if (target.role === 'ROOT') {
      res.status(403).json({ success: false, error: 'Cannot delete ROOT user' });
      return;
    }

    // Cannot delete yourself
    if (id === req.user!.userId) {
      res.status(400).json({ success: false, error: 'Cannot delete yourself' });
      return;
    }

    // Cascade delete handled by Prisma schema
    await prisma.user.delete({ where: { id } });

    res.json({ success: true, data: { message: 'User deleted' } });
  } catch (err) {
    console.error('Admin delete user error:', err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

export default router;
