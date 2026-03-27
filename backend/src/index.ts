import express, { type Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import path from 'path';
import { config } from './config/index.js';
import prisma from './lib/prisma.js';
import { startBackupScheduler } from './lib/backup-scheduler.js';

export const app: Express = express();

// ─── Middleware ─────────────────────────────────────────────
app.use(helmet());
app.use(
  cors({
    origin: config.appUrl,
    credentials: true,
  }),
);
app.use(morgan(config.nodeEnv === 'development' ? 'dev' : 'combined'));
app.use(express.json({ limit: '10mb' }));
app.use(cookieParser());

// ─── Static Files (avatars) ───────────────────────────────
app.use('/uploads', express.static(path.resolve(import.meta.dirname, '../uploads')));

// ─── Health Check ──────────────────────────────────────────
app.get('/api/health', async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  } catch {
    res.status(503).json({ status: 'error', message: 'Database connection failed' });
  }
});

// ─── API Routes ────────────────────────────────────────────
import apiRoutes from './routes/index.js';
app.use('/api', apiRoutes);

// ─── 404 Handler ───────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ success: false, error: 'Not found' });
});

// ─── Error Handler ─────────────────────────────────────────
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    success: false,
    error: config.nodeEnv === 'development' ? err.message : 'Internal server error',
  });
});

// ─── Start Server ──────────────────────────────────────────
app.listen(config.port, () => {
  console.log(`🚀 SalvaDash API running on port ${config.port}`);
  console.log(`📊 Environment: ${config.nodeEnv}`);
  console.log(`🌐 Frontend URL: ${config.appUrl}`);
  startBackupScheduler();
});

export default app;
