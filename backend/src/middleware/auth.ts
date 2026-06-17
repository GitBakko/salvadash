import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';
import prisma from '../lib/prisma.js';
import { getCachedUser, setCachedUser } from '../lib/user-cache.js';

export interface AuthPayload {
  userId: string;
  role: string;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthPayload;
    }
  }
}

export async function authenticate(req: Request, res: Response, next: NextFunction): Promise<void> {
  const token = req.cookies?.accessToken as string | undefined;
  if (!token) {
    res.status(401).json({ success: false, error: 'Authentication required' });
    return;
  }

  try {
    const payload = jwt.verify(token, config.jwt.accessSecret) as AuthPayload;

    // Short-TTL cache avoids a DB round-trip on every authenticated request.
    // Invalidated explicitly when a user's role/active state changes.
    let cached = getCachedUser(payload.userId);
    if (!cached) {
      const user = await prisma.user.findUnique({
        where: { id: payload.userId },
        select: { id: true, role: true, isActive: true },
      });
      if (!user) {
        res.status(401).json({ success: false, error: 'User not found or inactive' });
        return;
      }
      cached = { role: user.role, isActive: user.isActive };
      setCachedUser(payload.userId, cached);
    }

    if (!cached.isActive) {
      res.status(401).json({ success: false, error: 'User not found or inactive' });
      return;
    }

    req.user = { userId: payload.userId, role: cached.role };
    next();
  } catch {
    res.status(401).json({ success: false, error: 'Invalid or expired token' });
  }
}

export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Authentication required' });
      return;
    }
    if (req.user.role === 'ROOT') {
      next();
      return;
    }
    if (!roles.includes(req.user.role)) {
      res.status(403).json({ success: false, error: 'Insufficient permissions' });
      return;
    }
    next();
  };
}
