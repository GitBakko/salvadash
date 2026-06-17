import { describe, it, expect, afterAll, afterEach } from 'vitest';
import { randomUUID } from 'node:crypto';
import prisma from '../lib/prisma.js';
import { Prisma } from '../generated/prisma/client.js';

// Real-database integration tests. Unlike the mocked api-integration suite,
// these exercise the actual Prisma client + @prisma/adapter-pg against a live
// PostgreSQL, covering the paths a mock can't: adapter wiring, Decimal(12,2)
// round-tripping, and cascade-delete behaviour.
//
// Guarded so they only run when DATABASE_URL points at the dedicated
// `salvadash_test` database — the default `pnpm test` (dev DB / no DB) skips
// them, so they never touch real data. The name match is deliberately precise
// (not a loose "test" substring) to avoid ever firing against a dev/prod DB.
// CI sets DATABASE_URL to its throwaway `salvadash_test` service, and the CI
// workflow runs `prisma db push` against it before the tests.
const RUN_DB = /salvadash_test/.test(process.env.DATABASE_URL ?? '');

const createdUserIds: string[] = [];

async function makeUser() {
  const tag = randomUUID().slice(0, 8);
  const user = await prisma.user.create({
    data: {
      name: `Test ${tag}`,
      email: `dbtest-${tag}@example.test`,
      username: `dbtest-${tag}`,
      passwordHash: 'x',
    },
  });
  createdUserIds.push(user.id);
  return user;
}

describe.skipIf(!RUN_DB)('db integration (real Postgres)', () => {
  afterEach(async () => {
    // Cascade-delete removes accounts/entries/balances for each created user.
    if (createdUserIds.length > 0) {
      await prisma.user.deleteMany({ where: { id: { in: createdUserIds.splice(0) } } });
    }
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('connects through the pg adapter', async () => {
    const rows = await prisma.$queryRaw<{ ok: number }[]>`SELECT 1 AS ok`;
    expect(Number(rows[0]?.ok)).toBe(1);
  });

  it('round-trips Decimal(12,2) money exactly', async () => {
    const user = await makeUser();
    const account = await prisma.account.create({
      data: { userId: user.id, name: 'Conto Test' },
    });
    const entry = await prisma.monthlyEntry.create({
      data: { userId: user.id, date: new Date('2025-01-01') },
    });
    await prisma.entryBalance.create({
      data: {
        entryId: entry.id,
        accountId: account.id,
        amount: new Prisma.Decimal('1234.56'),
      },
    });

    const read = await prisma.entryBalance.findFirstOrThrow({ where: { entryId: entry.id } });
    expect(read.amount).toBeInstanceOf(Prisma.Decimal);
    expect(read.amount.toString()).toBe('1234.56');
    // A value with a trailing-zero cent that float math would mangle.
    expect(new Prisma.Decimal('0.10').plus('0.20').toString()).toBe('0.3');
  });

  it('cascade-deletes children when a user is removed', async () => {
    const user = await makeUser();
    const account = await prisma.account.create({
      data: { userId: user.id, name: 'Conto Cascade' },
    });
    const entry = await prisma.monthlyEntry.create({
      data: { userId: user.id, date: new Date('2025-02-01') },
    });
    await prisma.entryBalance.create({
      data: { entryId: entry.id, accountId: account.id, amount: new Prisma.Decimal('10.00') },
    });

    await prisma.user.delete({ where: { id: user.id } });
    createdUserIds.pop(); // already gone; keep afterEach cleanup accurate

    const [accounts, entries, balances] = await Promise.all([
      prisma.account.count({ where: { userId: user.id } }),
      prisma.monthlyEntry.count({ where: { userId: user.id } }),
      prisma.entryBalance.count({ where: { entryId: entry.id } }),
    ]);
    expect(accounts).toBe(0);
    expect(entries).toBe(0);
    expect(balances).toBe(0);
  });
});
