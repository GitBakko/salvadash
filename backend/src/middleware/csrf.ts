import type { Request, Response, NextFunction } from 'express';
import { config } from '../config/index.js';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

function originOf(value: string | undefined): string | undefined {
  if (!value) return undefined;
  try {
    return new URL(value).origin;
  } catch {
    return undefined;
  }
}

const ALLOWED_ORIGIN = originOf(config.appUrl);

/**
 * Origin-based CSRF guard (defense-in-depth on top of `SameSite=strict` cookies
 * and the CORS allow-list). State-changing requests must carry an `Origin` (or,
 * failing that, a `Referer`) whose origin matches the configured app origin.
 *
 * A browser always attaches `Origin` to cross-site state-changing requests, so a
 * forged cross-site call is rejected here. Requests with neither header are
 * non-browser clients (curl, server-to-server), which cannot be weaponised via a
 * victim's browser, so they pass — this keeps API/automation usage working.
 */
export function csrfGuard(req: Request, res: Response, next: NextFunction): void {
  if (SAFE_METHODS.has(req.method)) {
    next();
    return;
  }

  const source = originOf(req.get('origin')) ?? originOf(req.get('referer'));
  if (source === undefined || source === ALLOWED_ORIGIN) {
    next();
    return;
  }

  res.status(403).json({ success: false, error: 'Cross-origin request blocked' });
}
