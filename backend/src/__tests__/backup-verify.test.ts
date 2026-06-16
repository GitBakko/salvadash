import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import fs from 'node:fs/promises';
import { createWriteStream } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { randomUUID } from 'node:crypto';
import { createGzip } from 'node:zlib';
import { pipeline } from 'node:stream/promises';
import { Readable } from 'node:stream';

// verifyBackupFile does not touch the DB; mock prisma so importing backup.ts
// doesn't spin up a real client.
vi.mock('../lib/prisma.js', () => ({ default: {} }));

import { verifyBackupFile } from '../lib/backup.js';

const tmpDir = path.join(os.tmpdir(), `salvadash-backup-test-${randomUUID()}`);

async function writeGz(name: string, content: string): Promise<string> {
  const fp = path.join(tmpDir, name);
  await pipeline(Readable.from([content]), createGzip(), createWriteStream(fp));
  return fp;
}

async function writeRaw(name: string, bytes: Buffer): Promise<string> {
  const fp = path.join(tmpDir, name);
  await fs.writeFile(fp, bytes);
  return fp;
}

// A realistic-looking pg_dump (plain format) with the sentinel header.
const VALID_DUMP =
  '--\n-- PostgreSQL database dump\n--\nSET statement_timeout = 0;\n' +
  'CREATE TABLE "User" (id text, name text);\n'.repeat(50);

// Long, low-repetition content (>100 bytes once gzipped) that lacks the sentinel.
const NO_SENTINEL = Array.from(
  { length: 4000 },
  (_, i) => `x${i}=${(i * 2654435761) % 100000}`,
).join(';');

describe('verifyBackupFile', () => {
  beforeAll(async () => {
    await fs.mkdir(tmpDir, { recursive: true });
  });
  afterAll(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it('accepts a valid gzipped pg_dump and returns size + sha256', async () => {
    const fp = await writeGz('valid.sql.gz', VALID_DUMP);
    const result = await verifyBackupFile(fp);
    expect(result.sizeBytes).toBeGreaterThan(100);
    expect(result.sha256).toMatch(/^[0-9a-f]{64}$/);
  });

  it('rejects a valid gzip that is not a PostgreSQL dump', async () => {
    const fp = await writeGz('garbage.sql.gz', NO_SENTINEL);
    await expect(verifyBackupFile(fp)).rejects.toThrow(/PostgreSQL dump/);
  });

  it('rejects a corrupt / non-gzip file', async () => {
    const fp = await writeRaw('corrupt.sql.gz', Buffer.alloc(500, 0x41)); // 'AAAA…'
    await expect(verifyBackupFile(fp)).rejects.toThrow();
  });

  it('rejects a too-small file', async () => {
    const fp = await writeRaw('tiny.sql.gz', Buffer.from([0x1f, 0x8b])); // 2 bytes
    await expect(verifyBackupFile(fp)).rejects.toThrow(/too small/);
  });
});
