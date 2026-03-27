import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { api } from '../lib/api';

describe('API client', () => {
  const mockFetch = vi.fn();

  beforeEach(() => {
    vi.stubGlobal('fetch', mockFetch);
    mockFetch.mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  // ─── GET requests ────────────────────────

  describe('api.get', () => {
    it('makes GET request with correct URL', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ success: true, data: [1, 2] }),
      });

      const result = await api.get('/accounts');
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/accounts',
        expect.objectContaining({
          method: 'GET',
          credentials: 'include',
        }),
      );
      expect(result).toEqual({ success: true, data: [1, 2] });
    });

    it('returns error on invalid JSON', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.reject(new Error('parse error')),
      });

      const result = await api.get('/bad');
      expect(result).toEqual({ success: false, error: 'Invalid response' });
    });
  });

  // ─── POST requests ───────────────────────

  describe('api.post', () => {
    it('sends JSON body with Content-Type header', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ success: true }),
      });

      await api.post('/auth/login', { email: 'test@test.com', password: 'pass' });

      const [url, config] = mockFetch.mock.calls[0];
      expect(url).toBe('/api/auth/login');
      expect(config.method).toBe('POST');
      expect(config.headers['Content-Type']).toBe('application/json');
      expect(JSON.parse(config.body)).toEqual({ email: 'test@test.com', password: 'pass' });
    });

    it('handles POST without body', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ success: true }),
      });

      await api.post('/auth/logout');
      const config = mockFetch.mock.calls[0][1];
      expect(config.body).toBeUndefined();
    });
  });

  // ─── PUT / DELETE ─────────────────────────

  describe('api.put', () => {
    it('sends PUT with body', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ success: true }),
      });

      await api.put('/accounts/1', { name: 'Updated' });
      expect(mockFetch.mock.calls[0][1].method).toBe('PUT');
    });
  });

  describe('api.delete', () => {
    it('sends DELETE request', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ success: true }),
      });

      await api.delete('/accounts/1');
      expect(mockFetch.mock.calls[0][1].method).toBe('DELETE');
    });
  });

  // ─── Token auto-refresh ──────────────────

  describe('auto-refresh on 401', () => {
    it('refreshes token and retries on 401', async () => {
      // First call: 401
      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          status: 401,
          json: () => Promise.resolve({ success: false }),
        })
        // Refresh call: success
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ success: true }),
        })
        // Retry original: success
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ success: true, data: 'retried' }),
        });

      const result = await api.get('/accounts');
      expect(mockFetch).toHaveBeenCalledTimes(3);
      expect(mockFetch.mock.calls[1][0]).toBe('/api/auth/refresh'); // refresh call
      expect(result).toEqual({ success: true, data: 'retried' });
    });

    it('does NOT refresh for login endpoint', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 401,
        json: () => Promise.resolve({ success: false, error: 'Invalid credentials' }),
      });

      const result = await api.post('/auth/login', { email: 'a', password: 'b' });
      expect(mockFetch).toHaveBeenCalledTimes(1); // No refresh attempt
      expect(result.error).toBe('Invalid credentials');
    });

    it('returns error when refresh fails', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          status: 401,
          json: () => Promise.resolve({ success: false }),
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 401,
          json: () => Promise.resolve({ success: false }),
        }); // refresh fails

      const result = await api.get('/accounts');
      expect(mockFetch).toHaveBeenCalledTimes(2); // original + refresh, no retry
      expect(result.success).toBe(false);
    });
  });
});
