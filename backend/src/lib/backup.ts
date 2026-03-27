import { execFile } from 'node:child_process';
import { createReadStream, createWriteStream } from 'node:fs';
import fs from 'node:fs/promises';
import path from 'node:path';
import { pipeline } from 'node:stream/promises';
import { createGzip, createGunzip } from 'node:zlib';
import { config } from '../config/index.js';
import prisma from './prisma.js';

// ─── Helpers ───────────────────────────────────────────────

function getBackupDir(): string {
  return path.resolve(config.backup.dir);
}

async function ensureBackupDir(): Promise<void> {
  await fs.mkdir(getBackupDir(), { recursive: true });
}

function pgDumpArgs(): string[] {
  const url = new URL(process.env.DATABASE_URL ?? '');
  return [
    '--host', url.hostname,
    '--port', url.port || '5432',
    '--username', url.username,
    '--dbname', url.pathname.slice(1),
    '--format', 'plain',
    '--no-owner',
    '--no-privileges',
  ];
}

// ─── Create Backup ─────────────────────────────────────────

export async function createBackup(triggeredBy?: string): Promise<{ id: string; filename: string }> {
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

      const dump = execFile('pg_dump', args, { env, maxBuffer: 500 * 1024 * 1024 });
      const gzip = createGzip({ level: 6 });
      const out = createWriteStream(filepath);

      dump.stdout!.pipe(gzip).pipe(out);

      let stderr = '';
      dump.stderr!.on('data', (chunk) => { stderr += chunk; });

      out.on('finish', resolve);
      dump.on('error', reject);
      out.on('error', reject);
      dump.on('close', (code) => {
        if (code !== 0) reject(new Error(`pg_dump exited with code ${code}: ${stderr}`));
      });
    });

    // Get file size
    const stat = await fs.stat(filepath);

    await prisma.backupLog.update({
      where: { id: log.id },
      data: {
        status: 'COMPLETED',
        sizeBytes: stat.size,
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
      '--host', url.hostname,
      '--port', url.port || '5432',
      '--username', url.username,
      '--dbname', url.pathname.slice(1),
      '--single-transaction',
      '--clean',
      '--if-exists',
    ];
    const env = { ...process.env, PGPASSWORD: url.password };

    const psql = execFile('psql', args, { env, maxBuffer: 500 * 1024 * 1024 });
    const gunzip = createGunzip();
    const input = createReadStream(filepath);

    input.pipe(gunzip).pipe(psql.stdin!);

    let stderr = '';
    psql.stderr!.on('data', (chunk) => { stderr += chunk; });

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

export async function runDbMaintenance(): Promise<{ vacuum: boolean; analyze: boolean; reindex: boolean }> {
  const results = { vacuum: false, analyze: false, reindex: false };

  try {
    await prisma.$executeRawUnsafe('VACUUM ANALYZE');
    results.vacuum = true;
    results.analyze = true;
  } catch (err) {
    console.error('VACUUM ANALYZE failed:', err);
  }

  try {
    const dbName = new URL(process.env.DATABASE_URL ?? '').pathname.slice(1);
    await prisma.$executeRawUnsafe(`REINDEX DATABASE "${dbName}"`);
    results.reindex = true;
  } catch (err) {
    console.error('REINDEX failed:', err);
  }

  return results;
}
