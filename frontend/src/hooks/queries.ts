import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type {
  AccountPublic,
  AdminOverview,
  AdminUserListItem,
  AdminUserDetail,
  AnalyticsData,
  BackupInfo,
  BackupConfig,
  MaintenanceResult,
  DashboardData,
  EntryPublic,
  EntryListItem,
  InviteCodePublic,
  IncomeSourcePublic,
  NotificationPublic,
} from '@salvadash/shared';
import { api } from '../lib/api';

// ─── Query keys ────────────────────────────────────────────

export const queryKeys = {
  accounts: ['accounts'] as const,
  dashboard: (year: string) => ['dashboard', year] as const,
  entries: (year?: string) => (year ? (['entries', year] as const) : (['entries'] as const)),
  entry: (id: string) => ['entry', id] as const,
  incomeSources: ['incomeSources'] as const,
  analytics: ['analytics'] as const,
  adminOverview: ['admin', 'overview'] as const,
  adminUsers: (search?: string, role?: string) => ['admin', 'users', { search, role }] as const,
  adminUser: (id: string) => ['admin', 'users', id] as const,
  inviteCodes: ['invite-codes'] as const,
  notifications: ['notifications'] as const,
  unreadCount: ['notifications', 'unread-count'] as const,
  backups: ['backups'] as const,
  backupConfig: ['backup', 'config'] as const,
};

// ─── Accounts ──────────────────────────────────────────────

export function useAccounts() {
  return useQuery({
    queryKey: queryKeys.accounts,
    queryFn: async () => {
      const res = await api.get<AccountPublic[]>('/accounts');
      if (!res.success) throw new Error(res.error ?? 'Failed to fetch accounts');
      return res.data!;
    },
  });
}

export function useCreateAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      name: string;
      type: 'MAIN' | 'SUB';
      icon?: string;
      color?: string;
    }) => {
      const res = await api.post<AccountPublic>('/accounts', data);
      if (!res.success) throw new Error(res.error ?? 'Failed to create account');
      return res.data!;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.accounts }),
  });
}

export function useUpdateAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      ...data
    }: {
      id: string;
      name?: string;
      type?: 'MAIN' | 'SUB';
      icon?: string;
      color?: string;
      isActive?: boolean;
    }) => {
      const res = await api.put<AccountPublic>(`/accounts/${id}`, data);
      if (!res.success) throw new Error(res.error ?? 'Failed to update account');
      return res.data!;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.accounts }),
  });
}

export function useDeleteAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.delete(`/accounts/${id}`);
      if (!res.success) throw new Error(res.error ?? 'Failed to delete account');
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.accounts }),
  });
}

export function useReorderAccounts() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (accounts: { id: string; sortOrder: number }[]) => {
      const res = await api.put('/accounts/reorder', { accounts });
      if (!res.success) throw new Error(res.error ?? 'Failed to reorder');
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.accounts }),
  });
}

// ─── Dashboard ─────────────────────────────────────────────

export function useDashboard(year: string) {
  return useQuery({
    queryKey: queryKeys.dashboard(year),
    queryFn: async () => {
      const res = await api.get<DashboardData>(`/data/dashboard?year=${year}`);
      if (!res.success) throw new Error(res.error ?? 'Failed to fetch dashboard');
      return res.data!;
    },
  });
}

// ─── Entries ───────────────────────────────────────────────

export interface EntriesResponse {
  success: boolean;
  data: EntryListItem[];
  total: number;
  page: number;
  limit: number;
}

export function useEntries(year?: string, page = 1, limit = 50) {
  return useQuery({
    queryKey: [...queryKeys.entries(year), page] as const,
    queryFn: async () => {
      const params = new URLSearchParams();
      if (year) params.set('year', year);
      params.set('page', String(page));
      params.set('limit', String(limit));
      const res = await api.get<EntryListItem[]>(`/entries?${params}`);
      return res as unknown as EntriesResponse;
    },
  });
}

export function useEntry(id: string) {
  return useQuery({
    queryKey: queryKeys.entry(id),
    queryFn: async () => {
      const res = await api.get<EntryPublic>(`/entries/${id}`);
      if (!res.success) throw new Error(res.error ?? 'Failed to fetch entry');
      return res.data!;
    },
    enabled: !!id,
  });
}

