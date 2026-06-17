import { randomUUID } from 'node:crypto';
import jwt from 'jsonwebtoken';
import prisma from './prisma.js';
import { generateRefreshToken, verifyRefreshToken } from './auth.js';
import { log } from './logger.js';
import type { AuthPayload } from '../middleware/auth.js';
import type { Prisma } from '../generated/prisma/client.js';

// Accepts either the root client or a transaction client — both expose the
// `refreshToken` delegate used here.
type DbClient = typeof prisma | Prisma.TransactionClient;

export type RefreshFailReason = 'invalid' | 'expired' | 'reuse' | 'inactive';

/** Thrown when a refresh token is rejected; `reason` distinguishes the cause. */
export class RefreshError extends Error {
  readonly reason: RefreshFailReason;
  constructor(reason: RefreshFailReason) {
    super(`Refresh token rejected: ${reason}`);
    this.name = 'RefreshError';
    this.reason = reason;
  }
}

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Issue a refresh token: persist its `jti` (with the JWT's own expiry) and
 * return the signed token. Opportunistically prunes the user's expired rows.
 */
export async function issueRefreshToken(
  payload: AuthPayload,
  client: DbClient = prisma,
): Promise<{ token: string; jti: string }> {
  const jti = randomUUID();
  const token = generateRefreshToken(payload, jti);
  const decoded = jwt.decode(token) as { exp?: number } | null;
  const expiresAt = decoded?.exp
    ? new Date(decoded.exp * 1000)
    : new Date(Date.now() + SEVEN_DAYS_MS);

  await client.refreshToken.deleteMany({
    where: { userId: payload.userId, expiresAt: { lt: new Date() } },
  });
  await client.refreshToken.create({ data: { jti, userId: payload.userId, expiresAt } });
  return { token, jti };
}

/**
 * Validate the presented refresh token and rotate it: the old `jti` is revoked
 * and a fresh token issued. Presenting an already-revoked `jti` is treated as
 * theft and revokes every token for that user.
 */
export async function rotateRefreshToken(
  oldToken: string,
): Promise<{ payload: AuthPayload; refreshToken: string }> {
  let jti: string | undefined;
  try {
    jti = verifyRefreshToken(oldToken).jti;
  } catch {
    throw new RefreshError('invalid');
  }
  // Legacy tokens minted before rotation existed carry no jti → force re-login.
  if (!jti) throw new RefreshError('invalid');

  const currentJti = jti;

  const record = await prisma.refreshToken.findUnique({ where: { jti: currentJti } });
  if (!record) throw new RefreshError('invalid');

  if (record.revokedAt) {
    // A token already rotated (has a successor) being presented again means the
    // chain forked → presumed theft → burn every token for the user. This burn
    // runs OUTSIDE the rotation transaction so it commits even though we throw.
    // A token revoked without a successor (logout/admin) is merely invalid.
    if (record.replacedBy) {
      await prisma.refreshToken.updateMany({
        where: { userId: record.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      log.warn('Refresh token reuse detected — revoked all tokens for user', {
        userId: record.userId,
      });
      throw new RefreshError('reuse');
    }
    throw new RefreshError('invalid');
  }

  if (record.expiresAt.getTime() < Date.now()) throw new RefreshError('expired');

  // Happy path is transactional: revoke-old + issue-new commit together (or not
  // at all). The in-tx re-read guards against a concurrent rotation of the same
  // jti racing past the checks above.
  return prisma.$transaction(async (tx) => {
    const fresh = await tx.refreshToken.findUnique({ where: { jti: currentJti } });
    if (!fresh || fresh.revokedAt) throw new RefreshError('invalid');

    const user = await tx.user.findUnique({
      where: { id: fresh.userId },
      select: { id: true, role: true, isActive: true },
    });
    if (!user || !user.isActive) throw new RefreshError('inactive');

    const payload: AuthPayload = { userId: user.id, role: user.role };
    const issued = await issueRefreshToken(payload, tx);
    await tx.refreshToken.update({
      where: { jti: currentJti },
      data: { revokedAt: new Date(), replacedBy: issued.jti },
    });

    return { payload, refreshToken: issued.token };
  });
}

/** Best-effort revoke for logout. Unknown/invalid tokens are silently ignored. */
export async function revokeRefreshToken(token: string): Promise<void> {
  let jti: string | undefined;
  try {
    jti = verifyRefreshToken(token).jti;
  } catch {
    return;
  }
  if (!jti) return;
  await prisma.refreshToken.updateMany({
    where: { jti, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}
