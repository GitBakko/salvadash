import { Router, type Router as RouterType, type Request, type Response } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma.js';
import { authenticate } from '../middleware/auth.js';
import { config } from '../config/index.js';

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

router.post('/subscribe', async (req: Request, res: Response): Promise<void> => {
  try {
    const parsed = subscribeSchema.safeParse(req.body);
    if (!parsed.success) {
      res
        .status(400)
        .json({ success: false, error: 'Invalid subscription', details: parsed.error.flatten() });
      return;
    }

    const { endpoint, keys } = parsed.data;
    const userId = req.user!.userId;

    // Upsert: if endpoint exists, update; otherwise create
    await prisma.pushSubscription.upsert({
      where: { endpoint },
      update: { userId, p256dh: keys.p256dh, auth: keys.auth },
      create: { userId, endpoint, p256dh: keys.p256dh, auth: keys.auth },
    });

    res.status(201).json({ success: true, data: { message: 'Subscribed' } });
  } catch (err) {
    console.error('Push subscribe error:', err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// ─── DELETE /push/unsubscribe — Remove push subscription ────

router.delete('/unsubscribe', async (req: Request, res: Response): Promise<void> => {
  try {
    const { endpoint } = req.body as { endpoint?: string };
    if (!endpoint) {
      res.status(400).json({ success: false, error: 'Endpoint required' });
      return;
    }

    await prisma.pushSubscription.deleteMany({
      where: { endpoint, userId: req.user!.userId },
    });

    res.json({ success: true, data: { message: 'Unsubscribed' } });
  } catch (err) {
    console.error('Push unsubscribe error:', err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// ─── GET /push/status — Check if user has active subscription ─

router.get('/status', async (req: Request, res: Response): Promise<void> => {
  try {
    const count = await prisma.pushSubscription.count({
      where: { userId: req.user!.userId },
    });
    res.json({ success: true, data: { subscribed: count > 0, count } });
  } catch (err) {
    console.error('Push status error:', err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

export default router;
