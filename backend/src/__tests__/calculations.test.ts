import { describe, it, expect } from 'vitest';
import { computeDashboard, computeAnalytics, rawEntryToRow } from '../lib/calculations.js';

// ─── Test Fixtures ──────────────────────────────────────────

function makeEntry(dateStr: string, balances: { name: string; amount: number; color?: string }[], incomes: { name: string; amount: number }[] = []) {
  return {
    id: `entry-${dateStr}`,
    date: new Date(dateStr),
    balances: balances.map((b, i) => ({
      id: `bal-${dateStr}-${i}`,
      accountId: `acc-${b.name}`,
      account: { name: b.name, color: b.color ?? null },
      amount: b.amount,
    })),
    incomes: incomes.map((inc, i) => ({
      id: `inc-${dateStr}-${i}`,
      incomeSourceId: `src-${inc.name}`,
      incomeSource: { name: inc.name },
      amount: inc.amount,
    })),
    notes: null,
    createdAt: new Date(dateStr),
    updatedAt: new Date(dateStr),
  };
}

const entries = [
  makeEntry('2025-03-01', [{ name: 'Conto A', amount: 15000 }, { name: 'Conto B', amount: 5000 }], [{ name: 'Stipendio', amount: 2000 }]),
  makeEntry('2025-02-01', [{ name: 'Conto A', amount: 13000 }, { name: 'Conto B', amount: 4500 }], [{ name: 'Stipendio', amount: 1800 }]),
  makeEntry('2025-01-01', [{ name: 'Conto A', amount: 12000 }, { name: 'Conto B', amount: 4000 }], [{ name: 'Stipendio', amount: 1900 }]),
  makeEntry('2024-12-01', [{ name: 'Conto A', amount: 11000 }, { name: 'Conto B', amount: 3500 }], [{ name: 'Stipendio', amount: 1700 }]),
  makeEntry('2024-11-01', [{ name: 'Conto A', amount: 10000 }, { name: 'Conto B', amount: 3000 }], [{ name: 'Stipendio', amount: 1600 }]),
];

// ─── rawEntryToRow ──────────────────────────────────────────

describe('rawEntryToRow', () => {
  it('converts a raw entry to EntryRow format', () => {
    const row = rawEntryToRow(entries[0]);
    expect(row.id).toBe('entry-2025-03-01');
    expect(row.date).toBeInstanceOf(Date);
    expect(row.balances).toHaveLength(2);
    expect(row.balances[0].accountName).toBe('Conto A');
    expect(row.balances[0].amount).toBe(15000);
    expect(row.incomes).toHaveLength(1);
    expect(row.incomes[0].incomeSourceName).toBe('Stipendio');
    expect(row.incomes[0].amount).toBe(2000);
  });

  it('handles Prisma Decimal-like objects', () => {
    const entry = {
      ...entries[0],
      balances: entries[0].balances.map((b: any) => ({
        ...b,
        amount: { toString: () => '15000.50' },
      })),
    };
    const row = rawEntryToRow(entry);
    expect(row.balances[0].amount).toBe(15000.50);
  });
});

// ─── computeDashboard ───────────────────────────────────────

describe('computeDashboard', () => {
  const rows = entries.map(rawEntryToRow);

  it('computes correct currentTotal', () => {
    const result = computeDashboard(rows, '2025');
    expect(result.currentTotal).toBe(20000); // 15000 + 5000
  });

  it('returns currentEntry as first in list', () => {
    const result = computeDashboard(rows, '2025');
    expect(result.currentEntry).not.toBeNull();
    expect(result.currentEntry!.date).toBe('2025-03-01');
    expect(result.currentEntry!.total).toBe(20000);
  });

  it('computes monthlyIncome from latest entry', () => {
    const result = computeDashboard(rows, '2025');
    expect(result.monthlyIncome).toBe(2000);
  });

  it('computes account breakdown correctly', () => {
    const result = computeDashboard(rows, '2025');
    expect(result.accountBreakdown).toHaveLength(2);
    const contoA = result.accountBreakdown.find((a) => a.name === 'Conto A');
    expect(contoA?.amount).toBe(15000);
    expect(contoA?.percent).toBe(75);
  });

  it('generates sparkline data (oldest first)', () => {
    const result = computeDashboard(rows, '2025');
    expect(result.sparklineData.length).toBeLessThanOrEqual(12);
    // Oldest first
    expect(result.sparklineData[0]).toBeLessThanOrEqual(result.sparklineData[result.sparklineData.length - 1]);
  });

  it('computes growthYTD', () => {
    const result = computeDashboard(rows, '2025');
    // Jan: 16000, Mar: 20000 → growth = (20000-16000)/16000 = 25%
    expect(result.growthYTD).toBe(25);
  });

  it('returns yearLabel', () => {
    const result = computeDashboard(rows, '2025');
    expect(result.yearLabel).toBe('2025');
  });

  it('handles empty entries', () => {
    const result = computeDashboard([], '2025');
    expect(result.currentTotal).toBe(0);
    expect(result.currentEntry).toBeNull();
    expect(result.sparklineData).toEqual([]);
  });
});

// ─── computeAnalytics ───────────────────────────────────────

describe('computeAnalytics', () => {
  const rows = entries.map(rawEntryToRow);

  it('computes patrimonyOverTime sorted ascending', () => {
    const result = computeAnalytics(rows);
    expect(result.patrimonyOverTime.length).toBe(5);
    // First should be oldest date
    expect(result.patrimonyOverTime[0].date).toBe('2024-11-01');
    expect(result.patrimonyOverTime[4].date).toBe('2025-03-01');
  });

  it('groups entries by year for yearComparison', () => {
    const result = computeAnalytics(rows);
    expect(result.yearComparison).toHaveProperty('2024');
    expect(result.yearComparison).toHaveProperty('2025');
    expect(result.yearComparison['2024']).toHaveLength(2);
    expect(result.yearComparison['2025']).toHaveLength(3);
  });

  it('finds best and worst months', () => {
    const result = computeAnalytics(rows);
    expect(result.bestMonth.delta).toBeGreaterThan(0);
    expect(result.worstMonth.delta).toBeLessThanOrEqual(result.bestMonth.delta);
  });

  it('computes avgGrowth', () => {
    const result = computeAnalytics(rows);
    expect(typeof result.avgGrowth).toBe('number');
    expect(result.avgGrowth).toBeGreaterThan(0); // all entries grow
  });

  it('computes account breakdown from latest entry', () => {
    const result = computeAnalytics(rows);
    expect(result.accountBreakdown).toHaveLength(2);
    const total = result.accountBreakdown.reduce((sum, a) => sum + a.percent, 0);
    expect(total).toBe(100);
  });

  it('handles empty entries', () => {
    const result = computeAnalytics([]);
    expect(result.patrimonyOverTime).toEqual([]);
    expect(result.yearComparison).toEqual({});
    expect(result.avgGrowth).toBe(0);
  });
});
