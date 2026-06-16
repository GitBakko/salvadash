import { log } from './logger.js';
import { execFile } from 'node:child_process';
import { createReadStream, createWriteStream } from 'node:fs';
import fs from 'node:fs/promises';
import path from 'node:path';
import { pipeline } from 'node:stream/promises';
import { Writable, PassThrough } from 'node:stream';
import { createHash } from 'node:crypto';
import { createGzip, createGunzip } from 'node:zlib';
import { config } from '../config/index.js';
import prisma from './prisma.js';

// A valid gzipped pg_dump is always well above this; anything smaller means the
// dump was truncated or never produced real output.
const MIN_BACKUP_BYTES = 100;
// Sentinel that pg_dump (plain format) writes near the top of every dump.
const DUMP_SENTINEL = 'PostgreSQL database dump';

// ─── Helpers ───────────────────────────────────────────────

function getBackupDir(): string {
  return path.resolve(config.backup.dir);
}

async function ensureBackupDir(): Promise<void> {
  await fs.mkdir(getBackupDir(), { recursive: true });
}

// Resolve PG client binary path. When PG_BIN_PATH is set we use the explicit
// install dir (required on Windows app servers where the DB is on a separate
// host and only client tools are installed). Otherwise we fall back to the
// system PATH, which is fine on dev / single-host deployments.
function pgBin(name: 'pg_dump' | 'psql'): string {
  const dir = config.backup.pgBinPath;
  if (!dir) return name;
  const exe = process.platform === 'win32' ? `${name}.exe` : name;
  return path.join(dir, exe);
}

function pgDumpArgs(): string[] {
  const url = new URL(process.env.DATABASE_URL ?? '');
  return [
    '--host',
    url.hostname,
    '--port',
    url.port || '5432',
    '--username',
    url.username,
    '--dbname',
    url.pathname.slice(1),
    '--format',
    'plain',
    '--no-owner',
    '--no-privileges',
  ];
}

// ─── Verify Backup ─────────────────────────────────────────
// Confirms a freshly written backup is non-trivial in size, is a valid gzip
// stream (decompresses without error), and actually contains a PostgreSQL dump.
// Returns the file size and a sha256 of the compressed file.
export async function verifyBackupFile(
  filepath: string,
): Promise<{ sizeBytes: number; sha256: string }> {
  const stat = await fs.stat(filepath);
  if (stat.size < MIN_BACKUP_BYTES) {
    throw new Error(`Backup file too small (${stat.size} bytes) — likely incomplete`);
  }

  const hash = createHash('sha256');
  const tap = new PassThrough();
  tap.on('data', (chunk: Buffer) => hash.update(chunk));

  let head = '';
  let sawSentinel = false;
  const sink = new Writable({
    write(chunk: Buffer, _enc, cb) {
      if (!sawSentinel) {
        head += chunk.toString('utf8');
        if (head.includes(DUMP_SENTINEL)) sawSentinel = true;
        // Bound memory: keep only the tail that could still hold a split sentinel.
        else if (head.length > 1 << 16) head = head.slice(-DUMP_SENTINEL.length);
      }
      cb();
    },
  });

  // file → tap (hashes compressed bytes) → gunzip (throws on corruption) → sink
  await pipeline(createReadStream(filepath), tap, createGunzip(), sink);

  if (!sawSentinel) {
    throw new Error('Backup content does not look like a PostgreSQL dump');
  }

  return { sizeBytes: stat.size, sha256: hash.digest('hex') };
}

// ─── Create Backup ─────────────────────────────────────────

