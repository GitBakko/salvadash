import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { EntryPublic, EntryListItem } from '@salvadash/shared';
import { api } from '../../lib/api';
import { queryKeys } from './keys';

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
