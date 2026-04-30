import { useQuery, useMutation } from '@tanstack/react-query';
import type { ChangelogEntry } from '@salvadash/shared';
import { api } from '../../lib/api';
import { queryKeys } from './keys';

export function useChangelog() {
  return useQuery({
    queryKey: queryKeys.changelog,
    queryFn: async () => {
      const res = await api.get<{ version: string; changelog: ChangelogEntry[] }>('/version');
      if (!res.success) throw new Error(res.error ?? 'Failed to fetch changelog');
      return res.data!;
    },
    staleTime: 1000 * 60 * 60, // 1 hour
  });
}

export function useMarkVersionSeen() {
  return useMutation({
    mutationFn: async () => {
      const res = await api.put<{ lastSeenVersion: string }>('/version/seen');
      if (!res.success) throw new Error(res.error ?? 'Failed to mark version seen');
      return res.data!;
    },
  });
}
