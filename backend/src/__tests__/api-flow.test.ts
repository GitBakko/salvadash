import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import express, { type Express } from 'express';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { randomUUID } from 'node:crypto';
import prisma from '../lib/prisma.js';
import { hashPassword } from '../lib/auth.js';
import apiRoutes from '../routes/index.js';
import { errorHandler, notFoundHandler } from '../middleware/error.js';

// End-to-end-ish flow against a REAL database (no Prisma mock): login →
// create account → create entries → read dashboard/analytics. Exercises the
// auth/accounts/entries/data routes, the auth middleware, and the calculation
// core through the real adapter. Gated on the dedicated test DB.
const RUN_DB = /salvadash_test/.test(process.env.DATABASE_URL ?? '');

function createTestApp(): Express {
  const app = express();
  app.use(express.json({ limit: '10mb' }));
  app.use(cookieParser());
  app.use('/api', apiRoutes);
  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}

const PASSWORD = 'Sup3r-Secret-Pw!';
let userId = '';
const tag = randomUUID().slice(0, 8);
const email = `flow-${tag}@example.test`;

describe.skipIf(!RUN_DB)('API flow (real Postgres)', () => {
  const app = createTestApp();

  beforeAll(async () => {
    const user = await prisma.user.create({
      data: {
        name: `Flow ${tag}`,
        email,
        username: `flow-${tag}`,
        passwordHash: await hashPassword(PASSWORD),
        emailVerified: true,
      },
    });
    userId = user.id;
  });

  afterAll(async () => {
    if (userId) await prisma.user.delete({ where: { id: userId } }).catch(() => {});
    await prisma.$disconnect();
  });

  it('logs in, creates data, and reads back computed dashboard/analytics', async () => {
    const agent = request.agent(app);

    const login = await agent.post('/api/auth/login').send({ email, password: PASSWORD });
    expect(login.status).toBe(200);
    expect(login.headers['set-cookie']).toBeDefined();

    const acct = await agent.post('/api/accounts').send({ name: 'Conto Flow', color: '#112233' });
    expect(acct.status).toBe(201);
    const accountId = acct.body.data.id as string;
    expect(accountId).toBeTruthy();

    const e1 = await agent
      .post('/api/entries')
      .send({ date: '2025-01-01', balances: [{ accountId, amount: 1000 }] });
    expect(e1.status).toBe(201);

    const e2 = await agent
      .post('/api/entries')
      .send({ date: '2025-02-01', balances: [{ accountId, amount: 1500 }] });
    expect(e2.status).toBe(201);

    const dash = await agent.get('/api/data/dashboard?year=2025');
    expect(dash.status).toBe(200);
    expect(dash.body.success).toBe(true);
    expect(dash.body.data.currentTotal).toBe(1500); // latest entry
    expect(dash.body.data.recentEntries).toHaveLength(2);
    const latest = dash.body.data.recentEntries[0];
    expect(latest.total).toBe(1500);
    expect(latest.delta).toBe(500); // 1500 - 1000

    const analytics = await agent.get('/api/data/analytics');
    expect(analytics.status).toBe(200);
    expect(analytics.body.data.patrimonyOverTime).toHaveLength(2);
    expect(analytics.body.data.patrimonyOverTime.map((p: { total: number }) => p.total)).toEqual([
      1000, 1500,
    ]);
  });

  it('rejects unauthenticated access to protected routes', async () => {
    const res = await request(app).get('/api/data/dashboard');
    expect(res.status).toBe(401);
  });
});
