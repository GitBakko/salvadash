import type { Request, Response, NextFunction } from 'express';
import { log } from '../lib/logger.js';
import { config } from '../config/index.js';
import { HttpError } from '../lib/http.js';

// Shared 404 + central error handler. Mounted last in `index.ts` (and in the
// integration-test app) so any route that `throw`s — directly or via a rejected
// async handler wrapped in `asyncHandler` — lands here instead of being
// swallowed by per-route try/catch boilerplate.

/** Catch-all for unmatched routes. */
export function notFoundHandler(_req: Request, res: Response): void {
  res.status(404).json({ success: false, error: 'Not found' });
}

/**
 * Central error handler. Express identifies it by its 4-arg signature, so
 * `_next` must stay even though it is unused.
 */
export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  // If the response already started streaming there is nothing safe to send;
  // hand off to Express' default handler which will close the connection.
  if (res.headersSent) {
    _next(err);
    return;
  }

  // Expected client errors carry their own status/details and are NOT reported
  // to Sentry (they are normal 4xx outcomes, not incidents).
  if (err instanceof HttpError) {
    res.status(err.status).json({
      success: false,
      error: err.message,
      ...(err.details !== undefined ? { details: err.details } : {}),
    });
    return;
  }

  // Anything else is unexpected: log it (which forwards real Errors to Sentry)
  // and return an opaque 500 — leaking internals only in development.
  log.error('Unhandled error:', err);
  res.status(500).json({
    success: false,
    error:
      config.nodeEnv === 'development' && err instanceof Error
        ? err.message
        : 'Internal server error',
  });
}
