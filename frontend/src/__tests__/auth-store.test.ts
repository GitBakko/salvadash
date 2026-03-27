import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useAuthStore } from '../stores/auth-store';

// Mock the api module
vi.mock('../lib/api', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

import { api } from '../lib/api';

describe('useAuthStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset store state
    useAuthStore.setState({
      user: null,
      isLoading: true,
      isAuthenticated: false,
    });
  });

  // ─── Initial state ───────────────────────

  it('has correct initial state', () => {
    const state = useAuthStore.getState();
    expect(state.user).toBeNull();
    expect(state.isAuthenticated).toBe(false);
  });

  // ─── setUser ──────────────────────────────

  describe('setUser', () => {
    it('sets user and isAuthenticated', () => {
      const user = { id: 'u1', name: 'Test', email: 'test@test.com' } as any;
      useAuthStore.getState().setUser(user);

      const state = useAuthStore.getState();
      expect(state.user).toBe(user);
      expect(state.isAuthenticated).toBe(true);
    });

    it('clears user when set to null', () => {
      useAuthStore.getState().setUser(null);
      const state = useAuthStore.getState();
      expect(state.user).toBeNull();
      expect(state.isAuthenticated).toBe(false);
    });
  });

  // ─── fetchUser ────────────────────────────

  describe('fetchUser', () => {
    it('sets user on successful fetch', async () => {
      const user = { id: 'u1', name: 'Test' };
      vi.mocked(api.get).mockResolvedValue({ success: true, data: user });

      await useAuthStore.getState().fetchUser();

      const state = useAuthStore.getState();
      expect(state.user).toEqual(user);
      expect(state.isAuthenticated).toBe(true);
      expect(state.isLoading).toBe(false);
    });

    it('clears user on failed fetch', async () => {
      vi.mocked(api.get).mockResolvedValue({ success: false });

      await useAuthStore.getState().fetchUser();

      const state = useAuthStore.getState();
      expect(state.user).toBeNull();
      expect(state.isAuthenticated).toBe(false);
      expect(state.isLoading).toBe(false);
    });
  });

  // ─── login ────────────────────────────────

  describe('login', () => {
    it('returns success and sets user on valid login', async () => {
      const user = { id: 'u1', name: 'Test' };
      vi.mocked(api.post).mockResolvedValue({ success: true, data: { user } });

      const result = await useAuthStore.getState().login('test@test.com', 'pass');

      expect(result.success).toBe(true);
      expect(useAuthStore.getState().isAuthenticated).toBe(true);
      expect(useAuthStore.getState().user).toEqual(user);
    });

    it('returns error on failed login', async () => {
      vi.mocked(api.post).mockResolvedValue({ success: false, error: 'Invalid credentials' });

      const result = await useAuthStore.getState().login('bad@test.com', 'wrong');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid credentials');
      expect(useAuthStore.getState().isAuthenticated).toBe(false);
    });
  });

  // ─── register ─────────────────────────────

  describe('register', () => {
    it('returns success on valid registration', async () => {
      vi.mocked(api.post).mockResolvedValue({ success: true });

      const result = await useAuthStore.getState().register({
        name: 'Test',
        email: 'test@test.com',
        password: 'Pass1234!',
        confirmPassword: 'Pass1234!',
        inviteCode: 'ABC123',
      });

      expect(result.success).toBe(true);
    });

    it('returns error on failed registration', async () => {
      vi.mocked(api.post).mockResolvedValue({ success: false, error: 'Email taken' });

      const result = await useAuthStore.getState().register({
        name: 'Test',
        email: 'taken@test.com',
        password: 'Pass1234!',
        confirmPassword: 'Pass1234!',
        inviteCode: 'ABC123',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Email taken');
    });
  });

  // ─── logout ───────────────────────────────

  describe('logout', () => {
    it('clears user and isAuthenticated', async () => {
      // First set user
      useAuthStore.setState({ user: { id: 'u1' } as any, isAuthenticated: true });
      vi.mocked(api.post).mockResolvedValue({ success: true });

      await useAuthStore.getState().logout();

      expect(useAuthStore.getState().user).toBeNull();
      expect(useAuthStore.getState().isAuthenticated).toBe(false);
    });
  });
});
