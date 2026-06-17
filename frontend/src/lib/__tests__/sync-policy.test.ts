import { describe, it, expect } from 'vitest';
import {
  classifyReplayResponse,
  isExhausted,
  nextBackoffMs,
  isDue,
  planNextState,
  MAX_SYNC_ATTEMPTS,
} from '../sync-policy';

describe('classifyReplayResponse', () => {
  it('treats 2xx as success', () => {
    expect(classifyReplayResponse(200)).toBe('success');
    expect(classifyReplayResponse(201)).toBe('success');
  });

  it('treats network failure and transient statuses as retry', () => {
    expect(classifyReplayResponse(null)).toBe('retry');
    expect(classifyReplayResponse(408)).toBe('retry');
    expect(classifyReplayResponse(429)).toBe('retry');
    expect(classifyReplayResponse(500)).toBe('retry');
    expect(classifyReplayResponse(503)).toBe('retry');
  });

  it('drops poisoned 4xx client errors', () => {
    expect(classifyReplayResponse(400)).toBe('drop');
    expect(classifyReplayResponse(401)).toBe('drop');
    expect(classifyReplayResponse(409)).toBe('drop');
    expect(classifyReplayResponse(422)).toBe('drop');
  });
});

describe('isExhausted', () => {
  it('is true at/after the cap', () => {
    expect(isExhausted(MAX_SYNC_ATTEMPTS - 1)).toBe(false);
    expect(isExhausted(MAX_SYNC_ATTEMPTS)).toBe(true);
    expect(isExhausted(MAX_SYNC_ATTEMPTS + 1)).toBe(true);
  });
});

describe('nextBackoffMs', () => {
  it('grows exponentially and caps at 5 min', () => {
    expect(nextBackoffMs(1)).toBe(1000);
    expect(nextBackoffMs(2)).toBe(2000);
    expect(nextBackoffMs(3)).toBe(4000);
    expect(nextBackoffMs(100)).toBe(5 * 60 * 1000);
  });
});

describe('isDue', () => {
  it('is due when unscheduled or the time has passed', () => {
    expect(isDue(undefined, 1000)).toBe(true);
    expect(isDue(500, 1000)).toBe(true);
    expect(isDue(2000, 1000)).toBe(false);
  });
});

describe('planNextState', () => {
  it('removes on success', () => {
    expect(planNextState(200, 0, 1000)).toEqual({ remove: true, dropped: false, attempts: 0 });
  });

  it('removes + flags dropped on a poisoned 4xx', () => {
    expect(planNextState(400, 0, 1000)).toEqual({ remove: true, dropped: true, attempts: 0 });
  });

  it('keeps + schedules backoff on a transient failure', () => {
    const r = planNextState(null, 0, 1000);
    expect(r.remove).toBe(false);
    expect(r.attempts).toBe(1);
    expect(r.nextAttemptAt).toBe(1000 + 1000);
  });

  it('drops after exhausting the attempt budget', () => {
    const r = planNextState(503, MAX_SYNC_ATTEMPTS - 1, 1000);
    expect(r.remove).toBe(true);
    expect(r.dropped).toBe(true);
    expect(r.attempts).toBe(MAX_SYNC_ATTEMPTS);
  });
});
