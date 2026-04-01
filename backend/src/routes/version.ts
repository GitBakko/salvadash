import { Router, type Router as RouterType, type Request, type Response } from 'express';
import { APP_VERSION, changelog } from '@salvadash/shared';
import prisma from '../lib/prisma.js';
import { authenticate } from '../middleware/auth.js';

const router: RouterType = Router();

// ─── GET /version ──────────────────────────────────────────
// Public — returns current version + full changelog

router.get('/', (_req: Request, res: Response): void => {
  res.json({
    success: true,
    data: {
      version: APP_VERSION,
      changelog,
    },
  });
});

// ─── GET /version/current ──────────────────────────────────
// Public — returns just the current version

router.get('/current', (_req: Request, res: Response): void => {
  res.json({
    success: true,
    data: { version: APP_VERSION },
  });
});

// ─── PUT /version/seen ─────────────────────────────────────
// Authenticated — marks the current version as seen by the user

router.put('/seen', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    await prisma.user.update({
      where: { id: req.user!.userId },
      data: { lastSeenVersion: APP_VERSION },
    });

    res.json({ success: true, data: { lastSeenVersion: APP_VERSION } });
  } catch (err) {
    console.error('Mark version seen error:', err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

export default router;
