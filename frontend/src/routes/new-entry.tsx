import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  useAccounts,
  useIncomeSources,
  useCreateEntry,
  useCreateIncomeSource,
} from '../hooks/queries';
import { Button, Input, Card } from '../components/ui';
import { fmtCurrency } from '../lib/format';

export const Route = createFileRoute('/new-entry')({
  component: NewEntryPage,
});

// ─── Utilities ─────────────────────────────────────────────

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

// ─── Types ─────────────────────────────────────────────────

interface IncomeRow {
  sourceId: string;
  amount: string;
}

// ─── New Entry Page ────────────────────────────────────────

function NewEntryPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data: accounts, isLoading: loadingAccounts } = useAccounts();
  const { data: incomeSources, isLoading: loadingSources } = useIncomeSources();
  const createEntry = useCreateEntry();
  const createSource = useCreateIncomeSource();

  // Form state
  const [date, setDate] = useState(todayISO());
  const [balances, setBalances] = useState<Record<string, string>>({});
  const [incomeRows, setIncomeRows] = useState<IncomeRow[]>([]);
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [newSourceName, setNewSourceName] = useState('');
  const [showNewSource, setShowNewSource] = useState(false);

  const activeAccounts = useMemo(() => (accounts ?? []).filter((a) => a.isActive), [accounts]);

  // Live total calculation
  const liveTotal = useMemo(() => {
    return Object.values(balances).reduce((sum, v) => {
      const n = parseFloat(v);
      return sum + (isNaN(n) ? 0 : n);
    }, 0);
  }, [balances]);

  const totalIncome = useMemo(() => {
    return incomeRows.reduce((sum, r) => {
      const n = parseFloat(r.amount);
      return sum + (isNaN(n) ? 0 : n);
    }, 0);
  }, [incomeRows]);

  // Validation
  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!date) errs.date = 'Richiesta';
    if (new Date(date) > new Date()) errs.date = 'Non può essere nel futuro';

    const hasBalance = Object.values(balances).some((v) => parseFloat(v) > 0);
    if (!hasBalance) errs.balances = 'Inserisci almeno un saldo';

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;

    const balanceEntries = Object.entries(balances)
      .filter(([_, v]) => v !== '' && parseFloat(v) >= 0)
      .map(([accountId, amount]) => ({ accountId, amount: parseFloat(amount) }));

    const incomeEntries = incomeRows
      .filter((r) => r.sourceId && r.amount && parseFloat(r.amount) > 0)
      .map((r) => ({ incomeSourceId: r.sourceId, amount: parseFloat(r.amount) }));

    createEntry.mutate(
      {
        date,
        balances: balanceEntries,
        incomes: incomeEntries.length > 0 ? incomeEntries : undefined,
        notes: notes.trim() || undefined,
      },
      {
        onSuccess: () => navigate({ to: '/history' }),
      },
    );
  };

  const updateBalance = (accountId: string, value: string) => {
    setBalances((prev) => ({ ...prev, [accountId]: value }));
  };

  const addIncomeRow = () => {
    setIncomeRows((prev) => [...prev, { sourceId: '', amount: '' }]);
  };

  const updateIncomeRow = (index: number, field: keyof IncomeRow, value: string) => {
    setIncomeRows((prev) => prev.map((row, i) => (i === index ? { ...row, [field]: value } : row)));
  };

  const removeIncomeRow = (index: number) => {
    setIncomeRows((prev) => prev.filter((_, i) => i !== index));
  };

  const handleCreateSource = () => {
    if (!newSourceName.trim()) return;
    createSource.mutate(
      { name: newSourceName.trim() },
      {
        onSuccess: () => {
          setNewSourceName('');
          setShowNewSource(false);
        },
      },
    );
  };

  const isLoading = loadingAccounts || loadingSources;

  return (
    <div className="min-h-[100dvh] flex flex-col bg-surface-base">
      {/* Top bar */}
      <div className="flex items-center justify-between p-4 border-b border-border-default">
        <button
          onClick={() => navigate({ to: '/' })}
          className="flex items-center gap-1 text-text-secondary hover:text-text-primary transition-colors"
        >
          <span className="icon text-xl">arrow_back</span>
          <span className="text-sm">{t('common.back')}</span>
        </button>
        <h1 className="font-heading text-lg font-bold">{t('entries.newEntry')}</h1>
        <div className="w-16" /> {/* Spacer */}
      </div>

      {isLoading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin h-8 w-8 border-2 border-brand border-t-transparent rounded-full" />
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto pb-32">
          <div className="p-4 max-w-lg mx-auto space-y-5">
            {/* Date */}
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
              <Input
                type="date"
                label={t('entries.date')}
                value={date}
                onChange={(e) => setDate(e.target.value)}
                max={todayISO()}
                error={errors.date}
              />
            </motion.div>

            {/* Balances */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
            >
              <p className="text-sm font-medium text-text-secondary mb-3">
                <span className="icon text-sm align-middle mr-1">account_balance_wallet</span>
                {t('entries.balances')}
              </p>
              {errors.balances && <p className="text-xs text-negative mb-2">{errors.balances}</p>}
              <div className="space-y-2.5">
                {activeAccounts.map((account, i) => (
                  <motion.div
                    key={account.id}
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.06 * i }}
                    className="flex items-center gap-3"
                  >
                    {/* Account indicator */}
                    <div className="flex items-center gap-2 min-w-0 w-28 shrink-0">
                      {account.icon && (
                        <span
                          className="icon text-lg"
                          style={{ color: account.color ?? 'var(--color-brand)' }}
                        >
                          {account.icon}
                        </span>
                      )}
                      <span className="text-sm text-text-secondary truncate">{account.name}</span>
                    </div>
                    <div className="flex-1">
                      <input
                        type="number"
                        inputMode="decimal"
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                        value={balances[account.id] ?? ''}
                        onChange={(e) => updateBalance(account.id, e.target.value)}
                        className="w-full bg-surface-elevated/50 text-text-primary text-right
                          border border-border-default rounded-[var(--radius-md)]
                          px-3 py-2 text-sm font-mono
                          placeholder:text-text-muted
                          focus:outline-none focus:border-brand/60 focus:ring-1 focus:ring-brand/30
                          transition-all duration-200"
                      />
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            {/* Incomes */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-medium text-text-secondary">
                  <span className="icon text-sm align-middle mr-1">payments</span>
                  {t('entries.incomes')}
                </p>
                <button
                  onClick={addIncomeRow}
                  className="text-brand text-xs font-semibold flex items-center gap-0.5 hover:text-brand-hover transition-colors"
                >
                  <span className="icon text-sm">add</span>
                  {t('entries.addIncome')}
                </button>
              </div>

              <AnimatePresence mode="popLayout">
                {incomeRows.map((row, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="flex items-center gap-2 mb-2"
                  >
                    <select
                      value={row.sourceId}
                      onChange={(e) => updateIncomeRow(i, 'sourceId', e.target.value)}
                      className="flex-1 bg-surface-elevated/50 text-text-primary
                        border border-border-default rounded-[var(--radius-md)]
                        px-3 py-2 text-sm
                        focus:outline-none focus:border-brand/60 focus:ring-1 focus:ring-brand/30
                        transition-all duration-200"
                    >
                      <option value="">{t('entries.selectSource')}</option>
                      {(incomeSources ?? [])
                        .filter((s) => s.isActive)
                        .map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name}
                          </option>
                        ))}
                    </select>
                    <input
                      type="number"
                      inputMode="decimal"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      value={row.amount}
                      onChange={(e) => updateIncomeRow(i, 'amount', e.target.value)}
                      className="w-24 bg-surface-elevated/50 text-text-primary text-right
                        border border-border-default rounded-[var(--radius-md)]
                        px-3 py-2 text-sm font-mono
                        placeholder:text-text-muted
                        focus:outline-none focus:border-brand/60 focus:ring-1 focus:ring-brand/30
                        transition-all duration-200"
                    />
                    <button
                      onClick={() => removeIncomeRow(i)}
                      className="shrink-0 w-8 h-8 flex items-center justify-center text-text-muted hover:text-negative transition-colors"
                    >
                      <span className="icon text-lg">close</span>
                    </button>
                  </motion.div>
                ))}
              </AnimatePresence>

              {/* New source inline form */}
              {showNewSource ? (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="flex items-center gap-2 mt-2"
                >
                  <input
                    type="text"
                    placeholder={t('entries.sourceName')}
                    value={newSourceName}
                    onChange={(e) => setNewSourceName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleCreateSource()}
                    className="flex-1 bg-surface-elevated/50 text-text-primary
                      border border-border-default rounded-[var(--radius-md)]
                      px-3 py-2 text-sm
                      placeholder:text-text-muted
                      focus:outline-none focus:border-brand/60 focus:ring-1 focus:ring-brand/30
                      transition-all duration-200"
                    autoFocus
                  />
                  <button
                    onClick={handleCreateSource}
                    disabled={createSource.isPending}
                    className="shrink-0 w-8 h-8 flex items-center justify-center text-brand hover:text-brand-hover disabled:opacity-50 transition-colors"
                  >
                    <span className="icon text-lg">check</span>
                  </button>
                  <button
                    onClick={() => {
                      setShowNewSource(false);
                      setNewSourceName('');
                    }}
                    className="shrink-0 w-8 h-8 flex items-center justify-center text-text-muted hover:text-negative transition-colors"
                  >
                    <span className="icon text-lg">close</span>
                  </button>
                </motion.div>
              ) : (
                <button
                  onClick={() => setShowNewSource(true)}
                  className="text-text-muted text-xs flex items-center gap-0.5 hover:text-text-secondary transition-colors mt-1"
                >
                  <span className="icon text-sm">add_circle_outline</span>
                  {t('entries.newSource')}
                </button>
              )}
            </motion.div>

            {/* Notes */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
            >
              <label className="block text-sm font-medium text-text-secondary mb-1.5">
                <span className="icon text-sm align-middle mr-1">notes</span>
                {t('entries.notes')}
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                maxLength={1000}
                rows={3}
                placeholder={t('entries.notesPlaceholder')}
                className="w-full bg-surface-elevated/50 text-text-primary
                  border border-border-default rounded-[var(--radius-md)]
                  px-4 py-2.5 text-sm resize-none
                  placeholder:text-text-muted
                  focus:outline-none focus:border-brand/60 focus:ring-1 focus:ring-brand/30
                  transition-all duration-200"
              />
            </motion.div>
          </div>
        </div>
      )}

      {/* Sticky bottom: live total + save */}
      {!isLoading && (
        <motion.div
          initial={{ y: 40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="fixed bottom-0 inset-x-0 glass-card border-t border-border-default p-4"
          style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 1rem)' }}
        >
          <div className="max-w-lg mx-auto">
            {/* Live total card */}
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-text-muted text-xs uppercase tracking-wider">
                  {t('entries.liveTotal')}
                </p>
                <p className="font-heading text-2xl font-bold text-gold">
                  {fmtCurrency(liveTotal)}
                </p>
              </div>
              {totalIncome > 0 && (
                <div className="text-right">
                  <p className="text-text-muted text-xs">{t('entries.totalIncome')}</p>
                  <p className="font-semibold text-positive">+{fmtCurrency(totalIncome)}</p>
                </div>
              )}
            </div>

            <Button fullWidth size="lg" onClick={handleSubmit} loading={createEntry.isPending}>
              <span className="icon text-lg">save</span>
              {t('entries.saveEntry')}
            </Button>
          </div>
        </motion.div>
      )}
    </div>
  );
}