export async function createBackup(
  triggeredBy?: string,
): Promise<{ id: string; filename: string }> {
  await ensureBackupDir();

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `salvadash-${timestamp}.sql.gz`;
  const filepath = path.join(getBackupDir(), filename);

  // Create backup log entry
  const log = await prisma.backupLog.create({
    data: {
      filename,
      status: 'RUNNING',
      triggeredBy: triggeredBy ?? 'manual',
    },
  });

  try {
    // Run pg_dump and pipe through gzip
    await new Promise<void>((resolve, reject) => {
      const args = pgDumpArgs();
      const env = { ...process.env, PGPASSWORD: new URL(process.env.DATABASE_URL ?? '').password };

      const dump = execFile(pgBin('pg_dump'), args, { env, maxBuffer: 500 * 1024 * 1024 });
      const gzip = createGzip({ level: 6 });
      const out = createWriteStream(filepath);

      dump.stdout!.pipe(gzip).pipe(out);

      let stderr = '';
      dump.stderr!.on('data', (chunk) => {
        stderr += chunk;
      });

      out.on('finish', resolve);
      dump.on('error', reject);
      out.on('error', reject);
      dump.on('close', (code) => {
        if (code !== 0) reject(new Error(`pg_dump exited with code ${code}: ${stderr}`));
      });
    });

    // Verify the dump is complete + restorable before marking it COMPLETED.
    const { sizeBytes } = await verifyBackupFile(filepath);

    await prisma.backupLog.update({
      where: { id: log.id },
      data: {
        status: 'COMPLETED',
        sizeBytes,
        completedAt: new Date(),
      },
    });

    return { id: log.id, filename };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);

    // Cleanup partial file
    await fs.unlink(filepath).catch(() => {});

    await prisma.backupLog.update({
      where: { id: log.id },
      data: { status: 'FAILED', error: message, completedAt: new Date() },
    });

    throw new Error(`Backup failed: ${message}`);
  }
}

// ─── Restore Backup ────────────────────────────────────────

export async function restoreBackup(filename: string): Promise<void> {
  const filepath = path.join(getBackupDir(), filename);

  // Verify file exists
  await fs.access(filepath);

  await new Promise<void>((resolve, reject) => {
    const url = new URL(process.env.DATABASE_URL ?? '');
    const args = [
      '--host',
      url.hostname,
      '--port',
      url.port || '5432',
      '--username',
      url.username,
      '--dbname',
      url.pathname.slice(1),
      '--single-transaction',
      '--clean',
      '--if-exists',
    ];
    const env = { ...process.env, PGPASSWORD: url.password };

    const psql = execFile(pgBin('psql'), args, { env, maxBuffer: 500 * 1024 * 1024 });
    const gunzip = createGunzip();
    const input = createReadStream(filepath);

    input.pipe(gunzip).pipe(psql.stdin!);

    let stderr = '';
    psql.stderr!.on('data', (chunk) => {
      stderr += chunk;
    });

    psql.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`psql restore exited with code ${code}: ${stderr}`));
    });
    psql.on('error', reject);
    input.on('error', reject);
  });
}

// ─── Delete Backup ─────────────────────────────────────────

export async function deleteBackup(id: string): Promise<void> {
  const log = await prisma.backupLog.findUnique({ where: { id } });
  if (!log) throw new Error('Backup not found');

  const filepath = path.join(getBackupDir(), log.filename);
  await fs.unlink(filepath).catch(() => {});
  await prisma.backupLog.delete({ where: { id } });
}

// ─── List Backups ──────────────────────────────────────────

export async function listBackups() {
  return prisma.backupLog.findMany({
    orderBy: { createdAt: 'desc' },
    take: 50,
  });
}

// ─── Download Path ─────────────────────────────────────────

export function getBackupFilePath(filename: string): string {
  return path.join(getBackupDir(), filename);
}

// ─── Retention Cleanup ─────────────────────────────────────

export async function applyRetention(): Promise<number> {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - config.backup.retentionDays);

  const expired = await prisma.backupLog.findMany({
    where: { createdAt: { lt: cutoff }, status: 'COMPLETED' },
  });

  let deleted = 0;
  for (const log of expired) {
    const filepath = path.join(getBackupDir(), log.filename);
    await fs.unlink(filepath).catch(() => {});
    await prisma.backupLog.delete({ where: { id: log.id } });
    deleted++;
  }

  return deleted;
}

// ─── DB Maintenance ────────────────────────────────────────

export async function runDbMaintenance(): Promise<{
  vacuum: boolean;
  analyze: boolean;
  reindex: boolean;
}> {
  const results = { vacuum: false, analyze: false, reindex: false };

  try {
    await prisma.$executeRawUnsafe('VACUUM ANALYZE');
    results.vacuum = true;
    results.analyze = true;
  } catch (err) {
    log.error('VACUUM ANALYZE failed:', err);
  }

  try {
    const dbName = new URL(process.env.DATABASE_URL ?? '').pathname.slice(1);
    await prisma.$executeRawUnsafe(`REINDEX DATABASE "${dbName}"`);
    results.reindex = true;
  } catch (err) {
    log.error('REINDEX failed:', err);
  }

  return results;
}
