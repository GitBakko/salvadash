import { createRootRoute, Outlet, useNavigate, useRouterState } from '@tanstack/react-router';
import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { APP_VERSION } from '@salvadash/shared';
import { Header } from '../components/Header';
import { BottomNav } from '../components/BottomNav';
import { PWAInstallBanner } from '../components/PWAInstallBanner';
import { PWAUpdatePrompt } from '../components/PWAUpdatePrompt';
import { WhatsNewModal } from '../components/WhatsNewModal';
import { ToastContainer } from '../components/ui/Toast';
import { CircleDollarSign } from 'lucide-react';
import { useAuthStore } from '../stores/auth-store';
import { useUIStore } from '../stores/ui-store';
import { Skeleton } from '../components/ui/Skeleton';
import { useOfflineSync } from '../hooks/use-offline-sync';
import { usePrefersReducedMotion } from '../hooks/use-prefers-reduced-motion';
import '../i18n';

export const Route = createRootRoute({
  component: RootLayout,
});

// Auth pages that don't need the shell
const AUTH_PATHS = ['/login', '/register', '/forgot-password', '/verify-email', '/reset-password'];
const FULLSCREEN_PATHS = ['/new-entry', '/accounts/new'];
// Matches `/accounts/{id}/edit` for the mobile full-screen edit route.
const FULLSCREEN_REGEX = /^\/accounts\/[^/]+\/edit$/;

function RootLayout() {
  const { t } = useTranslation();
  const { isLoading, isAuthenticated, fetchUser, user } = useAuthStore();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isAuthPage = AUTH_PATHS.some((p) => pathname.startsWith(p));
  const isFullscreen =
    FULLSCREEN_PATHS.some((p) => pathname.startsWith(p)) || FULLSCREEN_REGEX.test(pathname);
  const [showWhatsNew, setShowWhatsNew] = useState(false);
  const reducedMotion = usePrefersReducedMotion();

  // Setup offline sync (SW message listener + online/offline events)
  useOfflineSync();

  // Listen for PWA install prompt
  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      useUIStore.getState().setDeferredPrompt(e as any);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  // Fetch user on mount
  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  // Redirect to login if not authenticated and not on auth page
  useEffect(() => {
    if (!isLoading && !isAuthenticated && !isAuthPage) {
      navigate({ to: '/login' });
    }
  }, [isLoading, isAuthenticated, isAuthPage, navigate]);

  // Auto-show What's New modal after update
  useEffect(() => {
    if (!isLoading && isAuthenticated && user && user.lastSeenVersion !== APP_VERSION) {
      setShowWhatsNew(true);
    }
  }, [isLoading, isAuthenticated, user]);

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-dvh bg-surface-base flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <CircleDollarSign size={48} className="text-brand animate-pulse" strokeWidth={1.5} />
          <Skeleton width={120} height={16} />
        </div>
      </div>
    );
  }

  // Auth pages — no shell
  if (isAuthPage) {
    return (
      <div className="min-h-dvh bg-surface-base text-text-primary" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
        <ToastContainer />
        <Outlet />
      </div>
    );
  }

  // Fullscreen pages — no header/navbar
  if (isFullscreen) {
    return (
      <div className="min-h-dvh bg-surface-base text-text-primary" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
        <Outlet />
        <ToastContainer />
      </div>
    );
  }

  // Not authenticated — redirect handled by individual routes
  // But show shell if authenticated
  return (
    <div className="min-h-dvh bg-surface-base text-text-primary flex flex-col" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:bg-brand focus:text-surface-base focus:px-3 focus:py-2 focus:rounded-md"
      >
        {t('common.skipToContent')}
      </a>
      <Header />

      <main
        id="main"
        tabIndex={-1}
        className="flex-1 overflow-y-auto"
        style={{ paddingBottom: 'calc(var(--nav-height) + env(safe-area-inset-bottom) + 1rem)' }}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={pathname}
            initial={reducedMotion ? false : { opacity: 0, y: 8 }}
            animate={reducedMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
            exit={reducedMotion ? { opacity: 1 } : { opacity: 0, y: -8 }}
            transition={{ duration: reducedMotion ? 0 : 0.2, ease: 'easeInOut' }}
          >
            <Outlet />
          </motion.div>
        </AnimatePresence>
      </main>

      {isAuthenticated && <BottomNav />}
      {isAuthenticated && <PWAInstallBanner />}
      <PWAUpdatePrompt />
      {showWhatsNew && <WhatsNewModal onClose={() => setShowWhatsNew(false)} />}
      <ToastContainer />
    </div>
  );
}
