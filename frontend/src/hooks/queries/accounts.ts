import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { AccountPublic } from '@salvadash/shared';
import { api } from '../../lib/api';
import { queryKeys } from './keys';
import type { SearchResult } from '../../components/AccountLogoPicker';

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

/**
 * Invalidates every cache that embeds account fields (icon/iconUrl/color/name/amount).
 * Backend response shapes for dashboard, analytics, and entry detail include these
 * fields per-account, so changing an account must refetch those views or stale icons
 * persist until a hard refresh.
 */
function invalidateAccountConsumers(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: queryKeys.accounts });
  qc.invalidateQueries({ queryKey: ['dashboard'] });
  qc.invalidateQueries({ queryKey: ['analytics'] });
  qc.invalidateQueries({ queryKey: ['entries'] });
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
    onSuccess: () => invalidateAccountConsumers(qc),
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
      iconUrl?: string | null;
      color?: string;
      isActive?: boolean;
    }) => {
      const res = await api.put<AccountPublic>(`/accounts/${id}`, data);
      if (!res.success) throw new Error(res.error ?? 'Failed to update account');
      return res.data!;
    },
    onSuccess: () => invalidateAccountConsumers(qc),
  });
}

export function useDeleteAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.delete(`/accounts/${id}`);
      if (!res.success) throw new Error(res.error ?? 'Failed to delete account');
    },
    onSuccess: () => invalidateAccountConsumers(qc),
  });
}

export function useReorderAccounts() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (accounts: { id: string; sortOrder: number }[]) => {
      const res = await api.put('/accounts/reorder', { accounts });
      if (!res.success) throw new Error(res.error ?? 'Failed to reorder');
    },
    onSuccess: () => invalidateAccountConsumers(qc),
  });
}

// ─── Account logo (Brandfetch) ─────────────────────────────

export function useSearchLogo(query: string) {
  return useQuery({
    queryKey: ['logo-search', query] as const,
    queryFn: async () => {
      const res = await api.get<SearchResult[]>(
        `/accounts/search-logo?q=${encodeURIComponent(query)}`,
      );
      if (!res.success) throw new Error(res.error ?? 'Search failed');
      return res.data ?? [];
    },
    enabled: query.trim().length >= 2,
    staleTime: 60_000,
    retry: false,
  });
}

export function useImportLogo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { accountId: string; iconUrl: string }) => {
      const res = await api.post<{ iconUrl: string; color: string }>(
        '/accounts/import-logo',
        input,
      );
      if (!res.success) throw new Error(res.error ?? 'Import failed');
      return res.data!;
    },
    onSuccess: () => invalidateAccountConsumers(qc),
  });
}

export function useDeleteAccountIcon() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (accountId: string) => {
      const res = await api.delete(`/accounts/${accountId}/icon`);
      if (!res.success) throw new Error(res.error ?? 'Failed to clear icon');
    },
    onSuccess: () => invalidateAccountConsumers(qc),
  });
}
