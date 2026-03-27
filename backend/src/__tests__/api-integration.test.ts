import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express, { type Express } from 'express';
import cookieParser from 'cookie-parser';
import { generateAccessToken } from '../lib/auth.js';

// ─── Mock Prisma (hoisted so vi.mock factory can reference it) ──

const mockPrisma = vi.hoisted(() => ({
  user: { findUnique: vi.fn(), findMany: vi.fn(), count: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
  account: { findMany: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn(), aggregate: vi.fn() },
  entry: { findMany: vi.fn(), findUnique: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn(), count: vi.fn() },
  monthlyEntry: { findMany: vi.fn(), findUnique: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn(), count: vi.fn() },
  incomeSource: { findMany: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn(), createMany: vi.fn() },
  inviteCode: { findUnique: vi.fn(), findMany: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
  notification: { findMany: vi.fn(), findUnique: vi.fn(), create: vi.fn(), update: vi.fn(), updateMany: vi.fn(), delete: vi.fn(), count: vi.fn() },
  backupLog: { findMany: vi.fn(), findUnique: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
  pushSubscription: { findMany: vi.fn(), findUnique: vi.fn(), create: vi.fn(), delete: vi.fn(), deleteMany: vi.fn() },
  $transaction: vi.fn(),
  $queryRaw: vi.fn(),
  $executeRawUnsafe: vi.fn(),
}));

vi.mock('../lib/prisma.js', () => ({ default: mockPrisma }));
vi.mock('../lib/email-templates.js', () => ({
  sendVerificationEmail: vi.fn().mockResolvedValue(undefined),
  sendPasswordResetEmail: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('../lib/push.js', () => ({
  sendPushToUser: vi.fn().mockResolvedValue(undefined),
  sendPushToUsers: vi.fn().mockResolvedValue(undefined),
}));

// ─── Test App Setup ─────────────────────────────────────────

import apiRoutes from '../routes/index.js';

function createTestApp(): Express {
  const app = express();
  app.use(express.json({ limit: '10mb' }));
  app.use(cookieParser());
  app.use('/api', apiRoutes);
  return app;
}

function authCookies(userId: string, role: string): string {
  const token = generateAccessToken({ userId, role });
  return `accessToken=${token}`;
}

// ─── Tests ──────────────────────────────────────────────────

describe('API Integration Tests', () => {
  let app: Express;

  beforeEach(() => {
    vi.clearAllMocks();
    app = createTestApp();
  });

  // ─── Auth Routes ────────────────────────────────────────

  describe('POST /api/auth/login', () => {
    it('returns 400 on invalid input', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'bad', password: '' });
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('returns 401 on wrong email', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'no@user.com', password: 'password123' });
      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/auth/me', () => {
    it('returns 401 without token', async () => {
      const res = await request(app).get('/api/auth/me');
      expect(res.status).toBe(401);
    });

    it('returns user profile with valid token', async () => {
      mockPrisma.user.findUnique
        .mockResolvedValueOnce({ id: 'u1', role: 'BASE', isActive: true }) // authenticate middleware
        .mockResolvedValueOnce({
          id: 'u1', name: 'Test', email: 'test@test.com', username: 'test',
          role: 'BASE', language: 'it', currency: 'EUR', emailVerified: true,
          isActive: true, createdAt: new Date(),
        });

      const res = await request(app)
        .get('/api/auth/me')
        .set('Cookie', authCookies('u1', 'BASE'));
      expect(res.status).toBe(200);
      expect(res.body.data.user.id).toBe('u1');
    });
  });

  // ─── Accounts Routes ───────────────────────────────────

  describe('GET /api/accounts', () => {
    it('returns 401 without auth', async () => {
      const res = await request(app).get('/api/accounts');
      expect(res.status).toBe(401);
    });

    it('returns accounts list', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'u1', role: 'BASE', isActive: true });
      mockPrisma.account.findMany.mockResolvedValue([
        { id: 'a1', name: 'Conto A', type: 'MAIN', icon: null, color: null, isActive: true, sortOrder: 0 },
      ]);

      const res = await request(app)
        .get('/api/accounts')
        .set('Cookie', authCookies('u1', 'BASE'));
      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].name).toBe('Conto A');
    });
  });

  describe('POST /api/accounts', () => {
    it('creates account', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'u1', role: 'BASE', isActive: true });
      mockPrisma.account.aggregate.mockResolvedValue({ _max: { sortOrder: null } });
      mockPrisma.account.create.mockResolvedValue({
        id: 'a2', name: 'New Bank', type: 'MAIN', icon: null, color: null, isActive: true, sortOrder: 0,
      });

      const res = await request(app)
        .post('/api/accounts')
        .set('Cookie', authCookies('u1', 'BASE'))
        .send({ name: 'New Bank', type: 'MAIN' });
      expect(res.status).toBe(201);
      expect(res.body.data.name).toBe('New Bank');
    });

    it('rejects invalid input', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'u1', role: 'BASE', isActive: true });

      const res = await request(app)
        .post('/api/accounts')
        .set('Cookie', authCookies('u1', 'BASE'))
        .send({ name: '', type: 'MAIN' });
      expect(res.status).toBe(400);
    });
  });

  // ─── Income Sources Routes ─────────────────────────────

  describe('GET /api/income-sources', () => {
    it('returns income sources list', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'u1', role: 'BASE', isActive: true });
      mockPrisma.incomeSource.findMany.mockResolvedValue([
        { id: 's1', name: 'Stipendio', isActive: true, sortOrder: 0 },
      ]);

      const res = await request(app)
        .get('/api/income-sources')
        .set('Cookie', authCookies('u1', 'BASE'));
      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
    });
  });

  // ─── Notifications Routes ──────────────────────────────

  describe('GET /api/notifications', () => {
    it('returns 401 without auth', async () => {
      const res = await request(app).get('/api/notifications');
      expect(res.status).toBe(401);
    });

    it('returns notifications list', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'u1', role: 'BASE', isActive: true });
      mockPrisma.notification.findMany.mockResolvedValue([]);

      const res = await request(app)
        .get('/api/notifications')
        .set('Cookie', authCookies('u1', 'BASE'));
      expect(res.status).toBe(200);
      expect(res.body.data).toEqual([]);
    });
  });

  describe('GET /api/notifications/unread-count', () => {
    it('returns unread count', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'u1', role: 'BASE', isActive: true });
      mockPrisma.notification.count.mockResolvedValue(5);

      const res = await request(app)
        .get('/api/notifications/unread-count')
        .set('Cookie', authCookies('u1', 'BASE'));
      expect(res.status).toBe(200);
      expect(res.body.data.count).toBe(5);
    });
  });

  // ─── Admin Routes ──────────────────────────────────────

  describe('GET /api/admin/overview', () => {
    it('returns 403 for BASE user', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'u1', role: 'BASE', isActive: true });

      const res = await request(app)
        .get('/api/admin/overview')
        .set('Cookie', authCookies('u1', 'BASE'));
      expect(res.status).toBe(403);
    });

    it('returns overview for ADMIN', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'u1', role: 'ADMIN', isActive: true });
      mockPrisma.user.count
        .mockResolvedValueOnce(5)   // totalUsers
        .mockResolvedValueOnce(2);  // activeUsers30d
      mockPrisma.monthlyEntry.count.mockResolvedValue(100);
      mockPrisma.monthlyEntry.findMany.mockResolvedValue([]);

      const res = await request(app)
        .get('/api/admin/overview')
        .set('Cookie', authCookies('u1', 'ADMIN'));
      expect(res.status).toBe(200);
      expect(res.body.data).toHaveProperty('totalUsers');
    });
  });

  describe('GET /api/admin/users', () => {
    it('returns paginated user list for ADMIN', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'u1', role: 'ADMIN', isActive: true });
      mockPrisma.user.findMany.mockResolvedValue([]);
      mockPrisma.user.count.mockResolvedValue(0);

      const res = await request(app)
        .get('/api/admin/users')
        .set('Cookie', authCookies('u1', 'ADMIN'));
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('total');
    });
  });

  // ─── Backup Routes ─────────────────────────────────────

  describe('GET /api/backup', () => {
    it('returns 403 for BASE user', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'u1', role: 'BASE', isActive: true });

      const res = await request(app)
        .get('/api/backup')
        .set('Cookie', authCookies('u1', 'BASE'));
      expect(res.status).toBe(403);
    });

    it('returns backups list for ADMIN', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'u1', role: 'ADMIN', isActive: true });
      mockPrisma.backupLog.findMany.mockResolvedValue([]);

      const res = await request(app)
        .get('/api/backup')
        .set('Cookie', authCookies('u1', 'ADMIN'));
      expect(res.status).toBe(200);
      expect(res.body.data).toEqual([]);
    });
  });

  describe('GET /api/backup/config', () => {
    it('returns backup config for ADMIN', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'u1', role: 'ADMIN', isActive: true });

      const res = await request(app)
        .get('/api/backup/config')
        .set('Cookie', authCookies('u1', 'ADMIN'));
      expect(res.status).toBe(200);
      expect(res.body.data).toHaveProperty('retentionDays');
      expect(res.body.data).toHaveProperty('cloudEnabled');
    });
  });

  // ─── Invite Codes Routes ───────────────────────────────

  describe('GET /api/invite-codes', () => {
    it('returns 403 for BASE user', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'u1', role: 'BASE', isActive: true });

      const res = await request(app)
        .get('/api/invite-codes')
        .set('Cookie', authCookies('u1', 'BASE'));
      expect(res.status).toBe(403);
    });

    it('returns invite codes for ADMIN', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'u1', role: 'ADMIN', isActive: true });
      mockPrisma.inviteCode.findMany.mockResolvedValue([]);

      const res = await request(app)
        .get('/api/invite-codes')
        .set('Cookie', authCookies('u1', 'ADMIN'));
      expect(res.status).toBe(200);
    });
  });

  // ─── Push Routes ───────────────────────────────────────

  describe('GET /api/push/vapid-key', () => {
    it('returns vapid public key', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'u1', role: 'BASE', isActive: true });

      const res = await request(app)
        .get('/api/push/vapid-key')
        .set('Cookie', authCookies('u1', 'BASE'));
      expect(res.status).toBe(200);
      expect(res.body.data).toHaveProperty('publicKey');
    });
  });

  // ─── 404 & Edge Cases ─────────────────────────────────

  describe('Edge Cases', () => {
    it('non-existent route under /api returns meaningful error or 404', async () => {
      const res = await request(app).get('/api/nonexistent');
      // Could be 404 from router or 401 from auth — depends on route structure
      expect([401, 404]).toContain(res.status);
    });

    it('inactive user cannot authenticate', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'u1', role: 'BASE', isActive: false });

      const res = await request(app)
        .get('/api/accounts')
        .set('Cookie', authCookies('u1', 'BASE'));
      expect(res.status).toBe(401);
    });

    it('expired/tampered token returns 401', async () => {
      const res = await request(app)
        .get('/api/accounts')
        .set('Cookie', 'accessToken=bad.token.here');
      expect(res.status).toBe(401);
    });
  });
});
