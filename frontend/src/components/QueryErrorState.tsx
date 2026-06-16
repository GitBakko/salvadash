import { useTranslation } from 'react-i18next';
import { AlertTriangle } from 'lucide-react';

/** Shown when a read query fails — replaces the misleading "no data" empty state. */
export function QueryErrorState({ onRetry }: { onRetry?: () => void }) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col items-center justify-center gap-4 px-6 py-16 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-negative/10">
        <AlertTriangle size={24} className="text-negative" strokeWidth={1.5} />
      </div>
      <div>
        <p className="font-semibold text-text-primary">{t('errors.loadTitle')}</p>
        <p className="mt-1 max-w-xs text-sm text-text-secondary">{t('errors.loadMessage')}</p>
      </div>
      {onRetry && (
        <button
          onClick={onRetry}
          className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-surface-base"
        >
          {t('errors.retry')}
        </button>
      )}
    </div>
  );
}
