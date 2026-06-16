import { Router, type Router as RouterType, type Request, type Response } from 'express';
import { sendNotificationSchema } from '@salvadash/shared';
import prisma from '../lib/prisma.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { sendPushToUser, sendPushToUsers } from '../lib/push.js';
import { asyncHandler, isValidationOk } from '../lib/http.js';

const router: RouterType = Router();

// All notification routes require authentication
router.use(authenticate);

// ─── GET /notifications — List user's notifications ─────────

router.get(
  '/',
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const userId = req.user!.userId;
    const limit = Math.min(Number(req.query.limit) || 50, 100);
    const cursor = req.query.cursor as string | undefined;

    const notifications = await prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit + 1,
      ...(cursor && { cursor: { id: cursor }, skip: 1 }),
    });

    const hasMore = notifications.length > limit;
    const data = notifications.slice(0, limit);

    res.json({
      success: true,
      data: data.map((n) => ({
        id: n.id,
        type: n.type,
        title: n.title,
        body: n.body,
        isRead: n.isRead,
        createdAt: n.createdAt,
      })),
      hasMore,
      nextCursor: hasMore ? data[data.length - 1].id : null,
    });
  }),
);

// ─── GET /notifications/unread-count — Unread badge count ───

router.get(
  '/unread-count',
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const count = await prisma.notification.count({
      where: { userId: req.user!.userId, isRead: false },
    });
    res.json({ success: true, data: { count } });
  }),
);

// ─── PUT /notifications/:id/read — Mark single as read ─────

router.put(
  '/:id/read',
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const id = req.params.id as string;
    const notification = await prisma.notification.findFirst({
      where: { id, userId: req.user!.userId },
    });

    if (!notification) {
      res.status(404).json({ success: false, error: 'Notification not found' });
      return;
    }

    await prisma.notification.update({
      where: { id },
      data: { isRead: true },
    });

    res.json({ success: true, data: { message: 'Marked as read' } });
  }),
);

// ─── PUT /notifications/read-all — Mark all as read ─────────

router.put(
  '/read-all',
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    await prisma.notification.updateMany({
      where: { userId: req.user!.userId, isRead: false },
      data: { isRead: true },
    });

    res.json({ success: true, data: { message: 'All marked as read' } });
  }),
);

// ─── DELETE /notifications/:id — Delete a notification ──────

router.delete(
  '/:id',
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const id = req.params.id as string;
    const notification = await prisma.notification.findFirst({
      where: { id, userId: req.user!.userId },
    });

    if (!notification) {
      res.status(404).json({ success: false, error: 'Notification not found' });
      return;
    }

    await prisma.notification.delete({ where: { id } });
    res.json({ success: true, data: { message: 'Notification deleted' } });
  }),
);

// ─── POST /notifications/broadcast — Admin broadcast ────────

router.post(
  '/broadcast',
  requireRole('ADMIN', 'ROOT'),
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const parsed = sendNotificationSchema.safeParse(req.body);
    if (!isValidationOk(res, parsed)) return;

    const { userId, type, title, body } = parsed.data;

    if (userId) {
      // Send to specific user
      const targetUser = await prisma.user.findUnique({ where: { id: userId } });
      if (!targetUser) {
        res.status(404).json({ success: false, error: 'Target user not found' });
        return;
      }

      await prisma.notification.create({
        data: { userId, type, title, body },
      });

      // Send push notification
      sendPushToUser(userId, { title, body, tag: type }).catch(() => {});

      res.status(201).json({ success: true, data: { message: 'Notification sent', count: 1 } });
    } else {
      // Broadcast to all active users
      const users = await prisma.user.findMany({
        where: { isActive: true },
        select: { id: true },
      });

      await prisma.notification.createMany({
        data: users.map((u) => ({ userId: u.id, type, title, body })),
      });

      // Send push to all users
      sendPushToUsers(
        users.map((u) => u.id),
        { title, body, tag: type },
      ).catch(() => {});

      res
        .status(201)
        .json({ success: true, data: { message: 'Broadcast sent', count: users.length } });
    }
  }),
);

export default router;
