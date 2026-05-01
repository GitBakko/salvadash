import { useQuery } from '@tanstack/react-query';
import type { AnalyticsData } from '@salvadash/shared';
import { api } from '../../lib/api';
import { queryKeys } from './keys';

export function useAnalytics(accountIds?: string[]) {
  return useQuery({
    queryKey: queryKeys.analytics(accountIds),
    queryFn: async () => {
      const qs =
        accountIds && accountIds.length > 0
          ? `?accountIds=${encodeURIComponent(accountIds.join(','))}`
          : '';
      const res = await api.get<AnalyticsData>(`/data/analytics${qs}`);
      if (!res.success) throw new Error(res.error ?? 'Failed to fetch analytics');
      return res.data!;
    },
  });
}
