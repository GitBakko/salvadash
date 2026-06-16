import { log } from '../lib/logger.js';
import { Router, type Router as RouterType, type Request, type Response } from 'express';
import { z } from 'zod';
import * as ExcelJS from 'exceljs';
import prisma from '../lib/prisma.js';
import { authenticate } from '../middleware/auth.js';
import { Prisma } from '../generated/prisma/client.js';
import { rawEntryToRow, computeDashboard, computeAnalytics } from '../lib/calculations.js';
import { entryInclude } from '../lib/entries-shared.js';
import { sheetToMatrix } from '../lib/xlsx-import.js';
import { csvCell } from '../lib/csv-safe.js';
import {
  ImportError,
  decodeImportFile,
  parseAmount,
  isSaneEntryDate,
  MAX_SHEETS,
  MAX_ROWS,
  MAX_COLS,
  MAX_ENTRIES,
} from '../lib/import-guard.js';

const importBodySchema = z.object({ fileBase64: z.string().min(1) });

const router: RouterType = Router();

router.use(authenticate);

router.get('/dashboard', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const year = (req.query.year as string) ?? new Date().getFullYear().toString();

    const entries = await prisma.monthlyEntry.findMany({
      where: { userId },
      include: entryInclude,
      orderBy: { date: 'desc' },
    });

    const rows = entries.map(rawEntryToRow);
    const dashboard = computeDashboard(rows, year);

    res.json({ success: true, data: dashboard });
  } catch (error) {
    log.error('GET /data/dashboard error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// ─── Analytics Data ─────────────────────────────────────────

router.get('/analytics', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;

    const accountIdsParam = (req.query.accountIds as string | undefined)?.trim();
    const accountIds = accountIdsParam
      ? accountIdsParam
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
      : undefined;

    // Verify ownership when filter is provided so users cannot probe other users' account IDs.
    if (accountIds && accountIds.length > 0) {
      const owned = await prisma.account.findMany({
        where: { userId, id: { in: accountIds } },
        select: { id: true },
      });
      if (owned.length !== new Set(accountIds).size) {
        res.status(400).json({ success: false, error: 'One or more account IDs are invalid' });
        return;
      }
    }

    const entries = await prisma.monthlyEntry.findMany({
      where: { userId },
      include: entryInclude,
      orderBy: { date: 'desc' },
    });

    const rows = entries.map(rawEntryToRow);
    const analytics = computeAnalytics(rows, { accountIds });

    res.json({ success: true, data: analytics });
  } catch (error) {
    log.error('GET /data/analytics error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// ─── Import Excel ───────────────────────────────────────────

router.post('/import', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;

    const parsedBody = importBodySchema.safeParse(req.body);
    if (!parsedBody.success) {
      res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: parsedBody.error.flatten(),
      });
      return;
    }

    // Size-capped decode + corrupt-file guard (both → 400, not 500).
    const buf = decodeImportFile(parsedBody.data.fileBase64);
    const workbook = new ExcelJS.Workbook();
    try {
      await workbook.xlsx.load(new Uint8Array(buf).buffer as ArrayBuffer);
    } catch {
      throw new ImportError('Invalid or corrupt Excel file');
    }

    if (workbook.worksheets.length > MAX_SHEETS) {
      throw new ImportError(`Too many worksheets (max ${MAX_SHEETS})`);
    }

    // Resolve the user's accounts and income sources (by name) up front — these
    // are read-only lookups, kept outside the write transaction.
    const accounts = await prisma.account.findMany({ where: { userId } });
    const sources = await prisma.incomeSource.findMany({ where: { userId } });
    const accountMap = new Map(accounts.map((a) => [a.name, a.id]));
    const sourceMap = new Map(sources.map((s) => [s.name, s.id]));

    // All inserts happen in a single transaction: a failure on any month rolls
    // back the whole import instead of leaving a partial write.
    const result = await prisma.$transaction(
      async (tx) => {
        let importedCount = 0;
        let skippedCount = 0;
        const errors: string[] = [];

        for (const sheet of workbook.worksheets) {
          const sheetName = sheet.name;
          const data = sheetToMatrix(sheet);
          if (data.length < 2) continue;
          if (data.length > MAX_ROWS) {
            throw new ImportError(`Sheet "${sheetName}" has too many rows (max ${MAX_ROWS})`);
          }

          // First row holds month labels/dates; each column after A is a month.
          const headerRow = data[0] ?? [];
          if (headerRow.length > MAX_COLS) {
            throw new ImportError(`Sheet "${sheetName}" has too many columns (max ${MAX_COLS})`);
          }

          for (let col = 1; col < headerRow.length; col++) {
            const rawDate = headerRow[col];
            if (!rawDate) continue;

            // exceljs yields a Date for date-formatted cells, otherwise a number
            // (Excel serial) or string.
            let entryDate: Date;
            if (rawDate instanceof Date) {
              entryDate = rawDate;
            } else if (typeof rawDate === 'number') {
              // Excel serial date → ms since Unix epoch (serial epoch 1899-12-30)
              entryDate = new Date(Math.round((rawDate - 25569) * 86400 * 1000));
            } else if (typeof rawDate === 'string') {
              entryDate = new Date(rawDate);
            } else {
              continue;
            }

            if (!isSaneEntryDate(entryDate)) {
              errors.push(`Invalid or out-of-range date in sheet "${sheetName}" col ${col}`);
              continue;
            }

            // Collect balances and incomes from rows, validating each amount.
            const balances: { accountId: string; amount: number }[] = [];
            const incomes: { incomeSourceId: string; amount: number }[] = [];

            for (let row = 1; row < data.length; row++) {
              const label = String(data[row]?.[0] ?? '').trim();
              if (!label) continue;
              const isAccount = accountMap.has(label);
              const isSource = sourceMap.has(label);
              if (!isAccount && !isSource) continue;

              const amount = parseAmount(data[row]?.[col]);
              if (amount === null) {
                if (data[row]?.[col] !== undefined && data[row]?.[col] !== '') {
                  errors.push(`Skipped invalid amount for "${label}" in sheet "${sheetName}"`);
                }
                continue;
              }

              if (isAccount) {
                balances.push({ accountId: accountMap.get(label)!, amount });
              } else {
                incomes.push({ incomeSourceId: sourceMap.get(label)!, amount });
              }
            }

            if (balances.length === 0) {
              skippedCount++;
              continue;
            }

            const existing = await tx.monthlyEntry.findFirst({
              where: { userId, date: entryDate },
            });
            if (existing) {
              skippedCount++;
              continue;
            }

            if (importedCount >= MAX_ENTRIES) {
              throw new ImportError(`Too many entries to import (max ${MAX_ENTRIES})`);
            }

            await tx.monthlyEntry.create({
              data: {
                userId,
                date: entryDate,
                balances: {
                  create: balances.map((b) => ({
                    accountId: b.accountId,
                    amount: new Prisma.Decimal(b.amount),
                  })),
                },
                incomes: {
                  create: incomes.map((i) => ({
                    incomeSourceId: i.incomeSourceId,
                    amount: new Prisma.Decimal(i.amount),
                  })),
                },
              },
            });

            importedCount++;
          }
        }

        return { imported: importedCount, skipped: skippedCount, errors };
      },
      { timeout: 30000, maxWait: 10000 },
    );

    res.json({ success: true, data: result });
  } catch (error) {
    if (error instanceof ImportError) {
      res.status(400).json({ success: false, error: error.message });
      return;
    }
    log.error('POST /data/import error:', error);
    res.status(500).json({ success: false, error: 'Import failed' });
  }
});

