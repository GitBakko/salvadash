import { describe, it, expect, afterEach, afterAll } from 'vitest';
import { randomUUID } from 'node:crypto';
import prisma from '../lib/prisma.js';
import { verifyRefreshToken } from '../lib/auth.js';
import {
  issueRefreshToken,
  rotateRefreshToken,
  revokeRefreshToken,
  RefreshError,
  type RefreshFailReason,
} from '../lib/refresh-tokens.js';

// Real-DB tests for refresh-token rotation/reuse-detection. Gated on the
// dedicated test database (see db-integration.test.ts for the rationale).
const RUN_DB = /salvadash_test/.test(process.env.DATABASE_URL ?? '');

const createdUserIds: string[] = [];

async function makeUser() {
  const tag = randomUUID().slice(0, 8);
  const user = await prisma.user.create({
    data: {
      name: `RT ${tag}`,
      email: `rt-${tag}@example.test`,
      username: `rt-${tag}`,
      passwordHash: 'x',
      role: 'BASE',
    },
  });
  createdUserIds.push(user.id);
  return user;
}

async function rejectionReason(
  p: Promise<unknown>,
): Promise<RefreshFailReason | 'NOT_REFRESH_ERROR'> {
  try {
    await p;
    throw new Error('expected rejection');
  } catch (err) {
    return err instanceof RefreshError ? err.reason : 'NOT_REFRESH_ERROR';
  }
}

describe.skipIf(!RUN_DB)('refresh-token rotation (real Postgres)', () => {
  afterEach(async () => {
    if (createdUserIds.length > 0) {
      await prisma.user.deleteMany({ where: { id: { in: createdUserIds.splice(0) } } });
    }
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('issues a token backed by a stored jti', async () => {
    const user = await makeUser();
    const { token, jti } = await issueRefreshToken({ userId: user.id, role: user.role });
    expect(verifyRefreshToken(token).jti).toBe(jti);
    const row = await prisma.refreshToken.findUnique({ where: { jti } });
    expect(row?.userId).toBe(user.id);
    expect(row?.revokedAt).toBeNull();
  });

  it('rotates: old token revoked + linked to its successor', async () => {
    const user = await makeUser();
    const { token: oldToken, jti: oldJti } = await issueRefreshToken({
      userId: user.id,
      role: user.role,
    });

    const { refreshToken: newToken } = await rotateRefreshToken(oldToken);
    const newJti = verifyRefreshToken(newToken).jti!;

    const oldRow = await prisma.refreshToken.findUnique({ where: { jti: oldJti } });
    const newRow = await prisma.refreshToken.findUnique({ where: { jti: newJti } });
    expect(oldRow?.revokedAt).not.toBeNull();
    expect(oldRow?.replacedBy).toBe(newJti);
    expect(newRow?.revokedAt).toBeNull();

    // The fresh token works for a subsequent rotation.
    await expect(rotateRefreshToken(newToken)).resolves.toBeTruthy();
  });

  it('detects reuse of a rotated token and burns all user tokens', async () => {
    const user = await makeUser();
    const { token: tokenA } = await issueRefreshToken({ userId: user.id, role: user.role });

    const { refreshToken: tokenB } = await rotateRefreshToken(tokenA); // A → B

    // Replaying the already-rotated A is treated as theft.
    expect(await rejectionReason(rotateRefreshToken(tokenA))).toBe('reuse');

    // B (issued legitimately) is now revoked too.
    const active = await prisma.refreshToken.count({
      where: { userId: user.id, revokedAt: null },
    });
    expect(active).toBe(0);
    expect(await rejectionReason(rotateRefreshToken(tokenB))).not.toBe('NOT_REFRESH_ERROR');
  });

  it('logout-revoked token is invalid, not a reuse cascade', async () => {
    const user = await makeUser();
    const { token: kept } = await issueRefreshToken({ userId: user.id, role: user.role });
    const { token: loggedOut } = await issueRefreshToken({ userId: user.id, role: user.role });

    await revokeRefreshToken(loggedOut);

    // Presenting the logged-out token is plain invalid (no successor) ...
    expect(await rejectionReason(rotateRefreshToken(loggedOut))).toBe('invalid');
    // ... and it must NOT have cascaded to the user's other live token.
    await expect(rotateRefreshToken(kept)).resolves.toBeTruthy();
  });

  it('rejects an unknown / forged jti', async () => {
    const user = await makeUser();
    const { token } = await issueRefreshToken({ userId: user.id, role: user.role });
    // Delete the row out from under the token → jti no longer recognised.
    await prisma.refreshToken.deleteMany({ where: { userId: user.id } });
    expect(await rejectionReason(rotateRefreshToken(token))).toBe('invalid');
  });
});
