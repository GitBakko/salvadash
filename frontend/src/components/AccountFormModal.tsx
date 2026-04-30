import { useTranslation } from 'react-i18next';
import { useState, type FormEvent } from 'react';
import { Tag } from 'lucide-react';
import type { AccountPublic } from '@salvadash/shared';
import { useCreateAccount, useUpdateAccount } from '../hooks/queries';
import { useUIStore } from '../stores/ui-store';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';
import { Input } from './ui/Input';

const COLOR_OPTIONS = [
  '#00d4a0',
  '#4d9fff',
  '#ffd166',
  '#a78bfa',
  '#ff4567',
  '#f472b6',
  '#38bdf8',
  '#facc15',
  '#34d399',
  '#fb923c',
  '#818cf8',
  '#e879f9',
];

// These are Material Symbols names stored in the DB — keep as strings
const ICON_OPTIONS = [
  'account_balance',
  'savings',
  'credit_card',
  'wallet',
  'currency_bitcoin',
  'trending_up',
  'payments',
  'account_balance_wallet',
  'monetization_on',
  'attach_money',
  'show_chart',
  'pie_chart',
];

interface Props {
  account: AccountPublic | null;
  onClose: () => void;
}

export function AccountFormModal({ account, onClose }: Props) {
  const { t } = useTranslation();
  const createAccount = useCreateAccount();
  const updateAccount = useUpdateAccount();
  const addToast = useUIStore((s) => s.addToast);

  const isEditing = !!account;

  const [name, setName] = useState(account?.name ?? '');
  const [type, setType] = useState<'MAIN' | 'SUB'>(account?.type ?? 'MAIN');
  const [icon, setIcon] = useState(account?.icon ?? 'account_balance');
  const [color, setColor] = useState(account?.color ?? COLOR_OPTIONS[0]);
  const [error, setError] = useState('');

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError(t('accounts.accountName'));
      return;
    }

    try {
      if (isEditing) {
        await updateAccount.mutateAsync({ id: account.id, name: name.trim(), type, icon, color });
      } else {
        await createAccount.mutateAsync({ name: name.trim(), type, icon, color });
      }
      addToast({ type: 'success', message: t('common.success') });
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t('common.error'));
    }
  }

  const isLoading = createAccount.isPending || updateAccount.isPending;

  return (
    <Modal
      isOpen
      onClose={onClose}
      title={isEditing ? t('accounts.editAccount') : t('accounts.addAccount')}
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <div className="bg-negative/10 border border-negative/30 rounded-md px-4 py-2.5 text-sm text-negative">
            {error}
          </div>
        )}

        <Input
          label={t('accounts.accountName')}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="es. Conto Corrente"
          required
          icon={<Tag size={20} />}
        />

        {/* Type selector */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-text-secondary">
            {t('accounts.accountType')}
          </label>
          <div className="flex gap-2">
            {(['MAIN', 'SUB'] as const).map((t_) => (
              <button
                key={t_}
                type="button"
                onClick={() => setType(t_)}
                className={`flex-1 py-2 rounded-md text-sm font-medium transition-all ${
                  type === t_
                    ? 'bg-brand/15 text-brand border border-brand/40'
                    : 'bg-surface-elevated text-text-secondary border border-border-default hover:border-border-active'
                }`}
              >
                {t_ === 'MAIN' ? t('accounts.main') : t('accounts.sub')}
              </button>
            ))}
          </div>
        </div>

        {/* Icon selector — Material Symbols (stored in DB) */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-text-secondary">Icona</label>
          <div className="grid grid-cols-6 gap-2">
            {ICON_OPTIONS.map((ic) => (
              <button
                key={ic}
                type="button"
                onClick={() => setIcon(ic)}
                className={`p-2.5 rounded-md flex items-center justify-center transition-all ${
                  icon === ic
                    ? 'bg-brand/15 text-brand border border-brand/40'
                    : 'bg-surface-elevated text-text-secondary border border-transparent hover:border-border-default'
                }`}
              >
                <span className="icon text-xl">{ic}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Color selector */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-text-secondary">Colore</label>
          <div className="flex flex-wrap gap-2">
            {COLOR_OPTIONS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                className={`w-8 h-8 rounded-full transition-all ${
                  color === c
                    ? 'ring-2 ring-offset-2 ring-offset-surface-base ring-brand scale-110'
                    : 'hover:scale-110'
                }`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <Button variant="secondary" fullWidth onClick={onClose} type="button">
            {t('common.cancel')}
          </Button>
          <Button fullWidth type="submit" loading={isLoading}>
            {isEditing ? t('common.save') : t('common.create')}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
