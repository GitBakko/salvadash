// Pure replay policy for the offline mutation queue. This is the single source
// of truth for "what do we do with a queued request after an attempt"; the
// service worker (public/sw-sync.js) mirrors these rules inline because a
// classic worker script can't import an ES module. Keep the two in sync — this
// copy is the one under unit test.

export const MAX_SYNC_ATTEMPTS = 5;
const BACKOFF_CAP_MS = 5 * 60 * 1000; // 5 minutes

export type ReplayOutcome = 'success' | 'retry' | 'drop';

/**
 * Classify a replay attempt. `status` is the HTTP status, or `null` for a
 * network/transport failure (fetch rejected).
 * - 2xx → success (remove from queue)
 * - network failure, 408, 429, 5xx → retry (transient)
 * - any other 4xx → drop (a poisoned request that will never succeed; keeping
 *   it would stall the whole queue forever)
 */
export function classifyReplayResponse(status: number | null): ReplayOutcome {
  if (status === null) return 'retry';
  if (status >= 200 && status < 300) return 'success';
  if (status === 408 || status === 429 || status >= 500) return 'retry';
  return 'drop';
}

/** A retryable item that has used up its attempt budget is dropped. */
export function isExhausted(attempts: number): boolean {
  return attempts >= MAX_SYNC_ATTEMPTS;
}

/** Exponential backoff (ms) for the Nth attempt, capped. */
export function nextBackoffMs(attempts: number): number {
  const base = 1000 * 2 ** Math.max(0, attempts - 1);
  return Math.min(base, BACKOFF_CAP_MS);
}

/** Whether an item is due for another attempt at `now`. */
export function isDue(nextAttemptAt: number | undefined, now: number): boolean {
  return nextAttemptAt === undefined || now >= nextAttemptAt;
}

/**
 * Resolve the next state of a queued item after an attempt. Returns whether to
 * remove it (success or permanently failed) and, when kept, the updated
 * attempts/backoff schedule.
 */
export function planNextState(
  status: number | null,
  attempts: number,
  now: number,
): { remove: boolean; dropped: boolean; attempts: number; nextAttemptAt?: number } {
  const outcome = classifyReplayResponse(status);
  if (outcome === 'success') return { remove: true, dropped: false, attempts };
  if (outcome === 'drop') return { remove: true, dropped: true, attempts };

  const nextAttempts = attempts + 1;
  if (isExhausted(nextAttempts)) return { remove: true, dropped: true, attempts: nextAttempts };
  return {
    remove: false,
    dropped: false,
    attempts: nextAttempts,
    nextAttemptAt: now + nextBackoffMs(nextAttempts),
  };
}
