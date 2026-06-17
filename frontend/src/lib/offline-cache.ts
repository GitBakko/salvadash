// Write-through + read-on-failure wrapper for read queries. A successful fetch
// is cached; a failed one (typically offline) falls back to the last cached
// value instead of erroring the query. Pure — the caller injects read/write so
// it is trivially unit-testable and decoupled from IndexedDB.

export interface OfflineCacheIO<T> {
  read: () => Promise<T | undefined>;
  write: (value: T) => Promise<void>;
}

export async function withOfflineCache<T>(
  fetcher: () => Promise<T>,
  cache: OfflineCacheIO<T>,
): Promise<T> {
  try {
    const data = await fetcher();
    // Fire-and-forget; a cache write failure must never fail the live request.
    void cache.write(data).catch(() => {});
    return data;
  } catch (err) {
    const cached = await cache.read();
    if (cached !== undefined) return cached;
    throw err;
  }
}
