import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { CircleDollarSign } from 'lucide-react';
import { VersionBadge } from './VersionBadge';

interface AuthLayoutProps {
  children: ReactNode;
}

const AURORA_GRADIENT =
  'radial-gradient(60% 50% at 30% 20%, rgba(91,61,246,0.18), transparent 70%), radial-gradient(45% 35% at 80% 80%, rgba(61,220,151,0.10), transparent 70%)';

export function AuthLayout({ children }: AuthLayoutProps) {
  const { t } = useTranslation();
  const year = new Date().getFullYear();

  return (
    <div className="min-h-dvh md:grid md:grid-cols-[1fr_1fr]">
      {/* Sidebar — desktop only */}
      <aside
        className="hidden md:flex flex-col justify-between min-h-dvh p-12 lg:p-16 bg-surface-elevated relative overflow-hidden"
        style={{ backgroundImage: AURORA_GRADIENT }}
      >
        {/* Brand block */}
        <div className="flex items-center relative">
          <CircleDollarSign size={40} strokeWidth={1.5} className="text-brand" />
          <span className="font-heading text-xl font-bold ml-3">
            {t('common.appName')}
          </span>
        </div>

        {/* Tagline */}
        <div className="relative">
          <h2 className="font-heading text-3xl lg:text-4xl font-bold tracking-tight leading-tight text-text-primary whitespace-pre-line">
            {t('auth.tagline')}
          </h2>
          <p className="text-text-secondary text-sm mt-4 max-w-xs">
            {t('auth.taglineSub')}
          </p>
        </div>

        {/* Footer: copyright + version */}
        <div className="flex items-center justify-between relative">
          <p className="text-text-muted text-xs">
            &copy; {year} SalvaDash
          </p>
          <VersionBadge className="opacity-60" />
        </div>
      </aside>

      {/* Form column */}
      <main className="flex items-center justify-center p-6 md:p-8 min-h-dvh relative">
        <div className="w-full max-w-sm space-y-8">
          {/* Mobile-only brand */}
          <div className="md:hidden text-center">
            <CircleDollarSign
              size={56}
              strokeWidth={1.5}
              className="text-brand mx-auto"
            />
            <h1 className="font-heading text-2xl font-bold text-brand mt-2">
              {t('common.appName')}
            </h1>
            <p className="text-text-secondary text-sm mt-1">
              Personal Savings Tracker
            </p>
          </div>

          {children}
        </div>

        {/* Mobile-only version badge (sidebar shows it on desktop) */}
        <VersionBadge className="absolute bottom-4 right-4 opacity-60 md:hidden" />
      </main>
    </div>
  );
}
