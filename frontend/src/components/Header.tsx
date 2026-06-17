import { Link } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CircleDollarSign, Bell, ShieldCheck, Moon, Sun, Monitor } from 'lucide-react';
import { useAuthStore } from '../stores/auth-store';
import { useThemeStore } from '../stores/theme-store';
import { useUnreadCount } from '../hooks/queries';
import { NotificationCenter } from './NotificationCenter';
import { VersionBadge } from './VersionBadge';

export function Header({ scrolled = false }: { scrolled?: boolean }) {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.role === 'ROOT' || user?.role === 'ADMIN';
  const { data: unreadCount } = useUnreadCount();
  const [showNotifications, setShowNotifications] = useState(false);

  const theme = useThemeStore((s) => s.theme);
  const setTheme = useThemeStore((s) => s.setTheme);
  const ThemeIcon = theme === 'dark' ? Moon : theme === 'light' ? Sun : Monitor;
  const cycleTheme = () => {
    const next = theme === 'dark' ? 'light' : theme === 'light' ? 'system' : 'dark';
    setTheme(next);
  };

  return (
    <>
      <motion.header
        initial={{ y: -8, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        className={`sticky top-0 z-40 solid-card border-b px-4 py-3 transition-shadow duration-300 ${
          scrolled ? 'border-border-active/40 shadow-md' : 'border-border-default'
        }`}
        style={{ minHeight: 'var(--header-height)' }}
      >
        <div className="flex items-center justify-between max-w-lg mx-auto">
          <Link to="/" className="flex items-center gap-2">
            <CircleDollarSign size={28} className="text-brand" aria-hidden="true" />
            <span className="font-heading text-xl font-bold text-brand">{t('common.appName')}</span>
          </Link>
          <VersionBadge className="ml-1 self-end mb-0.5" />

          <div className="flex items-center gap-2">
            {/* Theme toggle (cycles dark → light → system) */}
            <button
              onClick={cycleTheme}
              className="p-3 -m-3 min-h-11 min-w-11 inline-flex items-center justify-center text-text-muted hover:text-text-primary transition-colors"
              aria-label={t('settings.theme')}
              title={`${t('settings.theme')}: ${t(`settings.${theme}`)}`}
            >
              <ThemeIcon size={22} />
            </button>

            {/* Notification bell */}
            <button
              onClick={() => setShowNotifications(true)}
              className="relative p-3 -m-3 min-h-11 min-w-11 inline-flex items-center justify-center text-text-muted hover:text-text-primary transition-colors"
              aria-label={t('notifications.title')}
            >
              <Bell size={22} />
              {!!unreadCount && unreadCount > 0 && (
                <span className="absolute top-0 right-0 min-w-[16px] h-4 px-1 rounded-full bg-brand text-[10px] font-bold text-surface-base flex items-center justify-center">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </button>

            {isAdmin && (
              <Link
                to="/admin"
                className="p-3 -m-3 min-h-11 min-w-11 inline-flex items-center justify-center text-gold hover:text-gold/80 transition-colors"
                aria-label="Admin Dashboard"
              >
                <ShieldCheck size={22} />
              </Link>
            )}
          </div>
        </div>
      </motion.header>

      {/* Notification Center Sheet */}
      <AnimatePresence>
        {showNotifications && <NotificationCenter onClose={() => setShowNotifications(false)} />}
      </AnimatePresence>
    </>
  );
}
