/**
 * Server-side pure calculation functions for dashboard and analytics.
 * All functions are stateless — they take data in, return results out.
 */

// ─── Types ──────────────────────────────────────────────────

interface EntryRow {
  id: string;
  date: Date;
  balances: { accountId: string; accountName: string; amount: number; color: string | null }[];
  incomes: { incomeSourceId: string; incomeSourceName: string; amount: number }[];
}

interface MonthlyPoint {
  date: string; // YYYY-MM-DD
  total: number;
  totalIncome: number;
}

// Structural input — accepted by both Prisma payloads and test mocks.
type DecimalLike = number | string | { toString(): string };

export interface RawEntryInput {
  id: string;
  date: Date;
  balances: Array<{
    accountId: string;
    account?: { name?: string | null; color?: string | null } | null;
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
    })),
    incomes: entry.incomes.map((i) => ({
      incomeSourceId: i.incomeSourceId,
      incomeSourceName: i.incomeSource?.name ?? '',
      amount: toNumber(i.amount),
    })),
  };
}

function entryTotal(row: EntryRow): number {
  return row.balances.reduce((sum, b) => sum + b.amount, 0);
}

function entryTotalIncome(row: EntryRow): number {
  return row.incomes.reduce((sum, i) => sum + i.amount, 0);
}

function toMonthlyPoint(row: EntryRow): MonthlyPoint {
  return {
    date: row.date.toISOString().split('T')[0],
    total: entryTotal(row),
    totalIncome: entryTotalIncome(row),
  };
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

  // Avg monthly delta YTD
  const yearPoints = yearEntries.map(toMonthlyPoint);
  const deltas: number[] = [];
  for (let i = 0; i < yearPoints.length - 1; i++) {
    deltas.push(yearPoints[i].total - yearPoints[i + 1].total);
  }
  const avgMonthlyYTD =
    deltas.length > 0
      ? Math.round((deltas.reduce((a, b) => a + b, 0) / deltas.length) * 100) / 100
      : 0;

  // Best month (highest positive delta)
  let bestMonth: { month: string; delta: number } | null = null;
  for (let i = 0; i < filledEntries.length - 1; i++) {
    const delta = entryTotal(filledEntries[i]) - entryTotal(filledEntries[i + 1]);
    const month = filledEntries[i].date.toISOString().substring(0, 7);
    if (!bestMonth || delta > bestMonth.delta) {
      bestMonth = { month, delta };
    }
  }

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
      }))
    : [];

  // Recent entries (last 6)
  const recentEntries = filledEntries.slice(0, 6).map((entry, i) => {
    const total = entryTotal(entry);
    const prev = filledEntries[i + 1] ? entryTotal(filledEntries[i + 1]) : null;
    const delta = prev !== null ? total - prev : null;
    const deltaPercent =
      prev !== null && prev !== 0 ? Math.round(((total - prev) / prev) * 10000) / 100 : null;
    return {
      id: entry.id,
      date: entry.date.toISOString().split('T')[0],
      total,
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
  const accountFilter = options.accountIds && options.accountIds.length > 0
    ? new Set(options.accountIds)
    : null;

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
        name: b.accountName,
        amount: b.amount,
        percent: latestTotal !== 0 ? Math.round((b.amount / latestTotal) * 10000) / 100 : 0,
        color: b.color,
      }))
    : [];

  // Monthly income breakdown
  const monthlyIncome = sorted.map((e) => ({
    date: e.date.toISOString().split('T')[0],
    sources: e.incomes.map((i) => ({ name: i.incomeSourceName, amount: i.amount })),
  }));

  // Monthly deltas
  const deltas: { date: string; delta: number }[] = [];
  for (let i = 1; i < sorted.length; i++) {
    const delta = entryTotal(sorted[i]) - entryTotal(sorted[i - 1]);
    deltas.push({ date: sorted[i].date.toISOString().split('T')[0], delta });
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
    deltas.length > 0
      ? Math.round((deltas.reduce((sum, d) => sum + d.delta, 0) / deltas.length) * 100) / 100
      : 0;

  // Best year (highest absolute growth)
  const yearGrowths: { year: number; growth: number }[] = [];
  for (const [year, points] of Object.entries(byYear)) {
    if (points.length >= 2) {
      const start = points[0].total;
      const end = points[points.length - 1].total;
      yearGrowths.push({ year: parseInt(year, 10), growth: end - start });
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
