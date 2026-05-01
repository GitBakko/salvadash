import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { NotificationPublic } from '@salvadash/shared';
import { api } from '../../lib/api';
import { queryKeys } from './keys';

export function useNotifications() {
  return useQuery({
    queryKey: queryKeys.notifications,
    queryFn: async () => {
      const res = await api.get<NotificationPublic[]>('/notifications');
      if (!res.success) throw new Error(res.error ?? 'Failed to fetch notifications');
      return res.data!;
    },
  });
}

export function useUnreadCount() {
  return useQuery({
    queryKey: queryKeys.unreadCount,
    queryFn: async () => {
      const res = await api.get<{ count: number }>('/notifications/unread-count');
      if (!res.success) throw new Error(res.error ?? 'Failed to fetch unread count');
      return res.data!.count;
    },
    refetchInterval: 30_000,
  });
}

export function useMarkNotificationRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.put(`/notifications/${id}/read`);
      if (!res.success) throw new Error(res.error ?? 'Failed to mark as read');
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.notifications });
      qc.invalidateQueries({ queryKey: queryKeys.unreadCount });
    },
  });
}

export function useMarkAllNotificationsRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const res = await api.put('/notifications/read-all');
      if (!res.success) throw new Error(res.error ?? 'Failed to mark all as read');
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.notifications });
      qc.invalidateQueries({ queryKey: queryKeys.unreadCount });
    },
  });
}

export function useDeleteNotification() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.delete(`/notifications/${id}`);
      if (!res.success) throw new Error(res.error ?? 'Failed to delete notification');
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.notifications });
      qc.invalidateQueries({ queryKey: queryKeys.unreadCount });
    },
  });
}

export function useBroadcastNotification() {
  return useMutation({
    mutationFn: async (data: { type: string; title: string; body: string; userId?: string }) => {
      const res = await api.post<{ message: string; count: number }>(
        '/notifications/broadcast',
        data,
      );
      if (!res.success) throw new Error(res.error ?? 'Failed to send notification');
      return res.data!;
    },
  });
}
