import { create } from 'zustand';
import type { UserPublic } from '@salvadash/shared';
import { api } from '../lib/api';

interface AuthState {
  user: UserPublic | null;
  isLoading: boolean;
  isAuthenticated: boolean;

  fetchUser: () => Promise<void>;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (data: {
    name: string;
    email: string;
    password: string;
    confirmPassword: string;
    inviteCode: string;
    language?: string;
    currency?: string;
  }) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  setUser: (user: UserPublic | null) => void;
}

interface ApiErrorResponse {
  success: boolean;
  error?: string;
  details?: unknown;
}

function extractErrorMessage(res: ApiErrorResponse, fallback: string): string {
  const details = res.details as
    | { fieldErrors?: Record<string, string[]>; formErrors?: string[] }
    | undefined;
  if (details?.fieldErrors) {
    const messages = Object.values(details.fieldErrors).flat();
    if (messages.length > 0) return messages.join('. ');
  }
  if (details?.formErrors?.length) return details.formErrors.join('. ');
  return res.error ?? fallback;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: true,
  isAuthenticated: false,

  fetchUser: async () => {
    set({ isLoading: true });
    const res = await api.get<{ user: UserPublic }>('/auth/me');
    if (res.success && res.data?.user) {
      set({ user: res.data.user, isAuthenticated: true, isLoading: false });
    } else {
      set({ user: null, isAuthenticated: false, isLoading: false });
    }
  },

  login: async (email, password) => {
    const res = await api.post<{ user: UserPublic }>('/auth/login', { email, password });
    if (res.success && res.data) {
      set({ user: res.data.user, isAuthenticated: true });
      return { success: true };
    }
    return { success: false, error: extractErrorMessage(res, 'Login failed') };
  },

  register: async (data) => {
    const res = await api.post('/auth/register', data);
    if (res.success) return { success: true };
    return { success: false, error: extractErrorMessage(res, 'Registration failed') };
  },

  logout: async () => {
    await api.post('/auth/logout');
    set({ user: null, isAuthenticated: false });
  },

  setUser: (user) => set({ user, isAuthenticated: !!user }),
}));
