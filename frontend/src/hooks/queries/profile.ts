import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';

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
