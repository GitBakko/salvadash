import express, { type Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import path from 'path';
import { config } from './config/index.js';
import prisma from './lib/prisma.js';
import { startBackupScheduler, stopBackupScheduler } from './lib/backup-scheduler.js';
import { apiRateLimit } from './middleware/rate-limit.js';

export const app: Express = express();

// Behind the IIS reverse-proxy (ARR, single hop) in prod: trust the first proxy
// so express-rate-limit & req.ip key on the real client IP, not the proxy's.
app.set('trust proxy', 1);

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
app.use('/api', apiRateLimit, apiRoutes);

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
const server = app.listen(config.port, () => {
  console.log(`🚀 SalvaDash API running on port ${config.port}`);
  console.log(`📊 Environment: ${config.nodeEnv}`);
  console.log(`🌐 Frontend URL: ${config.appUrl}`);
  startBackupScheduler();
});

// ─── Graceful Shutdown ─────────────────────────────────────
// On PM2 reload/stop the process gets SIGINT/SIGTERM. Drain in-flight requests,
// stop the backup cron (so no half-written dumps), and close the DB pool before exit.
let shuttingDown = false;
async function shutdown(signal: string): Promise<void> {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`\n${signal} received — shutting down gracefully...`);

  // Force-exit guard if cleanup hangs past 10s
  const forceTimer = setTimeout(() => {
    console.error('Graceful shutdown timed out — forcing exit');
    process.exit(1);
  }, 10_000);
  forceTimer.unref();

  try {
    stopBackupScheduler();
    await new Promise<void>((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
    });
    await prisma.$disconnect();
    clearTimeout(forceTimer);
    console.log('Shutdown complete.');
    process.exit(0);
  } catch (err) {
    console.error('Error during shutdown:', err);
    process.exit(1);
  }
}

process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('SIGINT', () => void shutdown('SIGINT'));

// Last-resort safety nets: a stray rejection/exception must not silently wedge prod.
process.on('unhandledRejection', (reason) => {
  console.error('Unhandled promise rejection:', reason);
});
process.on('uncaughtException', (err) => {
  console.error('Uncaught exception:', err);
  void shutdown('uncaughtException');
});

export default app;
