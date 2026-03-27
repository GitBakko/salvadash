import { createFileRoute } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { useState } from 'react';
import { motion, Reorder, AnimatePresence } from 'framer-motion';
import type { AccountPublic } from '@salvadash/shared';
import { useAccounts, useDeleteAccount, useUpdateAccount, useReorderAccounts } from '../hooks/queries';
import { useUIStore } from '../stores/ui-store';
import { Button, Card, Skeleton } from '../components/ui';
import { AccountFormModal } from '../components/AccountFormModal';

export const Route = createFileRoute('/accounts')({
  component: AccountsPage,
});

// ─── Color palette for accounts ────────────────────────────

const ACCOUNT_COLORS = [
  '#00d4a0', '#4d9fff', '#ffd166', '#a78bfa', '#ff4567',
  '#f472b6', '#38bdf8', '#facc15', '#34d399', '#fb923c',
];

function getAccountColor(account: AccountPublic, index: number): string {
  return account.color ?? ACCOUNT_COLORS[index % ACCOUNT_COLORS.length];
}

// ─── Main page ─────────────────────────────────────────────

function AccountsPage() {
  const { t } = useTranslation();
  const { data: accounts, isLoading } = useAccounts();
  const deleteAccount = useDeleteAccount();
  const updateAccount = useUpdateAccount();
  const reorderAccounts = useReorderAccounts();
  const addToast = useUIStore((s) => s.addToast);

  const [editingAccount, setEditingAccount] = useState<AccountPublic | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [orderedAccounts, setOrderedAccounts] = useState<AccountPublic[] | null>(null);

  // Use ordered local state if user is dragging, otherwise server data
  const displayAccounts = orderedAccounts ?? accounts ?? [];

  // Sync server data into local when it changes (and not dragging)
  const serverAccountsKey = accounts?.map((a) => a.id).join(',');

  function handleReorder(newOrder: AccountPublic[]) {
    setOrderedAccounts(newOrder);
  }

  function commitReorder() {
    if (!orderedAccounts) return;
    const mapped = orderedAccounts.map((a, i) => ({ id: a.id, sortOrder: i }));
    reorderAccounts.mutate(mapped, {
      onSuccess: () => setOrderedAccounts(null),
      onError: () => {
        setOrderedAccounts(null);
        addToast({ type: 'error', message: t('common.error') });
      },
    });
  }

  function handleToggleActive(account: AccountPublic) {
    updateAccount.mutate(
      { id: account.id, isActive: !account.isActive },
      {
        onSuccess: () => addToast({ type: 'success', message: t('common.success') }),
        onError: () => addToast({ type: 'error', message: t('common.error') }),
      },
    );
  }

  function handleDelete(account: AccountPublic) {
    setDeletingId(account.id);
    deleteAccount.mutate(account.id, {
      onSuccess: () => {
        addToast({ type: 'success', message: t('common.success') });
        setDeletingId(null);
      },
      onError: () => {
        addToast({ type: 'error', message: t('common.error') });
        setDeletingId(null);
      },
    });
  }

  function openEdit(account: AccountPublic) {
    setEditingAccount(account);
    setShowForm(true);
  }

  function openCreate() {
    setEditingAccount(null);
    setShowForm(true);
  }

  // ─── Loading ───────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="p-4 max-w-lg mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton width={180} height={28} />
          <Skeleton width={100} height={36} variant="rectangular" />
        </div>
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} height={80} variant="rectangular" />
        ))}
      </div>
    );
  }

  // ─── Empty state ───────────────────────────────────────────

  if (!accounts?.length) {
    return (
      <div className="p-4 max-w-lg mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center justify-center py-20 text-center"
        >
          <span className="icon text-text-muted text-[64px] mb-4">account_balance_wallet</span>
          <h2 className="font-heading text-xl font-semibold mb-2">{t('accounts.title')}</h2>
          <p className="text-text-secondary text-sm mb-6 max-w-xs">{t('accounts.createFirst')}</p>
          <Button onClick={openCreate}>
            <span className="icon text-lg">add</span>
            {t('accounts.addAccount')}
          </Button>
        </motion.div>

        <AnimatePresence>
          {showForm && (
            <AccountFormModal
              account={editingAccount}
              onClose={() => setShowForm(false)}
            />
          )}
        </AnimatePresence>
      </div>
    );
  }

  // ─── Account list ──────────────────────────────────────────

  return (
    <div className="p-4 max-w-lg mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="font-heading text-xl font-semibold">{t('accounts.title')}</h2>
        <Button size="sm" onClick={openCreate}>
          <span className="icon text-lg">add</span>
          {t('accounts.addAccount')}
        </Button>
      </div>

      {/* Reorder list */}
      <Reorder.Group
        axis="y"
        values={displayAccounts}
        onReorder={handleReorder}
        className="space-y-3"
        key={serverAccountsKey}
      >
        {displayAccounts.map((account, idx) => (
          <Reorder.Item
            key={account.id}
            value={account}
            onDragEnd={commitReorder}
            whileDrag={{ scale: 1.02, boxShadow: '0 8px 32px rgba(0,0,0,0.3)' }}
          >
            <AccountCard
              account={account}
              color={getAccountColor(account, idx)}
              onEdit={() => openEdit(account)}
              onDelete={() => handleDelete(account)}
              onToggleActive={() => handleToggleActive(account)}
              isDeleting={deletingId === account.id}
            />
          </Reorder.Item>
        ))}
      </Reorder.Group>

      {/* Form modal */}
      <AnimatePresence>
        {showForm && (
          <AccountFormModal
            account={editingAccount}
            onClose={() => setShowForm(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Account Card ──────────────────────────────────────────

interface AccountCardProps {
  account: AccountPublic;
  color: string;
  onEdit: () => void;
  onDelete: () => void;
  onToggleActive: () => void;
  isDeleting: boolean;
}

function AccountCard({ account, color, onEdit, onDelete, onToggleActive, isDeleting }: AccountCardProps) {
  const { t } = useTranslation();

  return (
    <Card className={`p-4 ${!account.isActive ? 'opacity-50' : ''}`}>
      <div className="flex items-center gap-3">
        {/* Drag handle + color indicator */}
        <div className="flex items-center gap-2 shrink-0">
          <span className="icon text-text-muted text-lg cursor-grab active:cursor-grabbing">drag_indicator</span>
          <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: color }} />
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm truncate">{account.name}</span>
            <span className="text-[10px] uppercase tracking-wider text-text-muted bg-surface-elevated px-1.5 py-0.5 rounded">
              {account.type === 'MAIN' ? t('accounts.main') : t('accounts.sub')}
            </span>
          </div>
          <span className="text-xs text-text-muted">
            {account.isActive ? t('accounts.active') : t('accounts.inactive')}
          </span>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={onToggleActive}
            className="p-1.5 rounded-[var(--radius-sm)] hover:bg-surface-elevated transition-colors"
            aria-label={account.isActive ? 'Deactivate' : 'Activate'}
          >
            <span className={`icon text-lg ${account.isActive ? 'text-brand' : 'text-text-muted'}`}>
              {account.isActive ? 'toggle_on' : 'toggle_off'}
            </span>
          </button>
          <button
            onClick={onEdit}
            className="p-1.5 rounded-[var(--radius-sm)] hover:bg-surface-elevated transition-colors"
            aria-label={t('common.edit')}
          >
            <span className="icon text-lg text-text-secondary">edit</span>
          </button>
          <button
            onClick={onDelete}
            disabled={isDeleting}
            className="p-1.5 rounded-[var(--radius-sm)] hover:bg-negative/10 transition-colors disabled:opacity-50"
            aria-label={t('common.delete')}
          >
            <span className="icon text-lg text-negative">delete</span>
          </button>
        </div>
      </div>
    </Card>
  );
}
