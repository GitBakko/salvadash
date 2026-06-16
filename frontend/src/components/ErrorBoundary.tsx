import { Component, type ErrorInfo, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertTriangle } from 'lucide-react';

// ─── Error Boundaries ──────────────────────────────────────
// Two layers protect the app:
//  1. <ErrorBoundary> (this class) wraps the whole tree in main.tsx and catches
//     catastrophic shell/router crashes → full-page fallback + reload.
//  2. The router's `defaultErrorComponent` (RouteErrorFallback) catches per-route
//     render errors inside the Outlet, so Header/BottomNav stay alive and the
//     user can retry just the failed route.

function FullPageError({ onReload }: { onReload: () => void }) {
  const { t } = useTranslation();
  return (
    <div className="min-h-dvh bg-surface-base text-text-primary flex items-center justify-center p-6">
      <div className="flex flex-col items-center gap-4 text-center max-w-sm">
        <div className="w-14 h-14 rounded-full bg-negative/10 flex items-center justify-center">
          <AlertTriangle size={28} className="text-negative" strokeWidth={1.5} />
        </div>
        <h1 className="text-lg font-semibold">{t('errors.title')}</h1>
        <p className="text-sm text-text-secondary">{t('errors.message')}</p>
        <button
          onClick={onReload}
          className="mt-2 px-4 py-2 rounded-lg bg-brand text-surface-base text-sm font-medium"
        >
          {t('errors.reload')}
        </button>
      </div>
    </div>
  );
}

/** In-content fallback for a single failed route — shell (header/nav) persists. */
export function RouteErrorFallback({ reset }: { error: Error; reset: () => void }) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-16 px-6 text-center">
      <div className="w-12 h-12 rounded-full bg-negative/10 flex items-center justify-center">
        <AlertTriangle size={24} className="text-negative" strokeWidth={1.5} />
      </div>
      <h2 className="text-base font-semibold">{t('errors.title')}</h2>
      <p className="text-sm text-text-secondary max-w-xs">{t('errors.message')}</p>
      <button
        onClick={reset}
        className="mt-1 px-4 py-2 rounded-lg bg-brand text-surface-base text-sm font-medium"
      >
        {t('errors.retry')}
      </button>
    </div>
  );
}

interface Props {
  children: ReactNode;
}
interface State {
  hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    // Hook point for error tracking (Sentry — A-tier #9).
    console.error('Uncaught UI error:', error, info.componentStack);
  }

  private handleReload = (): void => {
    window.location.reload();
  };

  render(): ReactNode {
    if (this.state.hasError) {
      return <FullPageError onReload={this.handleReload} />;
    }
    return this.props.children;
  }
}
