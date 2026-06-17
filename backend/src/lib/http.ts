import type { Request, Response, NextFunction } from 'express';
import type { z } from 'zod';
import { log } from './logger.js';
import { config } from '../config/index.js';

type AsyncHandler = (req: Request, res: Response, next: NextFunction) => Promise<unknown>;

export function asyncHandler(fn: AsyncHandler) {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * Error a route handler can `throw` to produce a specific HTTP response instead
 * of hand-rolling `res.status(...).json(...)`. The central error handler
 * (`middleware/error.ts`) turns it into the standard `{ success, error, details? }`
 * envelope. Use this for *expected* client errors (4xx); let everything else
 * throw normally so it is logged + Sentry-captured as a 500.
 */
export class HttpError extends Error {
  readonly status: number;
  readonly details?: unknown;

  constructor(status: number, message: string, details?: unknown) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
    this.details = details;
  }
}

export function respondValidation<T extends z.ZodTypeAny>(
  res: Response,
  parsed: z.SafeParseReturnType<z.input<T>, z.infer<T>>,
): void {
  if (parsed.success) return;
  res.status(400).json({
    success: false,
    error: 'Validation failed',
    details: parsed.error.flatten(),
  });
}

export function isValidationOk<T extends z.ZodTypeAny>(
  res: Response,
  parsed: z.SafeParseReturnType<z.input<T>, z.infer<T>>,
): parsed is z.SafeParseSuccess<z.infer<T>> {
  if (parsed.success) return true;
  respondValidation(res, parsed);
  return false;
}

/**
 * Send a successful `{ success: true, data }` envelope after validating `data`
 * against the response `schema`. A failure here is *our* bug (calc↔type drift),
 * never the client's, so it is logged — and made loud outside production so the
 * drift is caught by tests/CI. In production we degrade gracefully and send the
 * payload anyway rather than turning a minor schema mismatch into a 500.
 */
export function respondData<T extends z.ZodTypeAny>(
  res: Response,
  schema: T,
  data: z.input<T>,
): void {
  const parsed = schema.safeParse(data);
  if (parsed.success) {
    res.json({ success: true, data: parsed.data });
    return;
  }
  log.error('Response contract validation failed', { issues: parsed.error.issues });
  if (config.nodeEnv !== 'production') {
    throw new Error(`Response contract validation failed: ${JSON.stringify(parsed.error.issues)}`);
  }
  res.json({ success: true, data });
}
