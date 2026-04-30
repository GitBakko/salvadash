import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { InviteCodePublic } from '@salvadash/shared';
import { api } from '../../lib/api';
import { queryKeys } from './keys';

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
