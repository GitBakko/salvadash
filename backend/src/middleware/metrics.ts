import type { Request, Response } from 'express';
import { timingSafeEqual } from 'node:crypto';
import { Registry, collectDefaultMetrics, Gauge } from 'prom-client';
import { APP_VERSION } from '@salvadash/shared';
import { config } from '../config/index.js';

// Prometheus metrics registry: default process/Node metrics + a constant
// app-info gauge labelled with the running version. Metrics are pull-based —
// gathered on each scrape, so there is no background timer to leak.
export const registry = new Registry();
collectDefaultMetrics({ register: registry });

new Gauge({
  name: 'salvadash_app_info',
  help: 'Static app info (always 1), labelled with the running version',
  labelNames: ['version'],
  registers: [registry],
}).set({ version: APP_VERSION }, 1);

function tokenMatches(provided: string, expected: string): boolean {
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  // Length check first — timingSafeEqual throws on length mismatch.
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * Build the `/api/metrics` handler. The endpoint is **disabled (404)** unless a
 * token is configured, and otherwise requires `Authorization: Bearer <token>`
 * so internal process metrics are never exposed unauthenticated.
 */
export function createMetricsHandler(token: string | undefined) {
  return async (req: Request, res: Response): Promise<void> => {
    if (!token) {
      res.status(404).json({ success: false, error: 'Not found' });
      return;
    }

    const header = req.header('authorization') ?? '';
    const provided = header.startsWith('Bearer ') ? header.slice(7) : '';
    if (!provided || !tokenMatches(provided, token)) {
      res.status(401).json({ success: false, error: 'Unauthorized' });
      return;
    }

    res.set('Content-Type', registry.contentType);
    res.send(await registry.metrics());
  };
}

export const metricsHandler = createMetricsHandler(config.metrics.token || undefined);
