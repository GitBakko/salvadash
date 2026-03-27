import webpush from 'web-push';
import { config } from '../config/index.js';
import prisma from './prisma.js';

// Configure VAPID if keys are present
if (config.vapid.publicKey && config.vapid.privateKey) {
  webpush.setVapidDetails(
    config.vapid.subject || `mailto:${config.smtp.from}`,
    config.vapid.publicKey,
    config.vapid.privateKey,
  );
}

export interface PushPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  data?: Record<string, unknown>;
}

/**
 * Send push notification to a single user's subscriptions.
 * Removes stale subscriptions automatically.
 */
export async function sendPushToUser(userId: string, payload: PushPayload): Promise<number> {
  if (!config.vapid.publicKey || !config.vapid.privateKey) return 0;

  const subscriptions = await prisma.pushSubscription.findMany({ where: { userId } });
  if (!subscriptions.length) return 0;

  const jsonPayload = JSON.stringify(payload);
  let sent = 0;

  await Promise.allSettled(
    subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          jsonPayload,
        );
        sent++;
      } catch (err: unknown) {
        const statusCode = (err as { statusCode?: number }).statusCode;
        // 404 or 410 = subscription expired/invalid, remove it
        if (statusCode === 404 || statusCode === 410) {
          await prisma.pushSubscription.delete({ where: { id: sub.id } }).catch(() => {});
        }
      }
    }),
  );

  return sent;
}

/**
 * Send push notification to multiple users.
 */
export async function sendPushToUsers(userIds: string[], payload: PushPayload): Promise<number> {
  let total = 0;
  // Process in batches to avoid overwhelming
  for (const userId of userIds) {
    total += await sendPushToUser(userId, payload);
  }
  return total;
}
