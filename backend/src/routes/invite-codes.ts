import { Router, type Router as RouterType, type Request, type Response } from 'express';
import { createInviteCodeSchema } from '@salvadash/shared';
import prisma from '../lib/prisma.js';
import { generateInviteCode } from '../lib/auth.js';
import { authenticate, requireRole } from '../middleware/auth.js';

const router: RouterType = Router();

// All invite code routes require authentication + ADMIN or ROOT role
router.use(authenticate);
router.use(requireRole('ADMIN', 'ROOT'));

// ─── POST /invite-codes — Create invite code ───────────────

router.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const parsed = createInviteCodeSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ success: false, error: 'Validation failed', details: parsed.error.flatten() });
      return;
    }

    const code = parsed.data.code ?? generateInviteCode();

    // Check uniqueness
    const existing = await prisma.inviteCode.findUnique({ where: { code } });
    if (existing) {
      res.status(409).json({ success: false, error: 'Invite code already exists' });
      return;
    }

    const invite = await prisma.inviteCode.create({
      data: {
        code,
        createdByUserId: req.user!.userId,
      },
    });

    res.status(201).json({
      success: true,
      data: {
        id: invite.id,
        code: invite.code,
        isActive: invite.isActive,
        createdAt: invite.createdAt,
      },
    });
  } catch (err) {
    console.error('Create invite code error:', err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// ─── GET /invite-codes — List all invite codes ──────────────

router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const codes = await prisma.inviteCode.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        createdBy: { select: { id: true, name: true, username: true } },
        usedBy: { select: { id: true, name: true, username: true } },
      },
    });

    res.json({
      success: true,
      data: codes.map((c) => ({
        id: c.id,
        code: c.code,
        isActive: c.isActive,
        createdAt: c.createdAt,
        usedAt: c.usedAt,
        createdBy: c.createdBy,
        usedBy: c.usedBy,
      })),
    });
  } catch (err) {
    console.error('List invite codes error:', err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// ─── DELETE /invite-codes/:id — Deactivate invite code ──────

router.delete('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;

    const invite = await prisma.inviteCode.findUnique({ where: { id } });
    if (!invite) {
      res.status(404).json({ success: false, error: 'Invite code not found' });
      return;
    }

    if (invite.usedByUserId) {
      res.status(400).json({ success: false, error: 'Cannot delete a used invite code' });
      return;
    }

    await prisma.inviteCode.update({
      where: { id },
      data: { isActive: false },
    });

    res.json({ success: true, data: { message: 'Invite code deactivated' } });
  } catch (err) {
    console.error('Delete invite code error:', err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

export default router;
