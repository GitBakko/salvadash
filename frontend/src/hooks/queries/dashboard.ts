import { useQuery } from '@tanstack/react-query';
import type { DashboardData } from '@salvadash/shared';
import { api } from '../../lib/api';
import { queryKeys } from './keys';

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
