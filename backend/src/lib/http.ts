import type { Request, Response, NextFunction } from 'express';
import type { z } from 'zod';

type AsyncHandler = (req: Request, res: Response, next: NextFunction) => Promise<unknown>;

export function asyncHandler(fn: AsyncHandler) {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
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
