import * as Sentry from '@sentry/node';
import { config } from '../config/index.js';

// Error tracking — fully optional. With no SENTRY_DSN set (dev/test/most installs)
// every call here is a no-op, so nothing changes until a DSN is configured.

let enabled = false;

export function initSentry(): void {
  if (!config.sentry.dsn) return;
  Sentry.init({
    dsn: config.sentry.dsn,
    environment: config.nodeEnv,
    tracesSampleRate: config.sentry.tracesSampleRate,
  });
  enabled = true;
}

export function isSentryEnabled(): boolean {
  return enabled;
}

export function captureException(err: unknown): void {
  if (enabled) Sentry.captureException(err);
}

export async function flushSentry(timeoutMs = 2000): Promise<void> {
  if (enabled) await Sentry.close(timeoutMs);
}
