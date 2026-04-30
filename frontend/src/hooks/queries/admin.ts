import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { AdminOverview, AdminUserListItem, AdminUserDetail } from '@salvadash/shared';
import { api } from '../../lib/api';
import { queryKeys } from './keys';

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
