import { createLazyFileRoute } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowDown, ArrowUp, ChevronRight, Trash2, CalendarDays } from 'lucide-react';
import type { EntryListItem } from '@salvadash/shared';
import { useEntries, useEntry, useDeleteEntry } from '../hooks/queries';
import { Card, Skeleton, BottomSheet, Button } from '../components/ui';
import { fmtCurrency } from '../lib/format';
import { formatDateLongDay, formatDateShort, formatMonthName } from '../lib/intl';

export const Route = createLazyFileRoute('/history')({
  component: HistoryPage,
});

// ─── Utilities ─────────────────────────────────────────────

function formatDate(dateStr: string, lang: string): string {
  return formatDateLongDay(dateStr, lang);
}

function formatMonthShort(dateStr: string, lang: string): string {
  return formatMonthName(dateStr, lang).toUpperCase();
}

function formatDay(dateStr: string): string {
  return new Date(dateStr).getDate().toString();
}

// ─── History Page ──────────────────────────────────────────

function HistoryPage() {
  const { t, i18n } = useTranslation();
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(String(currentYear));
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const { data, isLoading } = useEntries(year);

  const years = Array.from({ length: currentYear - 2022 }, (_, i) => String(currentYear - i));
  const entries = data?.data ?? [];

  return (
    <div className="p-4 max-w-lg mx-auto space-y-4">
      {/* Header */}
      <h1 className="font-heading text-2xl font-bold">{t('entries.title')}</h1>

      {/* Year filter pills */}
      <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
        {years.map((y) => (
          <button
            key={y}
            onClick={() => setYear(y)}
            className={`shrink-0 px-3 py-1 rounded-full text-sm font-medium transition-all ${
              year === y
                ? 'bg-brand text-surface-base'
                : 'bg-surface-elevated text-text-secondary hover:text-text-primary'
            }`}
          >
            {y}
          </button>
        ))}
      </div>

      {/* Content */}
      {isLoading ? (
        <HistorySkeleton />
      ) : entries.length === 0 ? (
        <EmptyState t={t} />
      ) : (
        <div className="space-y-3">
          <AnimatePresence mode="popLayout">
            {entries.map((entry, i) => (
              <motion.div
                key={entry.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ delay: i * 0.03 }}
                layout
              >
                <EntryCard
                  entry={entry}
                  lang={i18n.language}
                  onTap={() => setSelectedId(entry.id)}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Entry detail bottom sheet */}
      {selectedId && <EntryDetailSheet entryId={selectedId} onClose={() => setSelectedId(null)} />}
    </div>
  );
}

// ─── Entry Card ────────────────────────────────────────────

function EntryCard({
  entry,
  lang,
  onTap,
}: {
  entry: EntryListItem;
  lang: string;
  onTap: () => void;
}) {
  const hasDelta = entry.delta != null;
  const isPositive = (entry.delta ?? 0) >= 0;

  return (
    <Card
      className="p-0 overflow-hidden cursor-pointer active:scale-[0.98] transition-transform"
      onClick={onTap}
    >
      <div className="flex items-stretch">
        {/* Date column */}
        <div className="w-16 shrink-0 flex flex-col items-center justify-center py-3 bg-surface-elevated/50 border-r border-border-default">
          <span className="text-[10px] font-semibold text-brand uppercase tracking-wider">
            {formatMonthShort(entry.date, lang)}
          </span>
          <span className="text-xl font-bold text-text-primary leading-tight">
            {formatDay(entry.date)}
          </span>
        </div>

        {/* Main content */}
        <div className="flex-1 px-3 py-3 flex items-center justify-between min-w-0">
          <div className="min-w-0">
            <p className="text-base font-bold text-text-primary">
              {fmtCurrency(entry.total)}
            </p>
            {entry.totalIncome > 0 && (
              <p className="text-xs text-text-muted mt-0.5 flex items-center gap-0.5">
                <ArrowDown size={12} />
                {fmtCurrency(entry.totalIncome)}
              </p>
            )}
          </div>

          {/* Delta badge */}
          {hasDelta && (
            <div
              className={`shrink-0 flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold ${
                isPositive ? 'bg-positive/15 text-positive' : 'bg-negative/15 text-negative'
              }`}
            >
              {isPositive ? <ArrowUp size={14} /> : <ArrowDown size={14} />}
              <span>
                {isPositive ? '+' : ''}
                {fmtCurrency(entry.delta!)}
              </span>
              {entry.deltaPercent != null && (
                <span className="text-[10px] opacity-70">
                  ({isPositive ? '+' : ''}
                  {entry.deltaPercent.toFixed(1)}%)
                </span>
              )}
            </div>
          )}

          {/* Chevron */}
          <ChevronRight size={20} className="text-text-muted ml-2 shrink-0" />
        </div>
      </div>
    </Card>
  );
}

// ─── Entry Detail Bottom Sheet ─────────────────────────────

function EntryDetailSheet({ entryId, onClose }: { entryId: string; onClose: () => void }) {
  const { t, i18n } = useTranslation();
  const { data: entry, isLoading } = useEntry(entryId);
  const deleteEntry = useDeleteEntry();

  const handleDelete = () => {
    if (!confirm(t('entries.deleteConfirm'))) return;
    deleteEntry.mutate(entryId, {
      onSuccess: () => onClose(),
    });
  };

  return (
    <BottomSheet isOpen onClose={onClose} title={t('entries.details')}>
      {isLoading || !entry ? (
        <div className="space-y-3">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      ) : (
        <div className="space-y-4">
          {/* Date & total header */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-text-muted text-xs">{t('entries.date')}</p>
              <p className="font-semibold">{formatDate(entry.date, i18n.language)}</p>
            </div>
            <div className="text-right">
              <p className="text-text-muted text-xs">{t('entries.total')}</p>
              <p className="text-xl font-bold text-gold">{fmtCurrency(entry.total)}</p>
            </div>
          </div>

          {/* Balances breakdown */}
          {entry.balances.length > 0 && (
            <div>
              <p className="text-text-muted text-xs uppercase tracking-wider mb-2">
                {t('entries.balances')}
              </p>
              <div className="space-y-2">
                {entry.balances.map((b) => {
                  const pct = entry.total > 0 ? (b.amount / entry.total) * 100 : 0;
                  return (
                    <div key={b.id}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-text-secondary">{b.accountName}</span>
                        <span className="font-semibold">{fmtCurrency(b.amount)}</span>
                      </div>
                      <div className="h-1.5 bg-surface-elevated rounded-full overflow-hidden">
                        <motion.div
                          className="h-full bg-brand rounded-full"
                          initial={{ width: 0 }}
                          animate={{ width: `${pct}%` }}
                          transition={{ duration: 0.6, ease: 'easeOut' }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Incomes */}
          {entry.incomes.length > 0 && (
            <div>
              <p className="text-text-muted text-xs uppercase tracking-wider mb-2">
                {t('entries.incomes')}
              </p>
              <div className="space-y-1.5">
                {entry.incomes.map((inc) => (
                  <div key={inc.id} className="flex justify-between text-sm">
                    <span className="text-text-secondary">{inc.incomeSourceName}</span>
                    <span className="font-semibold text-positive">+{fmtCurrency(inc.amount)}</span>
                  </div>
                ))}
                <div className="flex justify-between text-sm pt-1 border-t border-border-default">
                  <span className="text-text-muted font-medium">{t('entries.totalIncome')}</span>
                  <span className="font-bold text-positive">+{fmtCurrency(entry.totalIncome)}</span>
                </div>
              </div>
            </div>
          )}

          {/* Notes */}
          {entry.notes && (
            <div>
              <p className="text-text-muted text-xs uppercase tracking-wider mb-1">
                {t('entries.notes')}
              </p>
              <p className="text-sm text-text-secondary bg-surface-elevated/50 rounded-lg p-3">
                {entry.notes}
              </p>
            </div>
          )}

          {/* Created at */}
          <p className="text-text-muted text-[10px] text-center">
            {t('entries.createdAt')} {formatDateShort(entry.createdAt, i18n.language)}
          </p>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <Button
              variant="danger"
              fullWidth
              onClick={handleDelete}
              loading={deleteEntry.isPending}
            >
              <Trash2 size={14} />
              {t('common.delete')}
            </Button>
          </div>
        </div>
      )}
    </BottomSheet>
  );
}

// ─── Empty State ───────────────────────────────────────────

function EmptyState({ t }: { t: (k: string) => string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center py-16 text-center"
    >
      <CalendarDays size={64} strokeWidth={1.5} className="text-text-muted mb-4" />
      <p className="text-text-secondary text-sm mb-1">{t('entries.noEntries')}</p>
      <p className="text-text-muted text-xs">{t('entries.noEntriesDesc')}</p>
    </motion.div>
  );
}

// ─── Skeleton ──────────────────────────────────────────────

function HistorySkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <Skeleton key={i} className="h-[72px] w-full rounded-xl" />
      ))}
    </div>
  );
}
