import { describe, it, expect, vi } from 'vitest';
import { withOfflineCache } from '../offline-cache';

describe('withOfflineCache', () => {
  it('returns and caches a successful fetch', async () => {
    const write = vi.fn().mockResolvedValue(undefined);
    const read = vi.fn().mockResolvedValue(undefined);
    const result = await withOfflineCache(() => Promise.resolve(['a']), { read, write });
    expect(result).toEqual(['a']);
    expect(write).toHaveBeenCalledWith(['a']);
    expect(read).not.toHaveBeenCalled();
  });

  it('falls back to the cache when the fetch fails', async () => {
    const result = await withOfflineCache(() => Promise.reject(new Error('offline')), {
      read: () => Promise.resolve(['cached']),
      write: () => Promise.resolve(),
    });
    expect(result).toEqual(['cached']);
  });

  it('rethrows when the fetch fails and there is no cache', async () => {
    await expect(
      withOfflineCache(() => Promise.reject(new Error('offline')), {
        read: () => Promise.resolve(undefined),
        write: () => Promise.resolve(),
      }),
    ).rejects.toThrow('offline');
  });

  it('still returns data when the cache write rejects', async () => {
    const result = await withOfflineCache(() => Promise.resolve('ok'), {
      read: () => Promise.resolve(undefined),
      write: () => Promise.reject(new Error('idb full')),
    });
    expect(result).toBe('ok');
  });
});
