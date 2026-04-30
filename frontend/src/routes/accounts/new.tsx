import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { ArrowLeft } from 'lucide-react';
import { AccountForm } from '../../components/AccountForm';

export const Route = createFileRoute('/accounts/new')({
  component: NewAccountPage,
});

function NewAccountPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
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
        <h1 className="font-heading text-lg font-bold">{t('accounts.addAccount')}</h1>
      </header>
      <main className="p-4 max-w-lg mx-auto">
        <AccountForm
          account={null}
          onSuccess={() => navigate({ to: '/accounts' })}
          onCancel={() => navigate({ to: '/accounts' })}
        />
      </main>
    </div>
  );
}