export function useCreateEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      date: string;
      balances: { accountId: string; amount: number }[];
      incomes?: { incomeSourceId: string; amount: number }[];
      notes?: string;
    }) => {
      const res = await api.post<EntryPublic>('/entries', data);
      if (!res.success) throw new Error(res.error ?? 'Failed to create entry');
      return res.data!;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['entries'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useUpdateEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      ...data
    }: {
      id: string;
      date?: string;
      balances?: { accountId: string; amount: number }[];
      incomes?: { incomeSourceId: string; amount: number }[];
      notes?: string;
    }) => {
      const res = await api.put<EntryPublic>(`/entries/${id}`, data);
      if (!res.success) throw new Error(res.error ?? 'Failed to update entry');
      return res.data!;
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ['entries'] });
      qc.invalidateQueries({ queryKey: queryKeys.entry(variables.id) });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useDeleteEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.delete(`/entries/${id}`);
      if (!res.success) throw new Error(res.error ?? 'Failed to delete entry');
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['entries'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

// ─── Income Sources ────────────────────────────────────────

export function useIncomeSources() {
  return useQuery({
    queryKey: queryKeys.incomeSources,
    queryFn: async () => {
      const res = await api.get<IncomeSourcePublic[]>('/income-sources');
      if (!res.success) throw new Error(res.error ?? 'Failed to fetch income sources');
      return res.data!;
    },
  });
}

export function useCreateIncomeSource() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: { name: string }) => {
      const res = await api.post<IncomeSourcePublic>('/income-sources', data);
      if (!res.success) throw new Error(res.error ?? 'Failed to create income source');
      return res.data!;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.incomeSources }),
  });
}

export function useUpdateIncomeSource() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...data }: { id: string; name?: string; isActive?: boolean }) => {
      const res = await api.put<IncomeSourcePublic>(`/income-sources/${id}`, data);
      if (!res.success) throw new Error(res.error ?? 'Failed to update income source');
      return res.data!;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.incomeSources }),
  });
}

export function useDeleteIncomeSource() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.delete(`/income-sources/${id}`);
      if (!res.success) throw new Error(res.error ?? 'Failed to delete income source');
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.incomeSources }),
  });
}

// ─── Analytics ─────────────────────────────────────────────

export function useAnalytics() {
  return useQuery({
    queryKey: queryKeys.analytics,
    queryFn: async () => {
      const res = await api.get<AnalyticsData>('/data/analytics');
      if (!res.success) throw new Error(res.error ?? 'Failed to fetch analytics');
      return res.data!;
    },
  });
}

// ─── Admin ─────────────────────────────────────────────────

export function useAdminOverview() {
  return useQuery({
    queryKey: queryKeys.adminOverview,
    queryFn: async () => {
      const res = await api.get<AdminOverview>('/admin/overview');
      if (!res.success) throw new Error(res.error ?? 'Failed to fetch admin overview');
      return res.data!;
    },
  });
}

export interface AdminUsersResponse {
  success: boolean;
  data: AdminUserListItem[];
  total: number;
  page: number;
  limit: number;
}

export function useAdminUsers(search = '', role = '', page = 1) {
  return useQuery({
    queryKey: [...queryKeys.adminUsers(search, role), page] as const,
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (role) params.set('role', role);
      params.set('page', String(page));
      const res = await api.get<AdminUserListItem[]>(`/admin/users?${params}`);
      return res as unknown as AdminUsersResponse;
    },
  });
}

export function useAdminUser(id: string) {
  return useQuery({
    queryKey: queryKeys.adminUser(id),
    queryFn: async () => {
      const res = await api.get<AdminUserDetail>(`/admin/users/${id}`);
      if (!res.success) throw new Error(res.error ?? 'Failed to fetch user');
      return res.data!;
    },
    enabled: !!id,
  });
}

export function useAdminUpdateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      ...data
    }: {
      id: string;
      role?: 'ADMIN' | 'BASE';
      isActive?: boolean;
    }) => {
      const res = await api.put(`/admin/users/${id}`, data);
      if (!res.success) throw new Error(res.error ?? 'Failed to update user');
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin'] });
    },
  });
}

export function useAdminDeleteUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.delete(`/admin/users/${id}`);
      if (!res.success) throw new Error(res.error ?? 'Failed to delete user');
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin'] });
    },
  });
}

// ─── Invite Codes ──────────────────────────────────────────

export function useInviteCodes() {
  return useQuery({
    queryKey: queryKeys.inviteCodes,
    queryFn: async () => {
      const res = await api.get<InviteCodePublic[]>('/invite-codes');
      if (!res.success) throw new Error(res.error ?? 'Failed to fetch invite codes');
      return res.data!;
    },
  });
}

