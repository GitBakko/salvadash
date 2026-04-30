import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { BackupInfo, BackupConfig, MaintenanceResult } from '@salvadash/shared';
import { api } from '../../lib/api';
import { queryKeys } from './keys';

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
