import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, BellOff, Clock, Trophy, AlertTriangle, ShieldCheck, Info, X } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { NotificationPublic } from '@salvadash/shared';
import {
  useNotifications,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
  useDeleteNotification,
} from '../hooks/queries';
import { Card, SkeletonCard } from './ui';

// ─── Notification type config ──────────────────────────────

const TYPE_CONFIG: Record<string, { Icon: LucideIcon; color: string }> = {
  REMINDER: { Icon: Clock, color: 'text-blue-400' },
  MILESTONE: { Icon: Trophy, color: 'text-gold' },
  ALERT: { Icon: AlertTriangle, color: 'text-orange-400' },
  ADMIN: { Icon: ShieldCheck, color: 'text-brand' },
  SYSTEM: { Icon: Info, color: 'text-text-muted' },
};

// ─── Time ago helper ───────────────────────────────────────

function timeAgo(date: string): string {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (seconds < 60) return '<1m';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d`;
  const months = Math.floor(days / 30);
  return `${months}mo`;
}

// ─── Notification Center (Sheet) ───────────────────────────

export function NotificationCenter({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();
  const { data: notifications, isLoading } = useNotifications();
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();
  const deleteNotification = useDeleteNotification();

  const hasUnread = notifications?.some((n) => !n.isRead);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end justify-center"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" />

      {/* Sheet */}
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="relative w-full max-w-lg bg-surface-1 rounded-t-2xl border-t border-border-default p-5 pb-8 max-h-[80vh] overflow-y-auto no-scrollbar"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Handle */}
        <div className="w-10 h-1 rounded-full bg-surface-3 mx-auto mb-4" />

        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-heading text-lg font-bold text-text-primary flex items-center gap-2">
            <Bell size={22} className="text-brand" />
            {t('notifications.title')}
          </h3>

          {hasUnread && (
            <button
              onClick={() => markAllRead.mutate()}
              disabled={markAllRead.isPending}
              className="text-xs text-brand hover:text-brand/80 transition-colors font-medium"
            >
              {t('notifications.markAllRead')}
            </button>
          )}
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : !notifications?.length ? (
          <div className="text-center py-10">
            <BellOff size={48} className="text-text-muted mx-auto" strokeWidth={1.5} />
            <p className="text-text-muted mt-2 font-medium">{t('notifications.empty')}</p>
            <p className="text-text-muted text-xs mt-1">{t('notifications.emptyDesc')}</p>
          </div>
        ) : (
          <div className="space-y-2">
            <AnimatePresence initial={false}>
              {notifications.map((n, i) => (
                <NotificationItem
                  key={n.id}
                  notification={n}
                  index={i}
                  onMarkRead={() => markRead.mutate(n.id)}
                  onDelete={() => deleteNotification.mutate(n.id)}
                />
              ))}
            </AnimatePresence>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}

// ─── Single Notification Item ──────────────────────────────

function NotificationItem({
  notification,
  index,
  onMarkRead,
  onDelete,
}: {
  notification: NotificationPublic;
  index: number;
  onMarkRead: () => void;
  onDelete: () => void;
}) {
  const { t } = useTranslation();
  const config = TYPE_CONFIG[notification.type] ?? TYPE_CONFIG.SYSTEM;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -50, height: 0, marginBottom: 0 }}
      transition={{ delay: index * 0.03 }}
      layout
    >
      <Card
        className={`p-3 transition-all ${!notification.isRead ? 'border-brand/30 bg-brand/5' : ''}`}
      >
        <div className="flex gap-3">
          {/* Icon */}
          <div className="shrink-0 mt-0.5">
            <config.Icon size={22} className={config.color} />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-sm text-text-primary truncate">
                    {notification.title}
                  </p>
                  {!notification.isRead && (
                    <span className="w-2 h-2 rounded-full bg-brand shrink-0" />
                  )}
                </div>
                <p className="text-xs text-text-muted mt-0.5 line-clamp-2">{notification.body}</p>
              </div>

              <span className="text-[10px] text-text-muted whitespace-nowrap shrink-0">
                {timeAgo(notification.createdAt)}
              </span>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3 mt-2">
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded ${config.color
                  .replace('text-', 'bg-')
                  .replace(/400|muted/, '500/15')} ${config.color}`}
              >
                {t(`notifications.type${notification.type}`)}
              </span>

              {!notification.isRead && (
                <button
                  onClick={onMarkRead}
                  className="text-[10px] text-brand hover:text-brand/80 transition-colors"
                >
                  {t('notifications.markRead')}
                </button>
              )}

              <button
                onClick={onDelete}
                className="p-1 -m-1 text-text-muted hover:text-red-400 transition-colors ml-auto"
              >
                <X size={14} />
              </button>
            </div>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}
