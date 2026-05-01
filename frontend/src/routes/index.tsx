import { createFileRoute } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import type { DashboardData } from '@salvadash/shared';
import { useDashboard } from '../hooks/queries';
import { useCacheDashboard } from '../hooks/use-offline-sync';
import { usePrefersReducedMotion } from '../hooks/use-prefers-reduced-motion';
import { Card, Skeleton } from '../components/ui';
import { Delta } from '../components/ui/Delta';
import { MiniSparkline } from '../components/MiniSparkline';
import {
  AccountSortControl,
  sortAccounts,
  type SortMode,
  type SortDir,
} from '../components/AccountSortControl';
import { fmtCurrency, fmtCurrencyCompact, fmtCurrencyParts, fmtPercent } from '../lib/format';
import { formatMonthShort, formatMonthLong } from '../lib/intl';
import { Lightbulb, TrendingUp, TrendingDown } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { AccountIcon } from '../components/AccountIcon';
import { YearPills } from '../components/YearPills';
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
      <YearPills years={years} active={year} onChange={(y) => setYear(y as string)} />

      {/* Hero KPI */}
      <HeroCard data={data} t={t} />

      {/* Secondary KPIs */}
      <KPIGrid data={data} t={t} year={year} lang={i18n.language} />

      {/* Sparkline */}
      {data.sparklineData.length > 1 && <SparklineCard data={data.sparklineData} t={t} />}

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
  const { integer: integerPart, cents: centsPart } = fmtCurrencyParts(data.currentTotal);

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
    const signedCurrency =
      delta > 0 && !currencyStr.startsWith('+') ? `+${currencyStr}` : currencyStr;
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

// ─── KPI Grid (Aurora tiles) ───────────────────────────────

function KPIGrid({
  data,
  t,
  year,
  lang,
}: {
  data: DashboardData;
  t: (k: string, o?: Record<string, string>) => string;
  year: string;
  lang: string;
}) {
  // Aurora tile language: plain surface-card-solid divs, no border, no icons,
  // tight text hierarchy. Mint variant tints the value in `text-positive`.
  const tileBase = 'bg-surface-card-solid rounded-[18px] p-4';
  const labelCls = 'text-text-muted text-[11px] font-semibold leading-tight mb-2.5';
  const valueBase = 'text-[1.45rem] font-bold tracking-[-0.02em] leading-none mb-1.5 tabular-nums';
  const ctxCls = 'text-text-muted text-[11px] font-medium leading-tight';

  const monthName = data.currentEntry ? formatMonthLong(data.currentEntry.date, lang) : '';

  const growthPositive = data.growthYTD >= 0;
  const growthValueCls = growthPositive ? 'text-positive' : 'text-negative';

  return (
    <div className="grid grid-cols-2 gap-2.5">
      {/* Tile 1 — yearTotal */}
      <div className={tileBase}>
        <p className={labelCls}>{t('dashboard.yearTotal', { year })}</p>
        <p className={`${valueBase} text-text-primary`}>
          {data.yearTotal != null ? fmtCurrency(data.yearTotal) : '—'}
        </p>
        <p className={ctxCls}>{year}</p>
      </div>

      {/* Tile 2 — monthlyIncome */}
      <div className={tileBase}>
        <p className={labelCls}>{t('dashboard.monthlyIncome')}</p>
        <p className={`${valueBase} text-text-primary`}>{fmtCurrency(data.monthlyIncome)}</p>
        <p className={`${ctxCls} capitalize`}>{monthName}</p>
      </div>

      {/* Tile 3 — growthYTD (mint when positive) */}
      <div className={tileBase}>
        <p className={labelCls}>{t('dashboard.growthYTD')}</p>
        <p className={`${valueBase} ${growthValueCls}`}>{fmtPercent(data.growthYTD)}</p>
        <p className={ctxCls}>{t('dashboard.vsYearStart')}</p>
      </div>

      {/* Tile 4 — avgMonthly */}
      <div className={tileBase}>
        <p className={labelCls}>{t('dashboard.avgMonthly')}</p>
        <p className={`${valueBase} text-text-primary`}>{fmtCurrency(data.avgMonthlyYTD)}</p>
        <p className={ctxCls}>{t('analytics.perMonth')}</p>
      </div>

      {/* Wide row — bestMonth (mint) */}
      {data.bestMonth && (
        <div className={`${tileBase} col-span-2`}>
          <p className={labelCls}>{t('dashboard.bestMonth')}</p>
          <p className={`${valueBase} text-positive`}>
            +{fmtCurrencyCompact(data.bestMonth.delta)}
          </p>
          <p className={`${ctxCls} capitalize`}>{data.bestMonth.month}</p>
        </div>
      )}
    </div>
  );
}

// ─── Sparkline Card ────────────────────────────────────────

function SparklineCard({ data, t }: { data: number[]; t: (k: string) => string }) {
  const reducedMotion = usePrefersReducedMotion();
  const label = t('dashboard.trend12mo');

  return (
    <motion.div
      initial={reducedMotion ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="solid-card p-4 overflow-hidden"
    >
      <p className="text-text-muted text-xs font-medium mb-2">{label}</p>
      <MiniSparkline values={data} className="w-full h-20" ariaLabel={label} />
    </motion.div>
  );
}

// ─── Account Breakdown ─────────────────────────────────────

function AccountBreakdown({ data, t }: { data: DashboardData; t: (k: string) => string }) {
  const reducedMotion = usePrefersReducedMotion();
  // Default: backend order (custom). Client-side view-only sort.
  const [sortMode, setSortMode] = useState<SortMode>('custom');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const sortedAccounts = useMemo(
    () => sortAccounts(data.accountBreakdown, sortMode, sortDir),
    [data.accountBreakdown, sortMode, sortDir],
  );

  return (
    <motion.div
      initial={reducedMotion ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.35 }}
    >
      <div className="flex items-center justify-between mb-2 gap-2">
        <p className="text-text-muted text-xs font-medium">{t('accounts.title')}</p>
        <AccountSortControl
          mode={sortMode}
          dir={sortDir}
          onModeChange={setSortMode}
          onDirChange={setSortDir}
        />
      </div>
      <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar">
        {sortedAccounts.map((acc) => (
          <Card key={acc.accountId} className="shrink-0 w-36 p-3">
            <div className="flex items-center gap-2 mb-2">
              <AccountIcon
                iconUrl={acc.iconUrl}
                icon={acc.icon}
                name={acc.name}
                color={acc.color}
                size={28}
              />
              <span className="text-xs text-text-secondary truncate">{acc.name}</span>
            </div>
            <p className="text-base font-bold">{fmtCurrency(acc.amount)}</p>
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
      <p className="text-text-muted text-xs font-medium mb-2">{t('dashboard.recentEntries')}</p>
      <Card className="space-y-1">
        {entries.map((entry) => (
          <div
            key={entry.id}
            className="flex items-center justify-between rounded-md px-3 py-2 odd:bg-surface-elevated/40"
          >
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
