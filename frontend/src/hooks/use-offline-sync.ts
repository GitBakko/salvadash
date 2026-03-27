import { useEffect, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../stores/auth-store';
import { cacheDashboard, getCachedDashboard } from '../lib/db';

/**
 * Hook that:
 * 1. Listens for SW 'SYNC_COMPLETE' messages → invalidates queries
 * 2. Listens for online/offline events → updates UI + triggers sync replay
 * 3. Provides offline-aware dashboard fallback for TanStack Query
 */
export function useOfflineSync() {
  const queryClient = useQueryClient();

  // ─── SW message listener (background sync complete) ──────
  useEffect(() => {
    function onMessage(event: MessageEvent) {
      if (event.data?.type === 'SYNC_COMPLETE') {
        // Refetch everything after background sync replayed queued mutations
        queryClient.invalidateQueries({ queryKey: ['entries'] });
        queryClient.invalidateQueries({ queryKey: ['dashboard'] });
        queryClient.invalidateQueries({ queryKey: ['analytics'] });
        queryClient.invalidateQueries({ queryKey: ['accounts'] });
      }
    }

    navigator.serviceWorker?.addEventListener('message', onMessage);
    return () => navigator.serviceWorker?.removeEventListener('message', onMessage);
  }, [queryClient]);

  // ─── Online/offline listeners ────────────────────────────
  useEffect(() => {
    function onOnline() {
      // Trigger sync replay via SW message (fallback if BackgroundSync API unavailable)
      navigator.serviceWorker?.ready.then((reg) => {
        reg.active?.postMessage({ type: 'REPLAY_SYNC' });
      });
      // Refetch stale data
      queryClient.invalidateQueries();
    }

    window.addEventListener('online', onOnline);
    return () => window.removeEventListener('online', onOnline);
  }, [queryClient]);
}

/**
 * Cache dashboard data to IndexedDB after a successful fetch.
 * Call this in the dashboard page after data loads.
 */
export function useCacheDashboard(data: unknown) {
  const userId = useAuthStore((s) => s.user?.id);

  useEffect(() => {
    if (data && userId) {
      cacheDashboard(userId, data);
    }
  }, [data, userId]);
}

/**
 * Get cached dashboard from IndexedDB (for offline fallback).
 */
export function useGetCachedDashboard() {
  const userId = useAuthStore((s) => s.user?.id);

  return useCallback(async () => {
    if (!userId) return undefined;
    return getCachedDashboard(userId) ?? undefined;
  }, [userId]);
}
