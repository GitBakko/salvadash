import { z } from 'zod';

export const NotificationType = {
  REMINDER: 'REMINDER',
  MILESTONE: 'MILESTONE',
  ALERT: 'ALERT',
  ADMIN: 'ADMIN',
  SYSTEM: 'SYSTEM',
} as const;

export type NotificationType = (typeof NotificationType)[keyof typeof NotificationType];

export const sendNotificationSchema = z.object({
  userId: z.string().optional(), // if omitted, broadcast to all
  type: z.enum(['REMINDER', 'MILESTONE', 'ALERT', 'ADMIN', 'SYSTEM']),
  title: z.string().min(1).max(200),
  body: z.string().min(1).max(2000),
});

export type SendNotificationInput = z.infer<typeof sendNotificationSchema>;
