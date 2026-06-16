import { Router, type Router as RouterType, type Request, type Response } from 'express';
import { APP_VERSION, changelog } from '@salvadash/shared';
import prisma from '../lib/prisma.js';
import { authenticate } from '../middleware/auth.js';
import { asyncHandler } from '../lib/http.js';

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

router.put(
  '/seen',
  authenticate,
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    await prisma.user.update({
      where: { id: req.user!.userId },
      data: { lastSeenVersion: APP_VERSION },
    });

    res.json({ success: true, data: { lastSeenVersion: APP_VERSION } });
  }),
);

export default router;
