import { describe, it, expect, beforeEach } from 'vitest';
import { getCachedUser, setCachedUser, invalidateUser, clearUserCache } from '../lib/user-cache.js';

describe('user-cache', () => {
  beforeEach(() => clearUserCache());

  it('returns undefined for a miss', () => {
    expect(getCachedUser('nope')).toBeUndefined();
  });

  it('stores and retrieves within the TTL', () => {
    setCachedUser('u1', { role: 'BASE', isActive: true }, 1000);
    expect(getCachedUser('u1', 1000)).toEqual({ role: 'BASE', isActive: true });
    expect(getCachedUser('u1', 1000 + 29_999)).toEqual({ role: 'BASE', isActive: true });
  });

  it('expires after the TTL', () => {
    setCachedUser('u1', { role: 'BASE', isActive: true }, 1000);
    expect(getCachedUser('u1', 1000 + 30_000)).toBeUndefined();
  });

  it('invalidates a single user', () => {
    setCachedUser('u1', { role: 'ADMIN', isActive: true }, 1000);
    invalidateUser('u1');
    expect(getCachedUser('u1', 1000)).toBeUndefined();
  });

  it('clears all entries', () => {
    setCachedUser('a', { role: 'BASE', isActive: true }, 1000);
    setCachedUser('b', { role: 'BASE', isActive: true }, 1000);
    clearUserCache();
    expect(getCachedUser('a', 1000)).toBeUndefined();
    expect(getCachedUser('b', 1000)).toBeUndefined();
  });
});
