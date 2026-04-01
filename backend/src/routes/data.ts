import { Router, type Router as RouterType, type Request, type Response } from 'express';
import * as XLSX from 'xlsx';
import prisma from '../lib/prisma.js';
import { authenticate } from '../middleware/auth.js';
import { requireRole } from '../middleware/auth.js';
import { Prisma } from '../generated/prisma/client.js';
import { rawEntryToRow, computeDashboard, computeAnalytics } from '../lib/calculations.js';

const router: RouterType = Router();

router.use(authenticate);

// ─── Dashboard Data ─────────────────────────────────────────

const entryInclude = {
  balances: { include: { account: { select: { name: true, color: true } } } },
  incomes: { include: { incomeSource: { select: { name: true } } } },
};

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
    console.error('GET /data/dashboard error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// ─── Analytics Data ─────────────────────────────────────────

router.get('/analytics', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;

    const entries = await prisma.monthlyEntry.findMany({
      where: { userId },
      include: entryInclude,
      orderBy: { date: 'desc' },
    });

    const rows = entries.map(rawEntryToRow);
    const analytics = computeAnalytics(rows);

    res.json({ success: true, data: analytics });
  } catch (error) {
    console.error('GET /data/analytics error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// ─── Import Excel ───────────────────────────────────────────

router.post('/import', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;

    if (!req.body?.fileBase64) {
      res.status(400).json({ success: false, error: 'Missing fileBase64 field' });
      return;
    }

    const buffer = Buffer.from(req.body.fileBase64 as string, 'base64');
    const workbook = XLSX.read(buffer, { type: 'buffer' });

    // Get user's accounts and income sources (by name)
    const accounts = await prisma.account.findMany({ where: { userId } });
    const sources = await prisma.incomeSource.findMany({ where: { userId } });
    const accountMap = new Map(accounts.map((a) => [a.name, a.id]));
    const sourceMap = new Map(sources.map((s) => [s.name, s.id]));

    let importedCount = 0;
    let skippedCount = 0;
    const errors: string[] = [];

    for (const sheetName of workbook.SheetNames) {
      const sheet = workbook.Sheets[sheetName];
      if (!sheet) continue;

      const data: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 });
      if (data.length < 2) continue;

      // First row (after headers) contains month labels or dates
      // Each column after A represents a month
      const headerRow = data[0] ?? [];

      for (let col = 1; col < headerRow.length; col++) {
        const rawDate = headerRow[col];
        if (!rawDate) continue;

        // Parse date — could be Excel serial, string, or Date
        let entryDate: Date;
        if (typeof rawDate === 'number') {
          entryDate = XLSX.SSF.parse_date_code(rawDate) as any;
          if (!entryDate || typeof (entryDate as any).y !== 'number') {
            // Use xlsx date parsing
            const d = new Date((rawDate - 25569) * 86400 * 1000);
            entryDate = d;
          } else {
            entryDate = new Date(
              (entryDate as any).y,
              (entryDate as any).m - 1,
              (entryDate as any).d,
            );
          }
        } else if (typeof rawDate === 'string') {
          entryDate = new Date(rawDate);
        } else {
          continue;
        }

        if (isNaN(entryDate.getTime())) {
          errors.push(`Invalid date in sheet "${sheetName}" col ${col}: ${rawDate}`);
          continue;
        }

        // Collect balances and incomes from rows
        const balances: { accountId: string; amount: number }[] = [];
        const incomes: { incomeSourceId: string; amount: number }[] = [];

        for (let row = 1; row < data.length; row++) {
          const label = String(data[row]?.[0] ?? '').trim();
          const value = Number(data[row]?.[col]);
          if (!label || isNaN(value)) continue;

          if (accountMap.has(label)) {
            balances.push({ accountId: accountMap.get(label)!, amount: value });
          } else if (sourceMap.has(label)) {
            incomes.push({ incomeSourceId: sourceMap.get(label)!, amount: value });
          }
        }

        if (balances.length === 0) {
          skippedCount++;
          continue;
        }

        // Check for existing entry on this date
        const existing = await prisma.monthlyEntry.findFirst({
          where: {
            userId,
            date: entryDate,
          },
        });

        if (existing) {
          skippedCount++;
          continue;
        }

        await prisma.monthlyEntry.create({
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

    res.json({
      success: true,
      data: { imported: importedCount, skipped: skippedCount, errors },
    });
  } catch (error) {
    console.error('POST /data/import error:', error);
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
      headers.join(','),
      ...rows.map((row) =>
        row
          .map((val) => {
            const str = String(val);
            return str.includes(',') || str.includes('"') || str.includes('\n')
              ? `"${str.replace(/"/g, '""')}"`
              : str;
          })
          .join(','),
      ),
    ].join('\n');

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="salvadash-export-${new Date().toISOString().split('T')[0]}.csv"`,
    );
    res.send(csvContent);
  } catch (error) {
    console.error('GET /data/export/csv error:', error);
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
    console.error('GET /data/export/json error:', error);
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
    console.error('DELETE /data/reset error:', error);
    res.status(500).json({ success: false, error: 'Reset failed' });
  }
});

export default router;
