import { Router, type Router as RouterType, type Request, type Response } from 'express';
import fs from 'node:fs/promises';
import { authenticate, requireRole } from '../middleware/auth.js';
import {
  createBackup,
  restoreBackup,
  deleteBackup,
  listBackups,
  getBackupFilePath,
  applyRetention,
  runDbMaintenance,
} from '../lib/backup.js';
import { config } from '../config/index.js';
import prisma from '../lib/prisma.js';

const router: RouterType = Router();

// All backup routes require ADMIN or ROOT role
router.use(authenticate);
router.use(requireRole('ADMIN', 'ROOT'));

// ─── GET /backup — List backups ─────────────────────────────

router.get('/', async (_req: Request, res: Response): Promise<void> => {
  try {
    const backups = await listBackups();
    res.json({ success: true, data: backups });
  } catch (err) {
    console.error('List backups error:', err);
    res.status(500).json({ success: false, error: 'Failed to list backups' });
  }
});

// ─── POST /backup — Create backup now ───────────────────────

router.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await createBackup(req.user!.userId);
    res.json({ success: true, data: result });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Backup failed';
    res.status(500).json({ success: false, error: message });
  }
});

// ─── GET /backup/:id/download — Download backup file ────────

router.get('/:id/download', async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const log = await prisma.backupLog.findUnique({ where: { id } });
    if (!log || log.status !== 'COMPLETED') {
      res.status(404).json({ success: false, error: 'Backup not found' });
      return;
    }

    const filepath = getBackupFilePath(log.filename);
    await fs.access(filepath);

    res.setHeader('Content-Type', 'application/gzip');
    res.setHeader('Content-Disposition', `attachment; filename="${log.filename}"`);

    const { createReadStream } = await import('node:fs');
    const stream = createReadStream(filepath);
    stream.pipe(res);
  } catch (err) {
    console.error('Download backup error:', err);
    res.status(500).json({ success: false, error: 'Download failed' });
  }
});

// ─── POST /backup/:id/restore — Restore from backup ────────

router.post('/:id/restore', async (req: Request, res: Response): Promise<void> => {
  try {
    // Only ROOT can restore
    if (req.user!.role !== 'ROOT') {
      res.status(403).json({ success: false, error: 'Only ROOT can restore backups' });
      return;
    }

    const id = req.params.id as string;
    const log = await prisma.backupLog.findUnique({ where: { id } });
    if (!log || log.status !== 'COMPLETED') {
      res.status(404).json({ success: false, error: 'Backup not found' });
      return;
    }

    await restoreBackup(log.filename);
    res.json({ success: true, message: 'Backup restored successfully' });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Restore failed';
    res.status(500).json({ success: false, error: message });
  }
});

// ─── DELETE /backup/:id — Delete backup ─────────────────────

router.delete('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    await deleteBackup(req.params.id as string);
    res.json({ success: true, message: 'Backup deleted' });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Delete failed';
    res.status(500).json({ success: false, error: message });
  }
});

// ─── POST /backup/retention — Run retention cleanup now ─────

router.post('/retention', async (_req: Request, res: Response): Promise<void> => {
  try {
    const deleted = await applyRetention();
    res.json({ success: true, data: { deleted } });
  } catch (err) {
    console.error('Retention cleanup error:', err);
    res.status(500).json({ success: false, error: 'Retention cleanup failed' });
  }
});

// ─── POST /backup/maintenance — Run DB maintenance ──────────

router.post('/maintenance', async (_req: Request, res: Response): Promise<void> => {
  try {
    const results = await runDbMaintenance();
    res.json({ success: true, data: results });
  } catch (err) {
    console.error('DB maintenance error:', err);
    res.status(500).json({ success: false, error: 'DB maintenance failed' });
  }
});

// ─── GET /backup/config — Get backup config ─────────────────

router.get('/config', async (_req: Request, res: Response): Promise<void> => {
  try {
    res.json({
      success: true,
      data: {
        retentionDays: config.backup.retentionDays,
        cloudEnabled: config.backup.cloudEnabled,
        backupDir: config.backup.dir,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to get config' });
  }
});

export default router;
