import { describe, it, expect, vi } from 'vitest';
import { z } from 'zod';
import { dashboardDataSchema, analyticsDataSchema } from '@salvadash/shared';
import { computeDashboard, computeAnalytics, rawEntryToRow } from '../lib/calculations.js';
import { respondData } from '../lib/http.js';

// ─── Fixtures ───────────────────────────────────────────────
// Built through rawEntryToRow so the shape matches exactly what the route feeds
// the calculation core (entries.map(rawEntryToRow)).

function makeEntry(
  dateStr: string,
  balances: { name: string; amount: number }[],
  incomes: { name: string; amount: number }[] = [],
) {
  return rawEntryToRow({
    id: `entry-${dateStr}`,
    date: new Date(dateStr),
    balances: balances.map((b) => ({
      accountId: `acc-${b.name}`,
      account: { name: b.name, color: null, icon: null, iconUrl: null, sortOrder: 0 },
      amount: b.amount,
    })),
    incomes: incomes.map((inc) => ({
      incomeSourceId: `src-${inc.name}`,
      incomeSource: { name: inc.name },
      amount: inc.amount,
    })),
  });
}

const rows = [
  makeEntry(
    '2025-03-01',
    [{ name: 'Conto A', amount: 15000 }],
    [{ name: 'Stipendio', amount: 2000 }],
  ),
  makeEntry(
    '2025-02-01',
    [{ name: 'Conto A', amount: 13000 }],
    [{ name: 'Stipendio', amount: 1800 }],
  ),
  makeEntry(
    '2025-01-01',
    [{ name: 'Conto A', amount: 12000 }],
    [{ name: 'Stipendio', amount: 1900 }],
  ),
  makeEntry(
    '2024-12-01',
    [{ name: 'Conto A', amount: 11000 }],
    [{ name: 'Stipendio', amount: 1700 }],
  ),
];

// ─── Contract: real calc output matches the shared schema ──

describe('response contract — dashboard', () => {
  it('computeDashboard output satisfies dashboardDataSchema', () => {
    const dashboard = computeDashboard(rows, '2025');
    expect(() => dashboardDataSchema.parse(dashboard)).not.toThrow();
  });

  it('rejects a drifted payload', () => {
    expect(dashboardDataSchema.safeParse({}).success).toBe(false);
  });
});

describe('response contract — analytics', () => {
  it('computeAnalytics output satisfies analyticsDataSchema', () => {
    const analytics = computeAnalytics(rows);
    expect(() => analyticsDataSchema.parse(analytics)).not.toThrow();
  });

  it('rejects a drifted payload', () => {
    expect(analyticsDataSchema.safeParse({ patrimonyOverTime: 'nope' }).success).toBe(false);
  });
});

// ─── respondData helper ─────────────────────────────────────

describe('respondData', () => {
  const schema = z.object({ a: z.number() });

  it('sends the validated envelope on success', () => {
    const res = { json: vi.fn() } as unknown as import('express').Response;
    respondData(res, schema, { a: 1 });
    expect(res.json).toHaveBeenCalledWith({ success: true, data: { a: 1 } });
  });

  it('throws on contract failure outside production (drift caught by CI)', () => {
    const res = { json: vi.fn() } as unknown as import('express').Response;
    // NODE_ENV is "test" under vitest → non-production branch throws.
    expect(() => respondData(res, schema, { a: 'not-a-number' } as never)).toThrow(
      /contract validation failed/i,
    );
    expect(res.json).not.toHaveBeenCalled();
  });
});
