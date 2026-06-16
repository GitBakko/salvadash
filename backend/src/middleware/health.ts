import type { Request, Response } from 'express';
import { APP_VERSION } from '@salvadash/shared';
import prisma from '../lib/prisma.js';

// Liveness + readiness probe. Reports app version and uptime (always available)
// plus a real DB round-trip with its latency. Returns 503 when the DB is
// unreachable so a load balancer / uptime monitor can react.
export async function healthHandler(_req: Request, res: Response): Promise<void> {
  const start = process.hrtime.bigint();
  let dbOk = false;
  let dbLatencyMs: number | null = null;

  try {
    await prisma.$queryRaw`SELECT 1`;
    dbOk = true;
    dbLatencyMs = Math.round((Number(process.hrtime.bigint() - start) / 1e6) * 100) / 100;
  } catch {
    dbOk = false;
  }

  res.status(dbOk ? 200 : 503).json({
    status: dbOk ? 'ok' : 'error',
    version: APP_VERSION,
    uptime: Math.round(process.uptime()),
    timestamp: new Date().toISOString(),
    db: { ok: dbOk, latencyMs: dbLatencyMs },
  });
}
