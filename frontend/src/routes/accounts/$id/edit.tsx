import { createFileRoute, useNavigate, useParams } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { ArrowLeft } from 'lucide-react';
import { AccountForm } from '../../../components/AccountForm';
import { useAccounts } from '../../../hooks/queries';
import { Skeleton } from '../../../components/ui/Skeleton';

export const Route = createFileRoute('/accounts/$id/edit')({
  component: EditAccountPage,
});

function EditAccountPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams({ from: '/accounts/$id/edit' });
  const { data: accounts, isLoading } = useAccounts();
  const account = accounts?.find((a) => a.id === id) ?? null;

  return (
    <div className="min-h-dvh bg-surface-base text-text-primary">
      <header className="sticky top-0 z-10 bg-surface-base/95 backdrop-blur-md border-b border-border-default px-4 py-3 flex items-center gap-3">
        <button
          onClick={() => navigate({ to: '/accounts' })}
          className="p-2 -m-2 min-h-11 min-w-11 inline-flex items-center justify-center"
          aria-label={t('common.back')}
        >
          <ArrowLeft size={22} />
        </button>
        <h1 className="font-heading text-lg font-bold">{t('accounts.editAccount')}</h1>
      </header>
      <main className="p-4 max-w-lg mx-auto">
        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        ) : account ? (
          <AccountForm
            account={account}
            onSuccess={() => navigate({ to: '/accounts' })}
            onCancel={() => navigate({ to: '/accounts' })}
          />
        ) : (
          <p className="text-text-muted text-sm">Conto non trovato.</p>
        )}
      </main>
    </div>
  );
}
