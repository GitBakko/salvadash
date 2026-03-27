import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Request, Response, NextFunction } from 'express';

// Mock prisma before importing
vi.mock('../lib/prisma.js', () => ({
  default: {
    user: {
      findUnique: vi.fn(),
    },
  },
}));

import { authenticate, requireRole } from '../middleware/auth.js';
import { generateAccessToken } from '../lib/auth.js';
import prisma from '../lib/prisma.js';

function mockReq(cookies: Record<string, string> = {}): Request {
  return { cookies } as unknown as Request;
}

function mockRes(): Response {
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  };
  return res as unknown as Response;
}

describe('authenticate middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 if no accessToken cookie', async () => {
    const req = mockReq();
    const res = mockRes();
    const next = vi.fn();

    await authenticate(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: 'Authentication required' }),
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 401 if token is invalid', async () => {
    const req = mockReq({ accessToken: 'bad-token' });
    const res = mockRes();
    const next = vi.fn();

    await authenticate(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: 'Invalid or expired token' }),
    );
  });

  it('returns 401 if user not found', async () => {
    const token = generateAccessToken({ userId: 'user1', role: 'BASE' });
    const req = mockReq({ accessToken: token });
    const res = mockRes();
    const next = vi.fn();

    vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

    await authenticate(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: 'User not found or inactive' }),
    );
  });

  it('returns 401 if user is inactive', async () => {
    const token = generateAccessToken({ userId: 'user1', role: 'BASE' });
    const req = mockReq({ accessToken: token });
    const res = mockRes();
    const next = vi.fn();

    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: 'user1',
      role: 'BASE',
      isActive: false,
    } as any);

    await authenticate(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('sets req.user and calls next if valid', async () => {
    const token = generateAccessToken({ userId: 'user1', role: 'ADMIN' });
    const req = mockReq({ accessToken: token });
    const res = mockRes();
    const next = vi.fn();

    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: 'user1',
      role: 'ADMIN',
      isActive: true,
    } as any);

    await authenticate(req, res, next);
    expect(req.user).toEqual({ userId: 'user1', role: 'ADMIN' });
    expect(next).toHaveBeenCalled();
  });
});

describe('requireRole middleware', () => {
  it('returns 401 if no user on request', () => {
    const req = mockReq() as Request;
    const res = mockRes();
    const next = vi.fn();

    requireRole('ADMIN')(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('returns 403 if role not allowed', () => {
    const req = { ...mockReq(), user: { userId: 'u1', role: 'BASE' } } as unknown as Request;
    const res = mockRes();
    const next = vi.fn();

    requireRole('ADMIN')(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('allows ROOT to bypass any role check', () => {
    const req = { ...mockReq(), user: { userId: 'u1', role: 'ROOT' } } as unknown as Request;
    const res = mockRes();
    const next = vi.fn();

    requireRole('ADMIN')(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it('allows matching role', () => {
    const req = { ...mockReq(), user: { userId: 'u1', role: 'ADMIN' } } as unknown as Request;
    const res = mockRes();
    const next = vi.fn();

    requireRole('ADMIN', 'ROOT')(req, res, next);
    expect(next).toHaveBeenCalled();
  });
});
