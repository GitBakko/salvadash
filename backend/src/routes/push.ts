import { Router, type Router as RouterType, type Request, type Response } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma.js';
import { authenticate } from '../middleware/auth.js';
import { config } from '../config/index.js';
import { asyncHandler, HttpError } from '../lib/http.js';

const router: RouterType = Router();

router.use(authenticate);

const subscribeSchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({
    p256dh: z.string().min(1),
    auth: z.string().min(1),
  }),
});

// ─── GET /push/vapid-key — Return public VAPID key ─────────

router.get('/vapid-key', (_req: Request, res: Response): void => {
  res.json({ success: true, data: { publicKey: config.vapid.publicKey } });
});

// ─── POST /push/subscribe — Save push subscription ─────────

router.post(
  '/subscribe',
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const parsed = subscribeSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new HttpError(400, 'Invalid subscription', parsed.error.flatten());
    }

    const { endpoint, keys } = parsed.data;
    const userId = req.user!.userId;

    // A push endpoint is unique to a single browser install. Bind it to the
    // current user, explicitly reassigning it (and dropping any stale record
    // from a previous owner on the same device) instead of letting a bare
    // upsert silently clobber another user's subscription with our keys.
    await prisma.$transaction(async (tx) => {
      const existing = await tx.pushSubscription.findUnique({ where: { endpoint } });
      if (existing && existing.userId !== userId) {
        await tx.pushSubscription.delete({ where: { endpoint } });
      }
      await tx.pushSubscription.upsert({
        where: { endpoint },
        update: { userId, p256dh: keys.p256dh, auth: keys.auth },
        create: { userId, endpoint, p256dh: keys.p256dh, auth: keys.auth },
      });
    });

    res.status(201).json({ success: true, data: { message: 'Subscribed' } });
  }),
);

// ─── DELETE /push/unsubscribe — Remove push subscription ────

router.delete(
  '/unsubscribe',
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { endpoint } = req.body as { endpoint?: string };
    if (!endpoint) {
      throw new HttpError(400, 'Endpoint required');
    }

    await prisma.pushSubscription.deleteMany({
      where: { endpoint, userId: req.user!.userId },
    });

    res.json({ success: true, data: { message: 'Unsubscribed' } });
  }),
);

// ─── GET /push/status — Check if user has active subscription ─

router.get(
  '/status',
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const count = await prisma.pushSubscription.count({
      where: { userId: req.user!.userId },
    });
    res.json({ success: true, data: { subscribed: count > 0, count } });
  }),
);

export default router;
