import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { IncomeSourcePublic } from '@salvadash/shared';
import { api } from '../../lib/api';
import { queryKeys } from './keys';

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
