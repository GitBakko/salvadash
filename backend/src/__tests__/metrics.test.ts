import { describe, it, expect } from 'vitest';
import express, { type Express } from 'express';
import request from 'supertest';
import { createMetricsHandler } from '../middleware/metrics.js';

function appWith(token: string | undefined): Express {
  const app = express();
  app.get('/api/metrics', createMetricsHandler(token));
  return app;
}

describe('GET /api/metrics', () => {
  it('is disabled (404) when no token is configured', async () => {
    const res = await request(appWith(undefined)).get('/api/metrics');
    expect(res.status).toBe(404);
  });

  it('rejects a missing or wrong bearer token with 401', async () => {
    const app = appWith('s3cret');
    expect((await request(app).get('/api/metrics')).status).toBe(401);
    expect(
      (await request(app).get('/api/metrics').set('Authorization', 'Bearer nope')).status,
    ).toBe(401);
    // Wrong-length token must not throw (timingSafeEqual length guard)
    expect((await request(app).get('/api/metrics').set('Authorization', 'Bearer x')).status).toBe(
      401,
    );
  });

  it('serves Prometheus metrics with the correct token', async () => {
    const res = await request(appWith('s3cret'))
      .get('/api/metrics')
      .set('Authorization', 'Bearer s3cret');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('text/plain');
    expect(res.text).toContain('salvadash_app_info');
    expect(res.text).toContain('process_cpu_user_seconds_total');
  });
});
