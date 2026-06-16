import { log } from './logger.js';
import cron, { type ScheduledTask } from 'node-cron';
import { createBackup, applyRetention, runDbMaintenance } from '../lib/backup.js';

// ─── Backup Scheduler ──────────────────────────────────────
// Runs daily at 03:00 — creates backup, applies retention, and runs DB maintenance

let backupTask: ScheduledTask | null = null;

export function startBackupScheduler(): void {
  if (backupTask) return;

  // Every day at 03:00
  backupTask = cron.schedule('0 3 * * *', async () => {
    log.info('[backup-scheduler] Starting daily backup...');
    try {
      const result = await createBackup('scheduler');
      log.info(`[backup-scheduler] Backup completed: ${result.filename}`);
    } catch (err) {
      log.error('[backup-scheduler] Backup failed:', err);
    }

    try {
      const deleted = await applyRetention();
      if (deleted > 0) {
        log.info(`[backup-scheduler] Retention cleanup: ${deleted} old backup(s) removed`);
      }
    } catch (err) {
      log.error('[backup-scheduler] Retention cleanup failed:', err);
    }

    try {
      const maintenance = await runDbMaintenance();
      log.info(
        `[backup-scheduler] DB maintenance: vacuum=${maintenance.vacuum} analyze=${maintenance.analyze} reindex=${maintenance.reindex}`,
      );
    } catch (err) {
      log.error('[backup-scheduler] DB maintenance failed:', err);
    }
  });

  log.info('📦 Backup scheduler started (daily at 03:00)');
}

export function stopBackupScheduler(): void {
  if (backupTask) {
    backupTask.stop();
    backupTask = null;
    log.info('📦 Backup scheduler stopped');
  }
}
