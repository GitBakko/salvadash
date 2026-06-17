import { describe, it, expect, vi } from 'vitest';
import type { Request, Response } from 'express';
import { csrfGuard } from '../middleware/csrf.js';

// config.appUrl defaults to http://localhost:5173 under the test env.
const ALLOWED = 'http://localhost:5173';

function makeReq(method: string, headers: Record<string, string> = {}): Request {
  const lower = Object.fromEntries(Object.entries(headers).map(([k, v]) => [k.toLowerCase(), v]));
  return { method, get: (h: string) => lower[h.toLowerCase()] } as unknown as Request;
}

function makeRes() {
  const res = {} as Response & { status: ReturnType<typeof vi.fn>; json: ReturnType<typeof vi.fn> };
  res.status = vi.fn(() => res);
  res.json = vi.fn(() => res);
  return res;
}

describe('csrfGuard', () => {
  it('lets safe methods through', () => {
    const next = vi.fn();
    const res = makeRes();
    csrfGuard(makeReq('GET'), res, next);
    expect(next).toHaveBeenCalledOnce();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('allows a same-origin state-changing request', () => {
    const next = vi.fn();
    const res = makeRes();
    csrfGuard(makeReq('POST', { origin: ALLOWED }), res, next);
    expect(next).toHaveBeenCalledOnce();
  });

  it('blocks a cross-origin state-changing request', () => {
    const next = vi.fn();
    const res = makeRes();
    csrfGuard(makeReq('POST', { origin: 'http://evil.example' }), res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('falls back to Referer when Origin is absent', () => {
    const okNext = vi.fn();
    csrfGuard(makeReq('POST', { referer: `${ALLOWED}/dashboard` }), makeRes(), okNext);
    expect(okNext).toHaveBeenCalledOnce();

    const badNext = vi.fn();
    const res = makeRes();
    csrfGuard(makeReq('DELETE', { referer: 'http://evil.example/x' }), res, badNext);
    expect(badNext).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('allows requests with no Origin/Referer (non-browser clients)', () => {
    const next = vi.fn();
    csrfGuard(makeReq('POST'), makeRes(), next);
    expect(next).toHaveBeenCalledOnce();
  });
});
