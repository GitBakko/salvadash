import { createFileRoute } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { useState, useEffect, useRef } from 'react';
import { motion, useSpring, useTransform, type MotionValue } from 'framer-motion';
import { AreaChart, Area, ResponsiveContainer } from 'recharts';
import type { DashboardData } from '@salvadash/shared';
import { useDashboard } from '../hooks/queries';
import { useCacheDashboard } from '../hooks/use-offline-sync';
import { Card, Skeleton } from '../components/ui';
import { Delta } from '../components/ui/Delta';
import { fmtCurrency, fmtCurrencyCompact, fmtPercent } from '../lib/format';
import { formatMonthShort } from '../lib/intl';
import { Lightbulb, CalendarDays, ArrowDown, TrendingUp, ArrowUp, Trophy } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export const Route = createFileRoute('/')({
  component: DashboardPage,
});

// ─── Animated counter ──────────────────────────────────────

function AnimatedNumber({ value, className }: { value: number; className?: string }) {
  const spring = useSpring(0, { stiffness: 60, damping: 20 });
  const display = useTransform(spring, (v) => fmtCurrency(v));
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    spring.set(value);
  }, [spring, value]);

  useEffect(() => {
    const unsubscribe = display.on('change', (v) => {
      if (ref.current) ref.current.textContent = v;
    });
    return unsubscribe;
  }, [display]);

  return (
    <span ref={ref} className={className}>
      {fmtCurrency(value)}
    </span>
  );
}

// ─── Dashboard Page ────────────────────────────────────────

function DashboardPage() {
  const { t, i18n } = useTranslation();
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(String(currentYear));
  const { data, isLoading } = useDashboard(year);

  // Cache dashboard data to IndexedDB for offline fallback
  useCacheDashboard(data);

  const years = Array.from({ length: currentYear - 2022 }, (_, i) => String(currentYear - i));

  if (isLoading) return <DashboardSkeleton />;
  if (!data) {
    return (
      <div className="p-4 max-w-lg mx-auto flex flex-col items-center justify-center py-20 text-center">
        <Lightbulb size={64} className="text-text-muted mb-4" strokeWidth={1.5} />
        <p className="text-text-secondary text-sm">{t('dashboard.noEntries')}</p>
      </div>
    );
  }

  return (
    <div className="p-4 max-w-lg mx-auto space-y-4">
      {/* Year selector pills */}
      <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
        {years.map((y) => (
          <button
            key={y}
            onClick={() => setYear(y)}
            className={`shrink-0 px-4 min-h-11 inline-flex items-center rounded-full text-sm font-medium transition-all ${
              year === y
                ? 'bg-brand text-surface-base'
                : 'bg-surface-elevated text-text-secondary hover:text-text-primary'
            }`}
          >
            {y}
          </button>
        ))}
      </div>

      {/* Hero KPI */}
      <HeroCard data={data} t={t} lang={i18n.language} />

      {/* Secondary KPIs */}
      <KPIGrid data={data} t={t} year={year} />

      {/* Sparkline */}
      {data.sparklineData.length > 1 && <SparklineCard data={data.sparklineData} />}

      {/* Account breakdown */}
      {data.accountBreakdown.length > 0 && <AccountBreakdown data={data} t={t} />}

      {/* Recent entries */}
      {data.recentEntries.length > 0 && (
        <RecentEntries entries={data.recentEntries} t={t} lang={i18n.language} />
      )}
    </div>
  );
}

// ─── Hero Card ─────────────────────────────────────────────

function HeroCard({
  data,
  t,
  lang,
}: {
  data: DashboardData;
  t: (k: string, o?: Record<string, string>) => string;
  lang: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card p-6 text-center relative overflow-hidden"
    >
      {/* Subtle glow */}
      <div className="absolute inset-0 bg-gradient-to-b from-brand/5 to-transparent pointer-events-none" />

      <p className="text-text-secondary text-sm font-medium relative">
        {t('dashboard.currentTotal')}
      </p>
      <div className="relative">
        <AnimatedNumber
          value={data.currentTotal}
          className="font-heading text-[42px] font-bold text-gold leading-tight"
        />
      </div>

      {data.currentEntry && (
        <p className="text-text-muted text-xs mt-1 relative">
          {formatMonthShort(data.currentEntry.date, lang)}
          {data.currentEntry.delta != null && (
            <Delta
              value={data.currentEntry.delta}
              className="ml-2"
              ariaPrefix={t('dashboard.deltaAria')}
            />
          )}
        </p>
      )}
    </motion.div>
  );
}

// ─── KPI Grid ──────────────────────────────────────────────

