// Tiny in-process TTL cache for the per-request auth lookup. `authenticate`
// runs on every API call and previously hit the DB (`user.findUnique`) each
// time; this caches the minimal authz fields for a short window. Mutations that
// change a user's authz state (role/active) must call `invalidateUser` so the
// change takes effect immediately rather than after the TTL.

export interface CachedUser {
  role: string;
  isActive: boolean;
}

// Short by design: access tokens are already short-lived and the security-
// sensitive transitions (deactivation, role change) invalidate explicitly.
const TTL_MS = 30_000;

const cache = new Map<string, { value: CachedUser; expiresAt: number }>();

export function getCachedUser(id: string, now: number = Date.now()): CachedUser | undefined {
  const hit = cache.get(id);
  if (!hit) return undefined;
  if (now >= hit.expiresAt) {
    cache.delete(id);
    return undefined;
  }
  return hit.value;
}

export function setCachedUser(id: string, value: CachedUser, now: number = Date.now()): void {
  cache.set(id, { value, expiresAt: now + TTL_MS });
}

export function invalidateUser(id: string): void {
  cache.delete(id);
}

/** Test-only / full reset of the cache. */
export function clearUserCache(): void {
  cache.clear();
}