// ─── Export CSV ─────────────────────────────────────────────

router.get('/export/csv', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;

    const entries = await prisma.monthlyEntry.findMany({
      where: { userId },
      include: entryInclude,
      orderBy: { date: 'asc' },
    });

    if (entries.length === 0) {
      res.status(404).json({ success: false, error: 'No entries to export' });
      return;
    }

    // Collect all account names and income source names
    const accountNames = new Set<string>();
    const sourceNames = new Set<string>();
    for (const entry of entries) {
      for (const b of entry.balances) accountNames.add(b.account.name);
      for (const i of entry.incomes) sourceNames.add(i.incomeSource.name);
    }

    const sortedAccounts = [...accountNames].sort();
    const sortedSources = [...sourceNames].sort();

    // Build CSV
    const headers = [
      'Date',
      ...sortedAccounts,
      'TOTAL',
      ...sortedSources.map((s) => `Income: ${s}`),
      'Total Income',
      'Notes',
    ];
    const rows = entries.map((entry) => {
      const balanceMap = new Map(entry.balances.map((b) => [b.account.name, Number(b.amount)]));
      const incomeMap = new Map(entry.incomes.map((i) => [i.incomeSource.name, Number(i.amount)]));

      const balanceValues = sortedAccounts.map((name) => balanceMap.get(name) ?? 0);
      const incomeValues = sortedSources.map((name) => incomeMap.get(name) ?? 0);
      const total = balanceValues.reduce((a, b) => a + b, 0);
      const totalIncome = incomeValues.reduce((a, b) => a + b, 0);

      return [
        entry.date.toISOString().split('T')[0],
        ...balanceValues,
        total,
        ...incomeValues,
        totalIncome,
        entry.notes ?? '',
      ];
    });

    const csvContent = [
      headers.map(csvCell).join(','),
      ...rows.map((row) => row.map(csvCell).join(',')),
    ].join('\r\n');

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="salvadash-export-${new Date().toISOString().split('T')[0]}.csv"`,
    );
    res.send(csvContent);
  } catch (error) {
    log.error('GET /data/export/csv error:', error);
    res.status(500).json({ success: false, error: 'Export failed' });
  }
});

// ─── Export JSON (for PDF generation client-side or future server-side) ──

router.get('/export/json', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;

    const entries = await prisma.monthlyEntry.findMany({
      where: { userId },
      include: entryInclude,
      orderBy: { date: 'asc' },
    });

    const rows = entries.map(rawEntryToRow);
    const analytics = computeAnalytics(rows);

    res.json({
      success: true,
      data: {
        entries: rows.map((r) => ({
          date: r.date.toISOString().split('T')[0],
          balances: r.balances,
          incomes: r.incomes,
          total: r.balances.reduce((sum, b) => sum + b.amount, 0),
          totalIncome: r.incomes.reduce((sum, i) => sum + i.amount, 0),
        })),
        analytics,
        exportedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    log.error('GET /data/export/json error:', error);
    res.status(500).json({ success: false, error: 'Export failed' });
  }
});

// ─── Reset All User Data ────────────────────────────────────

router.delete('/reset', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const { confirm } = req.body ?? {};

    if (confirm !== 'RESET_ALL_DATA') {
      res.status(400).json({
        success: false,
        error: 'Missing confirmation. Send { confirm: "RESET_ALL_DATA" }',
      });
      return;
    }

    // Delete in order to respect FK constraints
    await prisma.$transaction([
      prisma.entryIncome.deleteMany({ where: { entry: { userId } } }),
      prisma.entryBalance.deleteMany({ where: { entry: { userId } } }),
      prisma.monthlyEntry.deleteMany({ where: { userId } }),
    ]);

    res.json({ success: true, message: 'All entries deleted' });
  } catch (error) {
    log.error('DELETE /data/reset error:', error);
    res.status(500).json({ success: false, error: 'Reset failed' });
  }
});

export default router;
