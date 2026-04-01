import { Link } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { useAuthStore } from '../stores/auth-store';
import { useUnreadCount } from '../hooks/queries';
import { NotificationCenter } from './NotificationCenter';
import { VersionBadge } from './VersionBadge';

export function Header() {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.role === 'ROOT' || user?.role === 'ADMIN';
  const { data: unreadCount } = useUnreadCount();
  const [showNotifications, setShowNotifications] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-40 glass-card border-b border-border-default px-4 py-3">
        <div className="flex items-center justify-between max-w-lg mx-auto">
          <Link to="/" className="flex items-center gap-2">
            <span className="icon text-brand text-[28px]">monetization_on</span>
            <h1 className="font-heading text-xl font-bold text-brand">{t('common.appName')}</h1>
          </Link>
          <VersionBadge className="ml-1 self-end mb-0.5" />

          <div className="flex items-center gap-2">
            {/* Notification bell */}
            <button
              onClick={() => setShowNotifications(true)}
              className="relative text-text-muted hover:text-text-primary transition-colors"
              aria-label={t('notifications.title')}
            >
              <span className="icon text-xl">notifications</span>
              {!!unreadCount && unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-brand text-[10px] font-bold text-surface-0 flex items-center justify-center">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </button>

            {isAdmin && (
              <Link
                to="/admin"
                className="text-gold hover:text-gold/80 transition-colors"
                aria-label="Admin Dashboard"
              >
                <span className="icon text-xl">shield</span>
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Notification Center Sheet */}
      <AnimatePresence>
        {showNotifications && <NotificationCenter onClose={() => setShowNotifications(false)} />}
      </AnimatePresence>
    </>
  );
}
