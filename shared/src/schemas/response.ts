import { z } from 'zod';
import type { DashboardData, AnalyticsData } from '../types/index.js';

// Runtime schemas for the *computed* API responses (dashboard/analytics).
// These are not derived from DB input — they come out of the pure calculation
// core — so they are the most likely place for a calc↔type drift to slip
// through unnoticed. Each schema is guarded with `satisfies z.ZodType<T>` so a
// mismatch between the schema and the shared TS interface fails `tsc` at build
// time; the backend additionally `safeParse`s the payload at the route boundary
// (see `respondData`) to catch drift at runtime in CI.

const entryListItemSchema = z.object({
  id: z.string(),
  date: z.string(),
  total: z.number(),
  totalIncome: z.number(),
  delta: z.number().nullable(),
  deltaPercent: z.number().nullable(),
});

const accountBreakdownItemSchema = z.object({
  accountId: z.string(),
  name: z.string(),
  amount: z.number(),
  percent: z.number(),
  color: z.string().nullable(),
  icon: z.string().nullable(),
  iconUrl: z.string().nullable(),
  orderIndex: z.number(),
});

export const dashboardDataSchema = z.object({
  currentTotal: z.number(),
  currentEntry: entryListItemSchema.nullable(),
  yearTotal: z.number().nullable(),
  yearLabel: z.string(),
  monthlyIncome: z.number(),
  avgMonthlyYTD: z.number(),
  bestMonth: z.object({ month: z.string(), delta: z.number() }).nullable(),
  growthYTD: z.number(),
  accountBreakdown: z.array(accountBreakdownItemSchema),
  recentEntries: z.array(entryListItemSchema),
  sparklineData: z.array(z.number()),
}) satisfies z.ZodType<DashboardData>;

export const analyticsDataSchema = z.object({
  patrimonyOverTime: z.array(z.object({ date: z.string(), total: z.number() })),
  yearComparison: z.record(z.string(), z.array(z.object({ month: z.number(), total: z.number() }))),
  accountBreakdown: z.array(accountBreakdownItemSchema),
  monthlyIncome: z.array(
    z.object({
      date: z.string(),
      sources: z.array(z.object({ name: z.string(), amount: z.number() })),
    }),
  ),
  bestMonth: z.object({ date: z.string(), delta: z.number() }),
  worstMonth: z.object({ date: z.string(), delta: z.number() }),
  avgGrowth: z.number(),
  bestYear: z.object({ year: z.number(), growth: z.number() }),
}) satisfies z.ZodType<AnalyticsData>;
