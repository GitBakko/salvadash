import { createFileRoute } from '@tanstack/react-router';
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
  Legend,
} from 'recharts';
import type { AnalyticsData } from '@salvadash/shared';
import { useAnalytics, useAccounts } from '../hooks/queries';
import { usePrefersReducedMotion } from '../hooks/use-prefers-reduced-motion';
import { Card, Skeleton } from '../components/ui';
import { Delta } from '../components/ui/Delta';
import { fmtCurrency, fmtCurrencyCompact } from '../lib/format';
import { formatMonthShort, formatMonthLong } from '../lib/intl';
import { BarChart3, TrendingUp, TrendingDown, Gauge, Trophy } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { AccountFilterBar } from '../components/AccountFilterBar';

export const Route = createFileRoute('/analytics')({
  component: AnalyticsPage,
});

// ─── Colors ────────────────────────────────────────────────

const BRAND = '#00d4a0';
const GOLD = '#ffd166';
const CHART_COLORS = [
  '#00d4a0',
  '#ffd166',
  '#6c63ff',
  '#ff6b6b',
  '#4ecdc4',
  '#45b7d1',
  '#f093fb',
  '#feca57',
];
const YEAR_COLORS = ['#00d4a0', '#ffd166', '#6c63ff', '#ff6b6b', '#4ecdc4', '#45b7d1'];

// ─── Custom Tooltip ────────────────────────────────────────

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass-card p-2 text-xs border border-border-default shadow-lg">
      <p className="text-text-muted mb-1">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: p.color }} className="font-semibold">
          {p.name}: {fmtCurrency(p.value)}
        </p>
      ))}
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
    <div className="p-4 max-w-lg mx-auto pb-24">
      <h1 className="font-heading text-2xl font-bold mb-3">{t('analytics.title')}</h1>

      <AccountFilterBar
        accounts={accounts ?? []}
        selected={selectedAccountIds}
        onChange={setSelectedAccountIds}
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
        <p className="text-text-muted text-[10px] uppercase tracking-wider mb-3 font-semibold">
          {title}
        </p>
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
  const chartData = data.map((d) => ({ ...d, label: formatMonthShort(d.date, lang) }));

  return (
    <div className="h-52 -mx-2">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="patrimGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={BRAND} stopOpacity={0.35} />
              <stop offset="100%" stopColor={BRAND} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 10, fill: '#666' }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            tick={{ fontSize: 10, fill: '#666' }}
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
            stroke={BRAND}
            strokeWidth={2}
            fill="url(#patrimGrad)"
            animationDuration={1200}
            dot={false}
            activeDot={{ r: 4, fill: BRAND, stroke: '#0a0a0f', strokeWidth: 2 }}
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
          const color = YEAR_COLORS[i % YEAR_COLORS.length];
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
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
            <XAxis
              dataKey="month"
              tick={{ fontSize: 10, fill: '#666' }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              tick={{ fontSize: 10, fill: '#666' }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => fmtCurrencyCompact(v)}
              width={55}
            />
            <Tooltip content={<ChartTooltip />} />
            {years
              .filter((y) => activeYears.has(y))
              .map((year, i) => (
                <Line
                  key={year}
                  type="monotone"
                  dataKey={year}
                  name={year}
                  stroke={YEAR_COLORS[years.indexOf(year) % YEAR_COLORS.length]}
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4, strokeWidth: 2 }}
                  connectNulls
                  animationDuration={800}
                />
              ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// ─── Account PieChart ──────────────────────────────────────

function AccountPieChart({ data }: { data: AnalyticsData['accountBreakdown'] }) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const pieData = data.map((d, i) => ({
    ...d,
    fill: d.color ?? CHART_COLORS[i % CHART_COLORS.length],
  }));

  return (
    <div className="flex items-center gap-4">
      <div className="w-36 h-36 shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={pieData}
              dataKey="amount"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={35}
              outerRadius={60}
              paddingAngle={2}
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
                  style={{ transition: 'opacity 0.2s' }}
                />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Legend */}
      <div className="flex-1 space-y-1.5 min-w-0">
        {pieData.map((d, i) => (
          <div
            key={d.name}
            className="flex items-center gap-2 text-sm"
            onMouseEnter={() => setActiveIndex(i)}
            onMouseLeave={() => setActiveIndex(null)}
          >
            <div
              className="w-2.5 h-2.5 rounded-full shrink-0"
              style={{ backgroundColor: d.fill }}
            />
            <span className="text-text-secondary truncate flex-1">{d.name}</span>
            <span className="font-semibold text-text-primary shrink-0">
              {d.percent.toFixed(1)}%
            </span>
          </div>
        ))}
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

  return (
    <div className="h-52 -mx-2">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 10, fill: '#666' }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            tick={{ fontSize: 10, fill: '#666' }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v) => fmtCurrencyCompact(v)}
            width={55}
          />
          <Tooltip content={<ChartTooltip />} />
          {allSources.map((name, i) => (
            <Bar
              key={name}
              dataKey={name}
              stackId="income"
              fill={CHART_COLORS[i % CHART_COLORS.length]}
              radius={i === allSources.length - 1 ? [3, 3, 0, 0] : [0, 0, 0, 0]}
              animationDuration={800}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ─── Performance Grid ──────────────────────────────────────

function PerformanceGrid({
  data,
  t,
  lang,
}: {
  data: AnalyticsData;
  t: (k: string) => string;
  lang: string;
}) {
  const reducedMotion = usePrefersReducedMotion();
  type PerfItem =
    | {
        label: string;
        value: string;
        sub: string;
        Icon: LucideIcon;
        color: string;
        subDelta?: undefined;
      }
    | {
        label: string;
        value: string;
        subDelta: number;
        Icon: LucideIcon;
        color: string;
        sub?: undefined;
      };

  const items: PerfItem[] = [
    {
      label: t('analytics.bestMonth'),
      value: data.bestMonth.date ? formatMonthLong(data.bestMonth.date, lang) : '—',
      subDelta: data.bestMonth.delta,
      Icon: TrendingUp,
      color: 'text-positive',
    },
    {
      label: t('analytics.worstMonth'),
      value: data.worstMonth.date ? formatMonthLong(data.worstMonth.date, lang) : '—',
      subDelta: data.worstMonth.delta,
      Icon: TrendingDown,
      color: 'text-negative',
    },
    {
      label: t('analytics.avgGrowth'),
      value: fmtCurrency(data.avgGrowth),
      sub: t('analytics.perMonth'),
      Icon: Gauge,
      color: data.avgGrowth >= 0 ? 'text-brand' : 'text-negative',
    },
    {
      label: t('analytics.bestYear'),
      value: data.bestYear.year ? String(data.bestYear.year) : '—',
      subDelta: data.bestYear.growth,
      Icon: Trophy,
      color: 'text-gold',
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3">
      {items.map((item, i) => (
        <motion.div
          key={item.label}
          initial={reducedMotion ? false : { opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.25 + i * 0.05 }}
          className="bg-surface-elevated/30 rounded-xl p-3"
        >
          <div className="flex items-center gap-1.5 mb-1">
            <item.Icon size={16} className={item.color} aria-hidden="true" />
            <span className="text-text-muted text-[10px] uppercase tracking-wider">
              {item.label}
            </span>
          </div>
          <p className="font-heading text-sm font-bold capitalize">{item.value}</p>
          {item.subDelta !== undefined ? (
            <Delta value={item.subDelta} className="mt-0.5 text-xs" />
          ) : item.sub ? (
            <p className={`text-xs ${item.color} font-semibold mt-0.5`}>{item.sub}</p>
          ) : null}
        </motion.div>
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