function KPIGrid({
  data,
  t,
  year,
}: {
  data: DashboardData;
  t: (k: string, o?: Record<string, string>) => string;
  year: string;
}) {
  const kpis: { label: string; value: string; Icon: LucideIcon; color: string }[] = [
    {
      label: t('dashboard.yearTotal', { year }),
      value: data.yearTotal != null ? fmtCurrency(data.yearTotal) : '—',
      Icon: CalendarDays,
      color: 'text-info',
    },
    {
      label: t('dashboard.monthlyIncome'),
      value: fmtCurrency(data.monthlyIncome),
      Icon: ArrowDown,
      color: 'text-positive',
    },
    {
      label: t('dashboard.avgMonthly'),
      value: fmtCurrency(data.avgMonthlyYTD),
      Icon: TrendingUp,
      color: 'text-purple',
    },
    {
      label: t('dashboard.growthYTD'),
      value: fmtPercent(data.growthYTD),
      Icon: data.growthYTD >= 0 ? ArrowUp : ArrowDown,
      color: data.growthYTD >= 0 ? 'text-positive' : 'text-negative',
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3">
      {kpis.map((kpi, i) => (
        <motion.div
          key={kpi.label}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 * (i + 1) }}
        >
          <Card className="p-3">
            <div className="flex items-start gap-2">
              <kpi.Icon size={20} className={kpi.color} aria-hidden="true" />
              <div className="min-w-0">
                <p className="text-text-muted text-[10px] uppercase tracking-wider leading-tight">
                  {kpi.label}
                </p>
                <p className="font-heading text-lg font-bold mt-0.5">{kpi.value}</p>
              </div>
            </div>
          </Card>
        </motion.div>
      ))}

      {/* Best month — full width */}
      {data.bestMonth && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="col-span-2"
        >
          <Card className="p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Trophy size={20} className="text-gold" aria-hidden="true" />
                <div>
                  <p className="text-text-muted text-[10px] uppercase tracking-wider">
                    {t('dashboard.bestMonth')}
                  </p>
                  <p className="text-sm font-semibold capitalize">{data.bestMonth.month}</p>
                </div>
              </div>
              <p className="font-heading text-lg font-bold text-positive">
                +{fmtCurrencyCompact(data.bestMonth.delta)}
              </p>
            </div>
          </Card>
        </motion.div>
      )}
    </div>
  );
}

// ─── Sparkline Card ────────────────────────────────────────

function SparklineCard({ data }: { data: number[] }) {
  const chartData = data.map((v, i) => ({ i, v }));

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="glass-card p-4 overflow-hidden"
    >
      <p className="text-text-muted text-[10px] uppercase tracking-wider mb-2">Trend 12 mesi</p>
      <div className="h-20 -mx-4 -mb-4">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="sparkGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#00d4a0" stopOpacity={0.3} />
                <stop offset="100%" stopColor="#00d4a0" stopOpacity={0} />
              </linearGradient>
            </defs>
            <Area
              type="monotone"
              dataKey="v"
              stroke="#00d4a0"
              strokeWidth={2}
              fill="url(#sparkGrad)"
              dot={false}
              isAnimationActive
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  );
}

// ─── Account Breakdown ─────────────────────────────────────

function AccountBreakdown({ data, t }: { data: DashboardData; t: (k: string) => string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.35 }}
    >
      <p className="text-text-muted text-[10px] uppercase tracking-wider mb-2">
        {t('accounts.title')}
      </p>
      <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar">
        {data.accountBreakdown.map((acc) => (
          <Card key={acc.accountId} className="shrink-0 w-36 p-3">
            <div className="flex items-center gap-2 mb-2">
              <div
                className="w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: acc.color ?? '#00d4a0' }}
              />
              <span className="text-xs text-text-secondary truncate">{acc.name}</span>
            </div>
            <p className="font-heading text-base font-bold">{fmtCurrency(acc.amount)}</p>
            <div className="mt-2 h-1 bg-surface-elevated rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${acc.percent}%`, backgroundColor: acc.color ?? '#00d4a0' }}
              />
            </div>
            <p className="text-[10px] text-text-muted mt-1">{acc.percent.toFixed(1)}%</p>
          </Card>
        ))}
      </div>
    </motion.div>
  );
}

// ─── Recent Entries ────────────────────────────────────────

function RecentEntries({
  entries,
  t,
  lang,
}: {
  entries: DashboardData['recentEntries'];
  t: (k: string) => string;
  lang: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 }}
    >
      <p className="text-text-muted text-[10px] uppercase tracking-wider mb-2">
        {t('dashboard.recentEntries')}
      </p>
      <Card className="divide-y divide-border-default">
        {entries.map((entry) => (
          <div key={entry.id} className="flex items-center justify-between px-4 py-3">
            <div>
              <p className="text-sm font-medium capitalize">{formatMonthShort(entry.date, lang)}</p>
              <p className="text-xs text-text-muted">{fmtCurrency(entry.total)}</p>
            </div>
            {entry.delta != null && (
              <div className="text-right flex flex-col items-end gap-0.5">
                <Delta value={entry.delta} />
                {entry.deltaPercent != null && (
                  <Delta value={entry.deltaPercent} variant="percent" className="text-[10px]" />
                )}
              </div>
            )}
          </div>
        ))}
      </Card>
    </motion.div>
  );
}

// ─── Dashboard Skeleton ────────────────────────────────────

function DashboardSkeleton() {
  return (
    <div className="p-4 max-w-lg mx-auto space-y-4">
      <div className="flex gap-2">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} width={56} height={28} variant="rectangular" />
        ))}
      </div>
      <Skeleton height={120} variant="rectangular" />
      <div className="grid grid-cols-2 gap-3">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} height={72} variant="rectangular" />
        ))}
      </div>
      <Skeleton height={96} variant="rectangular" />
      <Skeleton height={200} variant="rectangular" />
    </div>
  );
}
