import { useNavigate, useRouterState } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Wallet, Home, Clock, Plus, BarChart3, Settings } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useAuthStore } from '../stores/auth-store';

interface NavItem {
  path: string;
  Icon: LucideIcon;
  labelKey: string;
  isFab?: boolean;
}

const navItems: NavItem[] = [
  { path: '/', Icon: Home, labelKey: 'nav.home' },
  { path: '/accounts', Icon: Wallet, labelKey: 'nav.accounts' },
  { path: '/history', Icon: Clock, labelKey: 'nav.history' },
  { path: '/new-entry', Icon: Plus, labelKey: 'nav.newEntry', isFab: true },
  { path: '/analytics', Icon: BarChart3, labelKey: 'nav.analytics' },
  { path: '/settings', Icon: Settings, labelKey: 'nav.settings' },
];

export function BottomNav() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const avatarUrl = useAuthStore((s) => s.user?.avatarUrl);

  return (
    <nav
      className="fixed bottom-0 inset-x-0 z-40 glass-card border-t border-border-default"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="flex items-center justify-around max-w-lg mx-auto h-16 relative">
        {navItems.map((item) => {
          const isActive = item.path === '/' ? pathname === '/' : pathname.startsWith(item.path);

          if (item.isFab) {
            return (
              <button
                key={item.path}
                onClick={() => navigate({ to: item.path })}
                className="relative -mt-6 w-14 h-14 rounded-full bg-brand flex items-center justify-center shadow-lg glow-brand active:scale-95 transition-transform"
                aria-label={t(item.labelKey)}
              >
                <item.Icon size={28} className="text-surface-base" />
              </button>
            );
          }

          const isSettingsWithAvatar = item.path === '/settings' && avatarUrl;

          return (
            <button
              key={item.path}
              onClick={() => navigate({ to: item.path })}
              className="flex flex-col items-center justify-center gap-0.5 px-2 relative self-stretch"
              aria-label={t(item.labelKey)}
            >
              {isActive && (
                <motion.div
                  layoutId="nav-indicator"
                  className="absolute top-0 inset-x-0 h-0.5 bg-brand rounded-b-full"
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                />
              )}
              {isSettingsWithAvatar ? (
                <img
                  src={avatarUrl}
                  alt=""
                  className={`w-[22px] h-[22px] rounded-full object-cover transition-all duration-200 ${isActive ? 'ring-2 ring-brand' : 'opacity-70'}`}
                />
              ) : (
                <item.Icon
                  size={22}
                  className={`transition-colors duration-200 ${isActive ? 'text-brand' : 'text-text-muted'}`}
                />
              )}
              <span
                className={`text-[10px] font-medium transition-colors duration-200 ${isActive ? 'text-brand' : 'text-text-muted'}`}
              >
                {t(item.labelKey)}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
