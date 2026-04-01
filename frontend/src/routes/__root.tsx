import { createRootRoute, Outlet, useNavigate, useRouterState } from '@tanstack/react-router';
import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useState } from 'react';
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
import '../i18n';

export const Route = createRootRoute({
  component: RootLayout,
});

// Auth pages that don't need the shell
const AUTH_PATHS = ['/login', '/register', '/forgot-password', '/verify-email', '/reset-password'];
const FULLSCREEN_PATHS = ['/new-entry'];

function RootLayout() {
  const { isLoading, isAuthenticated, fetchUser, user } = useAuthStore();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isAuthPage = AUTH_PATHS.some((p) => pathname.startsWith(p));
  const isFullscreen = FULLSCREEN_PATHS.some((p) => pathname.startsWith(p));
  const [showWhatsNew, setShowWhatsNew] = useState(false);

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
      <Header />

      <main className="flex-1 overflow-y-auto pb-20">
        <AnimatePresence mode="wait">
          <motion.div
            key={pathname}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
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
