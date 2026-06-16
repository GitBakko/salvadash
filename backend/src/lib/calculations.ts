/**
 * Server-side pure calculation functions for dashboard and analytics.
 * All functions are stateless — they take data in, return results out.
 */

import { toCents, fromCents } from './money.js';

// ─── Types ──────────────────────────────────────────────────

interface EntryRow {
  id: string;
  date: Date;
  balances: {
    accountId: string;
    accountName: string;
    amount: number;
    color: string | null;
    icon: string | null;
    iconUrl: string | null;
    orderIndex: number;
  }[];
  incomes: { incomeSourceId: string; incomeSourceName: string; amount: number }[];
}

// Structural input — accepted by both Prisma payloads and test mocks.
type DecimalLike = number | string | { toString(): string };

export interface RawEntryInput {
  id: string;
  date: Date;
  balances: Array<{
    accountId: string;
    account?: {
      name?: string | null;
      color?: string | null;
      icon?: string | null;
      iconUrl?: string | null;
      sortOrder?: number | null;
    } | null;
    amount: DecimalLike;
  }>;
  incomes: Array<{
    incomeSourceId: string;
    incomeSource?: { name?: string | null } | null;
    amount: DecimalLike;
  }>;
}

// ─── Helpers ────────────────────────────────────────────────

function toNumber(d: DecimalLike): number {
  return typeof d === 'number' ? d : Number(d);
}

export function rawEntryToRow(entry: RawEntryInput): EntryRow {
  return {
    id: entry.id,
    date: entry.date,
    balances: entry.balances.map((b) => ({
      accountId: b.accountId,
      accountName: b.account?.name ?? '',
      amount: toNumber(b.amount),
      color: b.account?.color ?? null,
      icon: b.account?.icon ?? null,
      iconUrl: b.account?.iconUrl ?? null,
      orderIndex: b.account?.sortOrder ?? 0,
    })),
    incomes: entry.incomes.map((i) => ({
      incomeSourceId: i.incomeSourceId,
      incomeSourceName: i.incomeSource?.name ?? '',
      amount: toNumber(i.amount),
    })),
  };
}

// Totals are summed in integer cents so repeated additions stay exact, then
// converted back to euros at the boundary.
function entryTotalCents(row: EntryRow): number {
  return row.balances.reduce((sum, b) => sum + toCents(b.amount), 0);
}

function entryIncomeCents(row: EntryRow): number {
  return row.incomes.reduce((sum, i) => sum + toCents(i.amount), 0);
}

function entryTotal(row: EntryRow): number {
  return fromCents(entryTotalCents(row));
}

function entryTotalIncome(row: EntryRow): number {
  return fromCents(entryIncomeCents(row));
}

// ─── Dashboard Calculations ─────────────────────────────────

export function computeDashboard(
  entries: EntryRow[], // sorted by date DESC (most recent first)
  yearLabel: string,
) {
  // Filter to entries that actually have data (balances with non-zero amounts)
  const filledEntries = entries.filter(
    (e) => e.balances.length > 0 && e.balances.some((b) => b.amount !== 0),
  );

  const currentEntry = filledEntries[0] ?? null;
  const currentTotal = currentEntry ? entryTotal(currentEntry) : 0;

  // Year filter (only entries with data)
  const yearEntries = filledEntries.filter((e) => e.date.getFullYear().toString() === yearLabel);

  // Year end = latest filled entry in that year; year start = earliest
  const yearEndTotal = yearEntries[0] ? entryTotal(yearEntries[0]) : null;
  const yearStartTotal =
    yearEntries.length > 0 ? entryTotal(yearEntries[yearEntries.length - 1]) : null;

  // Monthly income for the latest filled month
  const monthlyIncome = currentEntry ? entryTotalIncome(currentEntry) : 0;

  // Avg monthly delta YTD (computed in cents, then back to euros)
  const yearDeltaCents: number[] = [];
  for (let i = 0; i < yearEntries.length - 1; i++) {
    yearDeltaCents.push(entryTotalCents(yearEntries[i]) - entryTotalCents(yearEntries[i + 1]));
  }
  const avgMonthlyYTD =
    yearDeltaCents.length > 0
      ? fromCents(Math.round(yearDeltaCents.reduce((a, b) => a + b, 0) / yearDeltaCents.length))
      : 0;

  // Best month (highest positive delta)
  let bestMonthAcc: { month: string; deltaCents: number } | null = null;
  for (let i = 0; i < filledEntries.length - 1; i++) {
    const deltaCents = entryTotalCents(filledEntries[i]) - entryTotalCents(filledEntries[i + 1]);
    const month = filledEntries[i].date.toISOString().substring(0, 7);
    if (!bestMonthAcc || deltaCents > bestMonthAcc.deltaCents) {
      bestMonthAcc = { month, deltaCents };
    }
  }
  const bestMonth = bestMonthAcc
    ? { month: bestMonthAcc.month, delta: fromCents(bestMonthAcc.deltaCents) }
    : null;

  // Growth YTD (percent)
  const growthYTD =
    yearStartTotal && yearStartTotal !== 0 && yearEndTotal !== null
      ? Math.round(((yearEndTotal - yearStartTotal) / yearStartTotal) * 10000) / 100
      : 0;

  // Account breakdown (from latest entry)
  const accountBreakdown = currentEntry
    ? currentEntry.balances.map((b) => ({
        accountId: b.accountId,
        name: b.accountName,
        amount: b.amount,
        percent: currentTotal !== 0 ? Math.round((b.amount / currentTotal) * 10000) / 100 : 0,
        color: b.color,
        icon: b.icon,
        iconUrl: b.iconUrl,
        orderIndex: b.orderIndex,
      }))
    : [];

  // Recent entries (last 6)
  const recentEntries = filledEntries.slice(0, 6).map((entry, i) => {
    const totalCents = entryTotalCents(entry);
    const prevCents = filledEntries[i + 1] ? entryTotalCents(filledEntries[i + 1]) : null;
    const delta = prevCents !== null ? fromCents(totalCents - prevCents) : null;
    const deltaPercent =
      prevCents !== null && prevCents !== 0
        ? Math.round(((totalCents - prevCents) / prevCents) * 10000) / 100
        : null;
    return {
      id: entry.id,
      date: entry.date.toISOString().split('T')[0],
      total: fromCents(totalCents),
      totalIncome: entryTotalIncome(entry),
      delta,
      deltaPercent,
    };
  });

  // Sparkline (last 12 totals, oldest first)
  const sparklineData = filledEntries.slice(0, 12).map(entryTotal).reverse();

  return {
    currentTotal,
    currentEntry: recentEntries[0] ?? null,
    yearTotal: yearEndTotal,
    yearLabel,
    monthlyIncome,
    avgMonthlyYTD,
    bestMonth,
    growthYTD,
    accountBreakdown,
    recentEntries,
    sparklineData,
  };
}

