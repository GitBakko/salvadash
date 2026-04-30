import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { useMemo, useState } from 'react';
import { Reorder, AnimatePresence, useDragControls, motion } from 'framer-motion';
import type { AccountPublic } from '@salvadash/shared';
import {
  useAccounts,
  useDeleteAccount,
  useUpdateAccount,
  useReorderAccounts,
} from '../hooks/queries';
import { useMediaQuery } from '../hooks/use-media-query';
import { useUIStore } from '../stores/ui-store';
import { Button, Card, Skeleton, Toggle } from '../components/ui';
import { AccountFormModal } from '../components/AccountFormModal';
import { AccountIcon } from '../components/AccountIcon';
import {
  AccountSortControl,
  sortAccounts,
  type SortMode,
  type SortDir,
} from '../components/AccountSortControl';
import { fmtCurrency } from '../lib/format';
import { Wallet, Plus, GripVertical, Pencil, Trash2 } from 'lucide-react';

export const Route = createFileRoute('/accounts')({
  component: AccountsPage,
});

// ─── Color palette for accounts ────────────────────────────

const ACCOUNT_COLORS = [
  '#3DDC97',
  '#4d9fff',
  '#ffd166',
  '#a78bfa',
  '#ff4567',
  '#f472b6',
  '#38bdf8',
  '#facc15',
  '#34d399',
  '#fb923c',
];

function getAccountColor(account: AccountPublic, index: number): string {
  return account.color ?? ACCOUNT_COLORS[index % ACCOUNT_COLORS.length];
}

// ─── Main page ─────────────────────────────────────────────

function AccountsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const isDesktop = useMediaQuery('(min-width: 768px)');
  const { data: accounts, isLoading } = useAccounts();
  const deleteAccount = useDeleteAccount();
  const updateAccount = useUpdateAccount();
  const reorderAccounts = useReorderAccounts();
  const addToast = useUIStore((s) => s.addToast);

  const [editingAccount, setEditingAccount] = useState<AccountPublic | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [orderedActive, setOrderedActive] = useState<AccountPublic[] | null>(null);
  // Default: custom (drag-drop order). When mode !== 'custom' the list is
  // rendered as a plain non-draggable list — drag handles disappear.
  const [sortMode, setSortMode] = useState<SortMode>('custom');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  // Split accounts into active (draggable) and inactive (locked at bottom)
  const { activeAccounts, inactiveAccounts } = useMemo(() => {
    const all = accounts ?? [];
    return {
      activeAccounts: all.filter((a) => a.isActive),
      inactiveAccounts: all.filter((a) => !a.isActive),
    };
  }, [accounts]);

  const displayActive = orderedActive ?? activeAccounts;

  // For non-custom modes we render a flat sorted list. Map `sortOrder` →
  // `orderIndex` so the shared helper can short-circuit the custom branch.
  const sortedActive = useMemo(() => {
    if (sortMode === 'custom') return displayActive;
    return sortAccounts(
      displayActive.map((a) => ({ ...a, orderIndex: a.sortOrder })),
      sortMode,
      sortDir,
    );
  }, [displayActive, sortMode, sortDir]);
  const sortedInactive = useMemo(() => {
    if (sortMode === 'custom') return inactiveAccounts;
    return sortAccounts(
      inactiveAccounts.map((a) => ({ ...a, orderIndex: a.sortOrder })),
      sortMode,
      sortDir,
    );
  }, [inactiveAccounts, sortMode, sortDir]);

  // Sync key for resetting Reorder.Group when server data changes
  const serverActiveKey = activeAccounts.map((a) => a.id).join(',');

  function handleReorder(newOrder: AccountPublic[]) {
    setOrderedActive(newOrder);
  }

  function commitReorder() {
    if (!orderedActive) return;
    // Active accounts get sortOrder 0..N, inactive keep theirs after
    const mapped = orderedActive.map((a, i) => ({ id: a.id, sortOrder: i }));
    inactiveAccounts.forEach((a, i) => {
      mapped.push({ id: a.id, sortOrder: orderedActive.length + i });
    });
    reorderAccounts.mutate(mapped, {
      onSuccess: () => setOrderedActive(null),
      onError: () => {
        setOrderedActive(null);
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
    if (isDesktop) {
      setEditingAccount(account);
      setShowForm(true);
    } else {
      navigate({ to: '/accounts/$id/edit', params: { id: account.id } });
    }
  }

  function openCreate() {
    if (isDesktop) {
      setEditingAccount(null);
      setShowForm(true);
    } else {
      navigate({ to: '/accounts/new' });
    }
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
          <Wallet size={64} className="text-text-muted mb-4" strokeWidth={1.5} />
          <h1 className="font-heading text-xl font-semibold mb-2">{t('accounts.title')}</h1>
          <p className="text-text-secondary text-sm mb-6 max-w-xs">{t('accounts.createFirst')}</p>
          <Button onClick={openCreate}>
            <Plus size={20} />
            {t('accounts.addAccount')}
          </Button>
        </motion.div>

        <AnimatePresence>
          {showForm && (
            <AccountFormModal account={editingAccount} onClose={() => setShowForm(false)} />
          )}
        </AnimatePresence>
      </div>
    );
  }

  // ─── Account list ──────────────────────────────────────────

  return (
    <div className="p-4 max-w-lg mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <h1 className="font-heading text-xl font-semibold">{t('accounts.title')}</h1>
        <Button size="sm" onClick={openCreate}>
          <Plus size={20} />
          {t('accounts.addAccount')}
        </Button>
      </div>

      {/* Sort control row */}
      <div className="flex justify-end">
        <AccountSortControl
          mode={sortMode}
          dir={sortDir}
          onModeChange={setSortMode}
          onDirChange={setSortDir}
        />
      </div>

      {/* Active accounts — draggable in custom mode, plain list otherwise */}
      {sortMode === 'custom' ? (
        <Reorder.Group
          axis="y"
          values={displayActive}
          onReorder={handleReorder}
          className="space-y-3"
          key={serverActiveKey}
        >
          {displayActive.map((account, idx) => (
            <DraggableAccountCard
              key={account.id}
              account={account}
              color={getAccountColor(account, idx)}
              onEdit={() => openEdit(account)}
              onDelete={() => handleDelete(account)}
              onToggleActive={() => handleToggleActive(account)}
              isDeleting={deletingId === account.id}
              onDragEnd={commitReorder}
            />
          ))}
        </Reorder.Group>
      ) : (
        <div className="space-y-3">
          {sortedActive.map((account, idx) => (
            <AccountCard
              key={account.id}
              account={account}
              color={getAccountColor(account, idx)}
              onEdit={() => openEdit(account)}
              onDelete={() => handleDelete(account)}
              onToggleActive={() => handleToggleActive(account)}
              isDeleting={deletingId === account.id}
            />
          ))}
        </div>
      )}

      {/* Inactive accounts — locked at bottom, not draggable */}
      {sortedInactive.length > 0 && (
        <div className="space-y-3">
          {sortedInactive.map((account, idx) => (
            <AccountCard
              key={account.id}
              account={account}
              color={getAccountColor(account, activeAccounts.length + idx)}
              onEdit={() => openEdit(account)}
              onDelete={() => handleDelete(account)}
              onToggleActive={() => handleToggleActive(account)}
              isDeleting={deletingId === account.id}
            />
          ))}
        </div>
      )}

      {/* Form modal */}
      <AnimatePresence>
        {showForm && (
          <AccountFormModal account={editingAccount} onClose={() => setShowForm(false)} />
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Draggable Account Card (active accounts) ─────────────

interface DraggableAccountCardProps {
  account: AccountPublic;
  color: string;
  onEdit: () => void;
  onDelete: () => void;
  onToggleActive: () => void;
  isDeleting: boolean;
  onDragEnd: () => void;
}

function DraggableAccountCard({
  account,
  color,
  onEdit,
  onDelete,
  onToggleActive,
  isDeleting,
  onDragEnd,
}: DraggableAccountCardProps) {
  const dragControls = useDragControls();

  return (
    <Reorder.Item
      value={account}
      dragListener={false}
      dragControls={dragControls}
      onDragEnd={onDragEnd}
      whileDrag={{ scale: 1.02, boxShadow: '0 8px 32px rgba(0,0,0,0.3)' }}
    >
      <AccountCardContent
        account={account}
        color={color}
        onEdit={onEdit}
        onDelete={onDelete}
        onToggleActive={onToggleActive}
        isDeleting={isDeleting}
        onGripPointerDown={(e) => dragControls.start(e)}
      />
    </Reorder.Item>
  );
}

// ─── Static Account Card (inactive accounts) ──────────────

interface AccountCardProps {
  account: AccountPublic;
  color: string;
  onEdit: () => void;
  onDelete: () => void;
  onToggleActive: () => void;
  isDeleting: boolean;
}

function AccountCard({ account, color, onEdit, onDelete, onToggleActive, isDeleting }: AccountCardProps) {
  return (
    <AccountCardContent
      account={account}
      color={color}
      onEdit={onEdit}
      onDelete={onDelete}
      onToggleActive={onToggleActive}
      isDeleting={isDeleting}
    />
  );
}

// ─── Shared Card Content ──────────────────────────────────

interface AccountCardContentProps {
  account: AccountPublic;
  color: string;
  onEdit: () => void;
  onDelete: () => void;
  onToggleActive: () => void;
  isDeleting: boolean;
  onGripPointerDown?: (e: React.PointerEvent) => void;
}

function AccountCardContent({
  account,
  color,
  onEdit,
  onDelete,
  onToggleActive,
  isDeleting,
  onGripPointerDown,
}: AccountCardContentProps) {
  const { t } = useTranslation();
  const canDelete = account.entryCount === 0;

  return (
    <Card className={`p-4 ${!account.isActive ? 'opacity-50' : ''}`}>
      <div className="flex items-center gap-3">
        {/* Drag handle + account icon */}
        <div className="flex items-center gap-2 shrink-0">
          {onGripPointerDown ? (
            <button
              className="p-1.5 -m-1.5 text-text-muted cursor-grab active:cursor-grabbing select-none touch-none hover:text-brand transition-colors"
              onPointerDown={onGripPointerDown}
              aria-label="Drag to reorder"
            >
              <GripVertical size={20} />
            </button>
          ) : (
            <div className="p-1.5 -m-1.5 text-text-muted/30">
              <GripVertical size={20} />
            </div>
          )}
          <AccountIcon
            iconUrl={account.iconUrl}
            icon={account.icon}
            name={account.name}
            color={color}
            size={32}
          />
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm truncate">{account.name}</span>
            <span className="text-xs font-medium text-text-muted bg-surface-elevated px-1.5 py-0.5 rounded">
              {account.type === 'MAIN' ? t('accounts.main') : t('accounts.sub')}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-text-muted">
              {account.isActive ? t('accounts.active') : t('accounts.inactive')}
            </span>
            <span className="text-xs font-semibold text-text-secondary tabular-nums">
              {fmtCurrency(account.amount)}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1.5 shrink-0">
          <Toggle
            checked={account.isActive}
            onChange={onToggleActive}
            aria-label={account.isActive ? t('accounts.active') : t('accounts.inactive')}
          />
          <button
            onClick={onEdit}
            className="p-2.5 -m-1 rounded-sm hover:bg-surface-elevated transition-colors text-text-secondary"
            aria-label={t('common.edit')}
          >
            <Pencil size={18} />
          </button>
          {canDelete && (
            <button
              onClick={onDelete}
              disabled={isDeleting}
              className="p-2.5 -m-1 rounded-sm hover:bg-negative/10 transition-colors text-negative disabled:opacity-50"
              aria-label={t('common.delete')}
            >
              <Trash2 size={18} />
            </button>
          )}
        </div>
      </div>
    </Card>
  );
}
