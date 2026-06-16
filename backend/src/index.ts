import express, { type Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { pinoHttp } from 'pino-http';
import cookieParser from 'cookie-parser';
import path from 'path';
import { randomUUID } from 'crypto';
import { config } from './config/index.js';
import prisma from './lib/prisma.js';
import { logger, log } from './lib/logger.js';
import { initSentry, flushSentry } from './lib/sentry.js';
import { startBackupScheduler, stopBackupScheduler } from './lib/backup-scheduler.js';
import { apiRateLimit } from './middleware/rate-limit.js';
import { errorHandler, notFoundHandler } from './middleware/error.js';
import { healthHandler } from './middleware/health.js';
import { metricsHandler } from './middleware/metrics.js';

initSentry();

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
app.use(
  pinoHttp({
    logger,
    // Correlate logs across a request; honor an upstream x-request-id if present.
    genReqId: (req) => (req.headers['x-request-id'] as string) || randomUUID(),
  }),
);
app.use(express.json({ limit: '10mb' }));
app.use(cookieParser());

// ─── Static Files (avatars) ───────────────────────────────
app.use('/uploads', express.static(path.resolve(import.meta.dirname, '../uploads')));

// ─── Health Check ──────────────────────────────────────────
app.get('/api/health', healthHandler);

// ─── Metrics (Prometheus) — token-gated, disabled unless METRICS_TOKEN set ──
app.get('/api/metrics', metricsHandler);

// ─── API Routes ────────────────────────────────────────────
import apiRoutes from './routes/index.js';
app.use('/api', apiRateLimit, apiRoutes);

// ─── 404 + Central Error Handler ───────────────────────────
app.use(notFoundHandler);
app.use(errorHandler);

// ─── Start Server ──────────────────────────────────────────
const server = app.listen(config.port, () => {
  log.info(`🚀 SalvaDash API running on port ${config.port}`);
  log.info(`📊 Environment: ${config.nodeEnv}`);
  log.info(`🌐 Frontend URL: ${config.appUrl}`);
  startBackupScheduler();
});

// ─── Graceful Shutdown ─────────────────────────────────────
// On PM2 reload/stop the process gets SIGINT/SIGTERM. Drain in-flight requests,
// stop the backup cron (so no half-written dumps), and close the DB pool before exit.
let shuttingDown = false;
async function shutdown(signal: string): Promise<void> {
  if (shuttingDown) return;
  shuttingDown = true;
  log.info(`\n${signal} received — shutting down gracefully...`);

  // Force-exit guard if cleanup hangs past 10s
  const forceTimer = setTimeout(() => {
    log.error('Graceful shutdown timed out — forcing exit');
    process.exit(1);
  }, 10_000);
  forceTimer.unref();

  try {
    stopBackupScheduler();
    await new Promise<void>((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
    });
    await prisma.$disconnect();
    await flushSentry();
    clearTimeout(forceTimer);
    log.info('Shutdown complete.');
    process.exit(0);
  } catch (err) {
    log.error('Error during shutdown:', err);
    process.exit(1);
  }
}

process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('SIGINT', () => void shutdown('SIGINT'));

// Last-resort safety nets: a stray rejection/exception must not silently wedge prod.
process.on('unhandledRejection', (reason) => {
  log.error('Unhandled promise rejection:', reason);
});
process.on('uncaughtException', (err) => {
  log.error('Uncaught exception:', err);
  void shutdown('uncaughtException');
});

export default app;