// ─── Analytics Calculations ─────────────────────────────────

export interface AnalyticsOptions {
  /** When provided, only balances for these account IDs contribute to totals/breakdowns/deltas. Income is unaffected. */
  accountIds?: string[];
}

export function computeAnalytics(entries: EntryRow[], options: AnalyticsOptions = {}) {
  const accountFilter =
    options.accountIds && options.accountIds.length > 0 ? new Set(options.accountIds) : null;

  // Filter balances per entry when an account filter is active.
  const filtered: EntryRow[] = accountFilter
    ? entries.map((e) => ({
        ...e,
        balances: e.balances.filter((b) => accountFilter.has(b.accountId)),
      }))
    : entries;

  // Sort ascending by date for charts
  const sorted = [...filtered].sort((a, b) => a.date.getTime() - b.date.getTime());

  // Patrimony over time
  const patrimonyOverTime = sorted.map((e) => ({
    date: e.date.toISOString().split('T')[0],
    total: entryTotal(e),
  }));

  // Year comparison: group by year, each year has monthly totals
  const byYear: Record<string, { month: number; total: number }[]> = {};
  for (const entry of sorted) {
    const year = entry.date.getFullYear().toString();
    const month = entry.date.getMonth() + 1;
    if (!byYear[year]) byYear[year] = [];
    byYear[year].push({ month, total: entryTotal(entry) });
  }

  // Account breakdown (latest entry)
  const latest = sorted[sorted.length - 1];
  const latestTotal = latest ? entryTotal(latest) : 0;
  const accountBreakdown = latest
    ? latest.balances.map((b) => ({
        accountId: b.accountId,
        name: b.accountName,
        amount: b.amount,
        percent: latestTotal !== 0 ? Math.round((b.amount / latestTotal) * 10000) / 100 : 0,
        color: b.color,
        icon: b.icon,
        iconUrl: b.iconUrl,
        orderIndex: b.orderIndex,
      }))
    : [];

  // Monthly income breakdown
  const monthlyIncome = sorted.map((e) => ({
    date: e.date.toISOString().split('T')[0],
    sources: e.incomes.map((i) => ({ name: i.incomeSourceName, amount: i.amount })),
  }));

  // Monthly deltas (differences computed in cents to stay exact)
  const deltas: { date: string; delta: number }[] = [];
  const deltaCents: number[] = [];
  for (let i = 1; i < sorted.length; i++) {
    const dc = entryTotalCents(sorted[i]) - entryTotalCents(sorted[i - 1]);
    deltaCents.push(dc);
    deltas.push({ date: sorted[i].date.toISOString().split('T')[0], delta: fromCents(dc) });
  }

  const bestMonth = deltas.reduce<{ date: string; delta: number } | null>(
    (best, d) => (!best || d.delta > best.delta ? d : best),
    null,
  ) ?? { date: '', delta: 0 };

  const worstMonth = deltas.reduce<{ date: string; delta: number } | null>(
    (worst, d) => (!worst || d.delta < worst.delta ? d : worst),
    null,
  ) ?? { date: '', delta: 0 };

  const avgGrowth =
    deltaCents.length > 0
      ? fromCents(Math.round(deltaCents.reduce((a, b) => a + b, 0) / deltaCents.length))
      : 0;

  // Best year (highest absolute growth)
  const yearGrowths: { year: number; growth: number }[] = [];
  for (const [year, points] of Object.entries(byYear)) {
    if (points.length >= 2) {
      const start = points[0].total;
      const end = points[points.length - 1].total;
      yearGrowths.push({
        year: parseInt(year, 10),
        growth: fromCents(toCents(end) - toCents(start)),
      });
    }
  }
  const bestYear = yearGrowths.reduce<{ year: number; growth: number } | null>(
    (best, y) => (!best || y.growth > best.growth ? y : best),
    null,
  ) ?? { year: 0, growth: 0 };

  return {
    patrimonyOverTime,
    yearComparison: byYear,
    accountBreakdown,
    monthlyIncome,
    bestMonth,
    worstMonth,
    avgGrowth,
    bestYear,
  };
}
