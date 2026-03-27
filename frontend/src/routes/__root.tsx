import { createRootRoute, Outlet, useNavigate, useRouterState } from '@tanstack/react-router';
import { AnimatePresence, motion } from 'framer-motion';
import { useEffect } from 'react';
import { Header } from '../components/Header';
import { BottomNav } from '../components/BottomNav';
import { PWAInstallBanner } from '../components/PWAInstallBanner';
import { ToastContainer } from '../components/ui/Toast';
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
  const { isLoading, isAuthenticated, fetchUser } = useAuthStore();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isAuthPage = AUTH_PATHS.some((p) => pathname.startsWith(p));
  const isFullscreen = FULLSCREEN_PATHS.some((p) => pathname.startsWith(p));

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

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-dvh bg-surface-base flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <span className="icon text-brand text-[48px] animate-pulse">monetization_on</span>
          <Skeleton width={120} height={16} />
        </div>
      </div>
    );
  }

  // Auth pages — no shell
  if (isAuthPage) {
    return (
      <div className="min-h-dvh bg-surface-base text-text-primary">
        <ToastContainer />
        <Outlet />
      </div>
    );
  }

  // Fullscreen pages — no header/navbar
  if (isFullscreen) {
    return (
      <div className="min-h-dvh bg-surface-base text-text-primary">
        <Outlet />
        <ToastContainer />
      </div>
    );
  }

  // Not authenticated — redirect handled by individual routes
  // But show shell if authenticated
  return (
    <div className="min-h-dvh bg-surface-base text-text-primary flex flex-col">
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
      <ToastContainer />
    </div>
  );
}