export function useCreateInviteCode() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (code?: string) => {
      const res = await api.post<InviteCodePublic>('/invite-codes', code ? { code } : {});
      if (!res.success) throw new Error(res.error ?? 'Failed to create invite code');
      return res.data!;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.inviteCodes }),
  });
}

export function useDeleteInviteCode() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.delete(`/invite-codes/${id}`);
      if (!res.success) throw new Error(res.error ?? 'Failed to delete invite code');
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.inviteCodes }),
  });
}

// ─── Notifications ─────────────────────────────────────────

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

// ─── Profile ───────────────────────────────────────────────

export function useUpdateProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: { name?: string; language?: string; currency?: string }) => {
      const res = await api.put<{ user: import('@salvadash/shared').UserPublic }>(
        '/auth/profile',
        data,
      );
      if (!res.success) throw new Error(res.error ?? 'Failed to update profile');
      return res.data!.user;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      qc.invalidateQueries({ queryKey: ['analytics'] });
    },
  });
}

export function useChangePassword() {
  return useMutation({
    mutationFn: async (data: {
      currentPassword: string;
      newPassword: string;
      confirmPassword: string;
    }) => {
      const res = await api.put<{ message: string }>('/auth/change-password', data);
      if (!res.success) throw new Error(res.error ?? 'Failed to change password');
      return res.data!;
    },
  });
}

export function useChangeEmail() {
  return useMutation({
    mutationFn: async (data: { newEmail: string; password: string }) => {
      const res = await api.put<{ user: import('@salvadash/shared').UserPublic }>(
        '/auth/change-email',
        data,
      );
      if (!res.success) throw new Error(res.error ?? 'Failed to change email');
      return res.data!.user;
    },
  });
}

export function useUploadAvatar() {
  return useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('avatar', file);
      const res = await api.post<{ user: import('@salvadash/shared').UserPublic }>(
        '/auth/avatar',
        formData,
      );
      if (!res.success) throw new Error(res.error ?? 'Failed to upload avatar');
      return res.data!.user;
    },
  });
}

export function useDeleteAvatar() {
  return useMutation({
    mutationFn: async () => {
      const res = await api.delete<{ user: import('@salvadash/shared').UserPublic }>(
        '/auth/avatar',
      );
      if (!res.success) throw new Error(res.error ?? 'Failed to delete avatar');
      return res.data!.user;
    },
  });
}

// ─── Backup ────────────────────────────────────────────────

export function useBackups() {
  return useQuery({
    queryKey: queryKeys.backups,
    queryFn: async () => {
      const res = await api.get<BackupInfo[]>('/backup');
      if (!res.success) throw new Error(res.error ?? 'Failed to fetch backups');
      return res.data!;
    },
  });
}

export function useBackupConfig() {
  return useQuery({
    queryKey: queryKeys.backupConfig,
    queryFn: async () => {
      const res = await api.get<BackupConfig>('/backup/config');
      if (!res.success) throw new Error(res.error ?? 'Failed to fetch backup config');
      return res.data!;
    },
  });
}

export function useCreateBackup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const res = await api.post<{ id: string; filename: string }>('/backup');
      if (!res.success) throw new Error(res.error ?? 'Backup failed');
      return res.data!;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.backups }),
  });
}

export function useDeleteBackup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.delete(`/backup/${id}`);
      if (!res.success) throw new Error(res.error ?? 'Failed to delete backup');
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.backups }),
  });
}

export function useRestoreBackup() {
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.post(`/backup/${id}/restore`);
      if (!res.success) throw new Error(res.error ?? 'Restore failed');
    },
  });
}

export function useRunRetention() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const res = await api.post<{ deleted: number }>('/backup/retention');
      if (!res.success) throw new Error(res.error ?? 'Retention failed');
      return res.data!;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.backups }),
  });
}

export function useRunMaintenance() {
  return useMutation({
    mutationFn: async () => {
      const res = await api.post<MaintenanceResult>('/backup/maintenance');
      if (!res.success) throw new Error(res.error ?? 'Maintenance failed');
      return res.data!;
    },
  });
}

// ─── Data Management ───────────────────────────────────────

export function useResetData() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const res = await api.delete('/data/reset', { confirm: 'RESET_ALL_DATA' });
      if (!res.success) throw new Error(res.error ?? 'Failed to reset data');
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['entries'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      qc.invalidateQueries({ queryKey: ['analytics'] });
    },
  });
}
