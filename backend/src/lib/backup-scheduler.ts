import cron, { type ScheduledTask } from 'node-cron';
import { createBackup, applyRetention, runDbMaintenance } from '../lib/backup.js';

// ─── Backup Scheduler ──────────────────────────────────────
// Runs daily at 03:00 — creates backup, applies retention, and runs DB maintenance

let backupTask: ScheduledTask | null = null;

export function startBackupScheduler(): void {
  if (backupTask) return;

  // Every day at 03:00
  backupTask = cron.schedule('0 3 * * *', async () => {
    console.log('[backup-scheduler] Starting daily backup...');
    try {
      const result = await createBackup('scheduler');
      console.log(`[backup-scheduler] Backup completed: ${result.filename}`);
    } catch (err) {
      console.error('[backup-scheduler] Backup failed:', err);
    }

    try {
      const deleted = await applyRetention();
      if (deleted > 0) {
        console.log(`[backup-scheduler] Retention cleanup: ${deleted} old backup(s) removed`);
      }
    } catch (err) {
      console.error('[backup-scheduler] Retention cleanup failed:', err);
    }

    try {
      const maintenance = await runDbMaintenance();
      console.log(`[backup-scheduler] DB maintenance: vacuum=${maintenance.vacuum} analyze=${maintenance.analyze} reindex=${maintenance.reindex}`);
    } catch (err) {
      console.error('[backup-scheduler] DB maintenance failed:', err);
    }
  });

  console.log('📦 Backup scheduler started (daily at 03:00)');
}

export function stopBackupScheduler(): void {
  if (backupTask) {
    backupTask.stop();
    backupTask = null;
    console.log('📦 Backup scheduler stopped');
  }
}
