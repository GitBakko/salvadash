import { createLazyFileRoute } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  AreaChart,
  Area,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import type { AnalyticsData } from '@salvadash/shared';
import { useAnalytics, useAccounts } from '../hooks/queries';
import { usePrefersReducedMotion } from '../hooks/use-prefers-reduced-motion';
import { Card, Skeleton } from '../components/ui';
import { Delta } from '../components/ui/Delta';
import { fmtCurrency, fmtCurrencyCompact } from '../lib/format';
import { formatMonthShort, formatMonthLong } from '../lib/intl';
import { BarChart3, Filter } from 'lucide-react';
import { AccountFilterBar } from '../components/AccountFilterBar';
import { AccountIcon } from '../components/AccountIcon';
import {
  AccountSortControl,
  sortAccounts,
  type SortMode,
  type SortDir,
} from '../components/AccountSortControl';
import { chartPalette, yearPalette, brandColor, readVar } from '../lib/theme-vars';

export const Route = createLazyFileRoute('/analytics')({
  component: AnalyticsPage,
});

// ─── Custom Tooltip ────────────────────────────────────────

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-border-default bg-surface-card-solid/95 backdrop-blur-md p-3 shadow-lg min-w-[140px]">
      <p className="text-text-muted text-[11px] font-medium mb-1.5">{label}</p>
      <div className="space-y-1">
        {payload.map((p: any, i: number) => (
          <div key={i} className="flex items-center gap-2">
            <span
              className="w-2 h-2 rounded-full shrink-0"
              style={{ backgroundColor: p.color ?? p.payload?.fill }}
            />
            <span className="text-text-secondary text-xs flex-1 truncate">{p.name}</span>
            <span className="font-semibold tabular-nums text-text-primary text-xs">
              {fmtCurrency(p.value)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Analytics Page ────────────────────────────────────────

function AnalyticsPage() {
  const { t, i18n } = useTranslation();
  const reducedMotion = usePrefersReducedMotion();
  const [selectedAccountIds, setSelectedAccountIds] = useState<string[]>([]);
  const { data: accounts } = useAccounts();
  const { data, isLoading } = useAnalytics(selectedAccountIds);

  const isFilterActive = selectedAccountIds.length > 0;
  const hasFilteredData = !!data && data.patrimonyOverTime.some((p) => p.total !== 0);

  if (isLoading && !data) return <AnalyticsSkeleton />;

  // No data at all (no entries yet) — keep original empty state
  if (!data || data.patrimonyOverTime.length < 2) {
    return (
      <div className="p-4 max-w-lg mx-auto">
        <h1 className="font-heading text-2xl font-bold mb-4">{t('analytics.title')}</h1>
        <motion.div
          initial={reducedMotion ? false : { opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center justify-center py-16 text-center"
        >
          <BarChart3 size={64} className="text-text-muted mb-4" strokeWidth={1.5} />
          <p className="text-text-secondary text-sm">{t('analytics.noData')}</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="p-4 max-w-lg mx-auto">
      <h1 className="font-heading text-2xl font-bold mb-3">{t('analytics.title')}</h1>

      <AccountFilterBar
        accounts={accounts ?? []}
        selected={selectedAccountIds}
        onChange={setSelectedAccountIds}
      />

      <AppliedFilterPill
        count={selectedAccountIds.length}
        total={(accounts ?? []).filter((a) => a.isActive).length}
        onClear={() => setSelectedAccountIds([])}
        t={t}
      />

      {/* Filter active but produced empty results */}
      {isFilterActive && !hasFilteredData ? (
        <motion.div
          key="filter-empty"
          initial={reducedMotion ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center justify-center py-16 text-center mt-5"
        >
          <BarChart3 size={56} className="text-text-muted mb-3" strokeWidth={1.5} />
          <p className="text-text-primary text-sm font-semibold mb-1">
            {t('analytics.filter.emptyTitle')}
          </p>
          <p className="text-text-secondary text-xs mb-4 max-w-[18rem]">
            {t('analytics.filter.emptyBody')}
          </p>
          <button
            type="button"
            onClick={() => setSelectedAccountIds([])}
            className="px-4 py-2 rounded-full text-xs font-semibold bg-brand/15 text-brand border border-brand/30 hover:bg-brand/25 transition-colors"
          >
            {t('analytics.filter.showAll')}
          </button>
        </motion.div>
      ) : (
        <div className="space-y-5 mt-4">
          {/* Patrimony over time — AreaChart */}
          <ChartSection title={t('analytics.patrimony')} delay={0}>
            <PatrimonyChart data={data.patrimonyOverTime} lang={i18n.language} />
          </ChartSection>

          {/* Year comparison — LineChart */}
          <ChartSection title={t('analytics.yearComparison')} delay={0.05}>
            <YearComparisonChart data={data.yearComparison} lang={i18n.language} />
          </ChartSection>

          {/* Account breakdown — PieChart. Hidden when exactly 1 account selected (a single 100% slice is not informative). */}
          {data.accountBreakdown.length > 0 && selectedAccountIds.length !== 1 && (
            <ChartSection title={t('analytics.accountBreakdown')} delay={0.1}>
              <AccountPieChart data={data.accountBreakdown} />
            </ChartSection>
          )}

          {/* Income by source — BarChart (income is not account-bound, shown unfiltered) */}
          {data.monthlyIncome.length > 0 && (
            <ChartSection title={t('analytics.incomeBySource')} delay={0.15}>
              <IncomeBarChart data={data.monthlyIncome} lang={i18n.language} />
            </ChartSection>
          )}

          {/* Performance section */}
          <ChartSection title={t('analytics.performance')} delay={0.2}>
            <PerformanceGrid data={data} t={t} lang={i18n.language} />
          </ChartSection>
        </div>
      )}
    </div>
  );
}

// ─── Applied Filter Pill ───────────────────────────────────
//
// Surfaces the active multi-account filter state above the charts. The chip
// strip in AccountFilterBar overflows horizontally with many accounts, so the
// user can't tell at a glance which/how many filters are active without
// scrolling. This pill is the at-a-glance summary + a one-tap reset.

function AppliedFilterPill({
  count,
  total,
  onClear,
  t,
}: {
  count: number;
  total: number;
  onClear: () => void;
  t: (k: string, opts?: Record<string, unknown>) => string;
}) {
  if (count === 0) return null;
  return (
    <div
      role="status"
      aria-live="polite"
      className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-brand/12 border border-brand/30 text-brand text-xs font-semibold"
    >
      <Filter size={12} strokeWidth={2.5} aria-hidden="true" />
      <span>{t('analytics.filter.applied', { count, total })}</span>
      <button
        type="button"
        onClick={onClear}
        className="ml-1 -mr-1 px-2 py-0.5 rounded-full hover:bg-brand/20 transition-colors text-[10px] uppercase tracking-wider"
        aria-label={t('analytics.filter.clear')}
      >
        {t('analytics.filter.clear')}
      </button>
    </div>
  );
}

// ─── Chart Section Wrapper ─────────────────────────────────

function ChartSection({
  title,
  delay,
  children,
}: {
  title: string;
  delay: number;
  children: React.ReactNode;
}) {
  const reducedMotion = usePrefersReducedMotion();
  return (
    <motion.div
      initial={reducedMotion ? false : { opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
    >
      <Card className="p-4 overflow-hidden">
        <div className="flex items-center gap-2 mb-3">
          <span className="w-1.5 h-1.5 rounded-full bg-brand" />
          <p className="text-text-secondary text-xs font-semibold uppercase tracking-wider">
            {title}
          </p>
        </div>
        {children}
      </Card>
    </motion.div>
  );
}

// ─── Patrimony AreaChart ───────────────────────────────────

function PatrimonyChart({
  data,
  lang,
}: {
  data: AnalyticsData['patrimonyOverTime'];
  lang: string;
}) {
  const brand = brandColor();
  const positive = useMemo(() => readVar('--color-positive', '#5dd6b8'), []);
  const tickFill = useMemo(() => readVar('--color-text-muted', '#7a7a8a'), []);
  const gridStroke = useMemo(
    () => readVar('--color-border-default', 'rgba(255,255,255,0.08)'),
    [],
  );
  const surfaceBase = useMemo(() => readVar('--color-surface-base', '#0d0b1a'), []);
  const chartData = data.map((d) => ({ ...d, label: formatMonthShort(d.date, lang) }));
  const lastIndex = chartData.length - 1;

  // Custom dot: only render at the last data point (Aurora endpoint).
  // Recharts passes { cx, cy, index, ... }. We guard for missing values.
  const EndpointDot = (props: any) => {
    const { cx, cy, index } = props;
    if (typeof cx !== 'number' || typeof cy !== 'number') return <g />;
    if (index !== lastIndex) return <g />;
    return (
      <g>
        <circle cx={cx} cy={cy} r={7} fill={positive} opacity={0.18} />
        <circle cx={cx} cy={cy} r={3.5} fill={positive} stroke={surfaceBase} strokeWidth={1.5} />
      </g>
    );
  };

  return (
    <div className="h-52 -mx-2">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="patrimStroke" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor={brand} />
              <stop offset="100%" stopColor={positive} />
            </linearGradient>
            <linearGradient id="patrimFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={brand} stopOpacity={0.4} />
              <stop offset="100%" stopColor={brand} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 10, fill: tickFill }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            tick={{ fontSize: 10, fill: tickFill }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v) => fmtCurrencyCompact(v)}
            width={55}
          />
          <Tooltip content={<ChartTooltip />} />
          <Area
            type="monotone"
            dataKey="total"
            name="Patrimonio"
            stroke="url(#patrimStroke)"
            strokeWidth={2.5}
            fill="url(#patrimFill)"
            animationDuration={1200}
            dot={EndpointDot}
            activeDot={{ r: 5, fill: brand, stroke: surfaceBase, strokeWidth: 2 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

// ─── Year Comparison LineChart ─────────────────────────────

function YearComparisonChart({
  data,
  lang,
}: {
  data: AnalyticsData['yearComparison'];
  lang: string;
}) {
  const { t } = useTranslation();
  const yearColors = yearPalette();
  const tickFill = useMemo(() => readVar('--color-text-muted', '#7a7a8a'), []);
  const gridStroke = useMemo(
    () => readVar('--color-border-default', 'rgba(255,255,255,0.08)'),
    [],
  );
  const years = Object.keys(data).sort();
  const [activeYears, setActiveYears] = useState<Set<string>>(() => {
    // Show last 3 years by default
    return new Set(years.slice(-3));
  });

  const toggleYear = (year: string) => {
    setActiveYears((prev) => {
      const next = new Set(prev);
      if (next.has(year)) {
        if (next.size > 1) next.delete(year); // keep at least 1
      } else {
        next.add(year);
      }
      return next;
    });
  };
  const isLastActive = (year: string) => activeYears.size === 1 && activeYears.has(year);

  const monthLabels = useMemo(
    () =>
      Array.from({ length: 12 }, (_, i) =>
        new Date(2000, i, 1).toLocaleDateString(lang === 'it' ? 'it-IT' : 'en-GB', {
          month: 'short',
        }),
      ),
    [lang],
  );

  // Build chart data: 12 months, each year as a key
  const chartData = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => {
      const month = i + 1;
      const point: Record<string, any> = { month: monthLabels[i] };
      for (const year of years) {
        if (!activeYears.has(year)) continue;
        const entry = data[year]?.find((e) => e.month === month);
        point[year] = entry?.total ?? null;
      }
      return point;
    });
  }, [data, years, activeYears, monthLabels]);

  return (
    <div>
      {/* Year toggle chips */}
      <div className="flex gap-1.5 mb-3 flex-wrap">
        {years.map((year, i) => {
          const active = activeYears.has(year);
          const color = yearColors[i % yearColors.length];
          return (
            <button
              key={year}
              onClick={() => toggleYear(year)}
              aria-disabled={isLastActive(year) || undefined}
              title={isLastActive(year) ? t('analytics.atLeastOneYear') : undefined}
              className={`px-3 min-h-11 inline-flex items-center rounded-full text-xs font-semibold transition-all border ${
                isLastActive(year) ? 'cursor-not-allowed opacity-60' : ''
              }`}
              style={{
                backgroundColor: active ? color + '20' : 'transparent',
                borderColor: active ? color : 'rgba(255,255,255,0.1)',
                color: active ? color : '#666',
                boxShadow: active ? `0 4px 12px ${color}33` : undefined,
              }}
            >
              {year}
            </button>
          );
        })}
      </div>

      <div className="h-52 -mx-2">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
            <XAxis
              dataKey="month"
              tick={{ fontSize: 10, fill: tickFill }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              tick={{ fontSize: 10, fill: tickFill }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => fmtCurrencyCompact(v)}
              width={55}
            />
            <Tooltip content={<ChartTooltip />} />
            {years
              .filter((y) => activeYears.has(y))
              .map((year) => {
                const lineColor = yearColors[years.indexOf(year) % yearColors.length];
                return (
                  <Line
                    key={year}
                    type="monotone"
                    dataKey={year}
                    name={year}
                    stroke={lineColor}
                    strokeWidth={2.5}
                    dot={{ r: 2.5, fill: lineColor, strokeWidth: 0 }}
                    activeDot={{
                      r: 5,
                      fill: lineColor,
                      stroke: lineColor,
                      strokeWidth: 2,
                      strokeOpacity: 0.3,
                    }}
                    connectNulls
                    animationDuration={800}
                  />
                );
              })}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// ─── Account PieChart ──────────────────────────────────────

function AccountPieChart({ data }: { data: AnalyticsData['accountBreakdown'] }) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const chartColors = chartPalette();
  // Default: largest slice first (most useful for a pie). 'custom' (the
  // drag-drop order from /accounts) is also available — backend now exposes
  // orderIndex on each breakdown item.
  const [sortMode, setSortMode] = useState<SortMode>('amount');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  // Stable colors: bind color to the original index BEFORE sorting so a slice
  // keeps its hue even when the user toggles direction or mode.
  const coloredData = data.map((d, i) => ({
    ...d,
    fill: d.color ?? chartColors[i % chartColors.length],
  }));
  const pieData = useMemo(
    () => sortAccounts(coloredData, sortMode, sortDir),
    [coloredData, sortMode, sortDir],
  );

  const total = useMemo(() => pieData.reduce((s, d) => s + d.amount, 0), [pieData]);

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <AccountSortControl
          mode={sortMode}
          dir={sortDir}
          onModeChange={setSortMode}
          onDirChange={setSortDir}
          showCustom
        />
      </div>
      <div className="flex items-center gap-4">
        <div className="relative w-36 h-36 shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={pieData}
              dataKey="amount"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={42}
              outerRadius={66}
              paddingAngle={4}
              animationDuration={800}
              onMouseEnter={(_, i) => setActiveIndex(i)}
              onMouseLeave={() => setActiveIndex(null)}
            >
              {pieData.map((d, i) => (
                <Cell
                  key={d.name}
                  fill={d.fill}
                  stroke="transparent"
                  opacity={activeIndex === null || activeIndex === i ? 1 : 0.4}
                  style={{
                    transition: 'opacity 0.2s, filter 0.2s',
                    filter:
                      activeIndex === i
                        ? `drop-shadow(0 4px 12px ${d.fill}59)`
                        : undefined,
                  }}
                />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-text-muted text-[9px] font-semibold uppercase tracking-wider">
            Totale
          </span>
          <span className="text-sm font-bold tabular-nums text-text-primary leading-none mt-0.5">
            {fmtCurrencyCompact(total)}
          </span>
        </div>
      </div>

      {/* Legend */}
      <div className="flex-1 space-y-1.5 min-w-0">
        {pieData.map((d, i) => (
          <div
            key={d.accountId ?? d.name}
            className="flex items-center gap-2 text-sm"
            onMouseEnter={() => setActiveIndex(i)}
            onMouseLeave={() => setActiveIndex(null)}
          >
            <AccountIcon
              iconUrl={d.iconUrl}
              icon={d.icon}
              name={d.name}
              color={d.color ?? d.fill}
              size={20}
            />
            <span className="text-text-secondary truncate flex-1">{d.name}</span>
            <span className="font-semibold text-text-primary shrink-0">
              {d.percent.toFixed(1)}%
            </span>
          </div>
        ))}
      </div>
      </div>
    </div>
  );
}

// ─── Income BarChart ───────────────────────────────────────

function IncomeBarChart({
  data,
  lang,
}: {
  data: AnalyticsData['monthlyIncome'];
  lang: string;
}) {
  const chartColors = chartPalette();
  const tickFill = useMemo(() => readVar('--color-text-muted', '#7a7a8a'), []);
  const gridStroke = useMemo(
    () => readVar('--color-border-default', 'rgba(255,255,255,0.08)'),
    [],
  );
  // Collect all source names
  const allSources = useMemo(() => {
    const set = new Set<string>();
    for (const m of data) {
      for (const s of m.sources) set.add(s.name);
    }
    return [...set];
  }, [data]);

  // Transform to recharts data
  const chartData = useMemo(() => {
    return data.map((m) => {
      const point: Record<string, any> = { label: formatMonthShort(m.date, lang) };
      for (const src of allSources) {
        const found = m.sources.find((s) => s.name === src);
        point[src] = found?.amount ?? 0;
      }
      return point;
    });
  }, [data, allSources, lang]);

  if (allSources.length === 0) return null;

  const onlyOne = allSources.length === 1;

  return (
    <div className="h-52 -mx-2">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={chartData}
          margin={{ top: 4, right: 4, left: 0, bottom: 0 }}
          barCategoryGap="22%"
          barGap={0}
        >
          <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 10, fill: tickFill }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            tick={{ fontSize: 10, fill: tickFill }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v) => fmtCurrencyCompact(v)}
            width={55}
          />
          <Tooltip content={<ChartTooltip />} cursor={{ fill: gridStroke, opacity: 0.4 }} />
          {allSources.map((name, i) => {
            // Round both top and bottom when there is a single segment;
            // otherwise round only the top of the last (top-most) stack.
            const radius: [number, number, number, number] = onlyOne
              ? [6, 6, 6, 6]
              : i === allSources.length - 1
                ? [6, 6, 0, 0]
                : [0, 0, 0, 0];
            return (
              <Bar
                key={name}
                dataKey={name}
                stackId="income"
                fill={chartColors[i % chartColors.length]}
                radius={radius}
                animationDuration={800}
              />
            );
          })}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ─── Performance Grid (hairline columns) ───────────────────
//
// Visual differentiation from Home KPIGrid (Aurora tiles): no per-cell card,
// hairline dividers between columns, value dominant. The wrapping ChartSection
// already provides the surrounding card and the section title.

function PerformanceGrid({
  data,
  t,
  lang,
}: {
  data: AnalyticsData;
  t: (k: string) => string;
  lang: string;
}) {
  type PerfItem =
    | { label: string; value: string; valueColor: string; sub: string; subDelta?: undefined }
    | { label: string; value: string; valueColor: string; subDelta: number; sub?: undefined };

  const items: PerfItem[] = [
    {
      label: t('analytics.bestMonth'),
      value: data.bestMonth.date ? formatMonthLong(data.bestMonth.date, lang) : '—',
      valueColor: 'text-positive',
      subDelta: data.bestMonth.delta,
    },
    {
      label: t('analytics.worstMonth'),
      value: data.worstMonth.date ? formatMonthLong(data.worstMonth.date, lang) : '—',
      valueColor: 'text-negative',
      subDelta: data.worstMonth.delta,
    },
    {
      label: t('analytics.avgGrowth'),
      value: fmtCurrency(data.avgGrowth),
      valueColor: data.avgGrowth >= 0 ? 'text-brand' : 'text-negative',
      sub: t('analytics.perMonth'),
    },
    {
      label: t('analytics.bestYear'),
      value: data.bestYear.year ? String(data.bestYear.year) : '—',
      valueColor: 'text-gold',
      subDelta: data.bestYear.growth,
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-border-default">
      {items.map((item) => (
        <div key={item.label} className="px-4 py-3 first:pl-0 last:pr-0">
          {/* Mixed-case label — uppercase is reserved for the hero per Wave 4 audit. */}
          <p className="text-text-muted text-[11px] font-semibold leading-tight">
            {item.label}
          </p>
          <p
            className={`text-xl font-bold tracking-tight tabular-nums leading-none mt-1.5 capitalize ${item.valueColor}`}
          >
            {item.value}
          </p>
          {item.subDelta !== undefined ? (
            <Delta
              value={item.subDelta}
              className="mt-1 text-[11px]"
              ariaPrefix={t('dashboard.deltaAria')}
            />
          ) : item.sub ? (
            <p className="text-[11px] text-text-muted font-medium mt-1">{item.sub}</p>
          ) : null}
        </div>
      ))}
    </div>
  );
}

// ─── Skeleton ──────────────────────────────────────────────

function AnalyticsSkeleton() {
  return (
    <div className="p-4 max-w-lg mx-auto space-y-5">
      <Skeleton className="h-8 w-32" />
      {Array.from({ length: 4 }).map((_, i) => (
        <Skeleton key={i} className="h-64 w-full rounded-xl" />
      ))}
    </div>
  );
}
