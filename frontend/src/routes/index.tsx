import { createFileRoute } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { useState } from 'react';
import { motion } from 'framer-motion';
import type { DashboardData } from '@salvadash/shared';
import { useDashboard } from '../hooks/queries';
import { useCacheDashboard } from '../hooks/use-offline-sync';
import { usePrefersReducedMotion } from '../hooks/use-prefers-reduced-motion';
import { Card, Skeleton } from '../components/ui';
import { Delta } from '../components/ui/Delta';
import { MiniSparkline } from '../components/MiniSparkline';
import { fmtCurrency, fmtCurrencyCompact, fmtPercent } from '../lib/format';
import { formatMonthShort } from '../lib/intl';
import {
  Lightbulb,
  CalendarDays,
  ArrowDown,
  TrendingUp,
  TrendingDown,
  ArrowUp,
  Trophy,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { brandColor } from '../lib/theme-vars';

export const Route = createFileRoute('/')({
  component: DashboardPage,
});

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
      <h1 className="sr-only">{t('nav.home')}</h1>
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
      <HeroCard data={data} t={t} />

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

// ─── Hero (Aurora) ─────────────────────────────────────────

function HeroCard({
  data,
  t,
}: {
  data: DashboardData;
  t: (k: string, o?: Record<string, string>) => string;
}) {
  const formatted = fmtCurrency(data.currentTotal);
  const lastComma = formatted.lastIndexOf(',');
  const integerPart = lastComma >= 0 ? formatted.slice(0, lastComma) : formatted;
  const centsPart = lastComma >= 0 ? formatted.slice(lastComma) : '';

  const delta = data.currentEntry?.delta ?? null;
  const deltaPercent = data.currentEntry?.deltaPercent ?? null;

  let chipTone = 'bg-surface-elevated text-text-muted';
  let ChipIcon: LucideIcon | null = null;
  if (delta != null) {
    if (delta > 0) {
      chipTone = 'bg-positive/12 text-positive';
      ChipIcon = TrendingUp;
    } else if (delta < 0) {
      chipTone = 'bg-negative/12 text-negative';
      ChipIcon = TrendingDown;
    }
  }

  let chipText = '';
  let ariaText = '';
  if (delta != null) {
    const currencyStr = fmtCurrencyCompact(delta);
    const signedCurrency = delta > 0 && !currencyStr.startsWith('+') ? `+${currencyStr}` : currencyStr;
    chipText = signedCurrency;
    if (deltaPercent != null) {
      chipText += ` · ${fmtPercent(deltaPercent)}`;
    }
    ariaText = `${t('dashboard.deltaAria')} ${chipText}`;
  }

  return (
    <section className="py-2 px-1">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-text-muted mb-3.5">
        {t('dashboard.currentTotal')}
      </p>
      <div className="hero-amount font-heading text-[clamp(3.5rem,11vw,5.5rem)] font-extrabold tracking-[-0.045em] leading-[0.95] text-text-primary tabular-nums">
        <span>{integerPart}</span>
        {centsPart && (
          <span className="text-[2.6rem] font-bold text-text-muted tracking-[-0.03em] ml-1">
            {centsPart}
          </span>
        )}
      </div>
      {delta != null && (
        <div
          className={`inline-flex items-center gap-2 mt-4 px-3.5 py-1.5 rounded-full text-sm font-semibold ${chipTone}`}
          aria-label={ariaText}
        >
          {ChipIcon && <ChipIcon size={14} strokeWidth={2.5} aria-hidden="true" />}
          <span>{chipText}</span>
        </div>
      )}
    </section>
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
  const reducedMotion = usePrefersReducedMotion();
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
          initial={reducedMotion ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 * (i + 1) }}
        >
          <Card className="p-3">
            <div className="flex items-start gap-2">
              <kpi.Icon size={20} className={kpi.color} aria-hidden="true" />
              <div className="min-w-0">
                <p className="text-text-muted text-xs font-medium leading-tight">
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
          initial={reducedMotion ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="col-span-2"
        >
          <Card className="p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Trophy size={20} className="text-gold" aria-hidden="true" />
                <div>
                  <p className="text-text-muted text-xs font-medium">
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
  const reducedMotion = usePrefersReducedMotion();

  return (
    <motion.div
      initial={reducedMotion ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="solid-card p-4 overflow-hidden"
    >
      <p className="text-text-muted text-xs font-medium mb-2">Trend 12 mesi</p>
      <MiniSparkline values={data} className="w-full h-20" ariaLabel="Trend 12 mesi" />
    </motion.div>
  );
}

// ─── Account Breakdown ─────────────────────────────────────

function AccountBreakdown({ data, t }: { data: DashboardData; t: (k: string) => string }) {
  const reducedMotion = usePrefersReducedMotion();
  return (
    <motion.div
      initial={reducedMotion ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.35 }}
    >
      <p className="text-text-muted text-xs font-medium mb-2">
        {t('accounts.title')}
      </p>
      <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar">
        {data.accountBreakdown.map((acc) => (
          <Card key={acc.accountId} className="shrink-0 w-36 p-3">
            <div className="flex items-center gap-2 mb-2">
              <div
                className="w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: acc.color ?? brandColor() }}
              />
              <span className="text-xs text-text-secondary truncate">{acc.name}</span>
            </div>
            <p className="font-heading text-base font-bold">{fmtCurrency(acc.amount)}</p>
            <div className="mt-2 h-1 bg-surface-elevated rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${acc.percent}%`, backgroundColor: acc.color ?? brandColor() }}
              />
            </div>
            <p className="text-[10px] text-text-secondary mt-1">{acc.percent.toFixed(1)}%</p>
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
  const reducedMotion = usePrefersReducedMotion();
  return (
    <motion.div
      initial={reducedMotion ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 }}
    >
      <p className="text-text-muted text-xs font-medium mb-2">
        {t('dashboard.recentEntries')}
      </p>
      <Card className="space-y-1">
        {entries.map((entry) => (
          <div key={entry.id} className="flex items-center justify-between rounded-md px-3 py-2 odd:bg-surface-elevated/40">
            <div>
              <p className="text-sm font-medium capitalize">{formatMonthShort(entry.date, lang)}</p>
              <p className="text-xs text-text-secondary">{fmtCurrency(entry.total)}</p>
            </div>
            {entry.delta != null && (
              <div className="text-right flex flex-col items-end gap-0.5">
                <Delta value={entry.delta} ariaPrefix={t('dashboard.deltaAria')} />
                {entry.deltaPercent != null && (
                  <Delta
                    value={entry.deltaPercent}
                    variant="percent"
                    className="text-[10px]"
                    ariaPrefix={t('dashboard.deltaAria')}
                  />
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
