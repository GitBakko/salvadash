import type { Request, Response, NextFunction } from 'express';
import type { z } from 'zod';

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
