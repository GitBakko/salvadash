import { describe, it, expect, vi, beforeEach } from 'vitest';
import express, { type Express } from 'express';
import request from 'supertest';

const mockPrisma = vi.hoisted(() => ({ $queryRaw: vi.fn() }));
vi.mock('../lib/prisma.js', () => ({ default: mockPrisma }));

import { healthHandler } from '../middleware/health.js';

function makeApp(): Express {
  const app = express();
  app.get('/api/health', healthHandler);
  return app;
}

describe('GET /api/health', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 200 with version/uptime and db ok when the DB is reachable', async () => {
    mockPrisma.$queryRaw.mockResolvedValue([{ '?column?': 1 }]);

    const res = await request(makeApp()).get('/api/health');

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.db.ok).toBe(true);
    expect(res.body.db.latencyMs).not.toBeNull();
    expect(typeof res.body.version).toBe('string');
    expect(typeof res.body.uptime).toBe('number');
    expect(typeof res.body.timestamp).toBe('string');
  });

  it('returns 503 when the DB round-trip fails', async () => {
    mockPrisma.$queryRaw.mockRejectedValue(new Error('connection refused'));

    const res = await request(makeApp()).get('/api/health');

    expect(res.status).toBe(503);
    expect(res.body.status).toBe('error');
    expect(res.body.db.ok).toBe(false);
    expect(res.body.db.latencyMs).toBeNull();
    // version/uptime are still reported even when the DB is down
    expect(typeof res.body.version).toBe('string');
  });
});
