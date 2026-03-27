import { createFileRoute, Link } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { useState } from 'react';
import { api } from '../lib/api';
import { useUIStore } from '../stores/ui-store';
import { Button } from '../components/ui/Button';

export const Route = createFileRoute('/verify-email')({
  validateSearch: (search: Record<string, unknown>) => ({
    email: (search.email as string) || '',
  }),
  component: VerifyEmailPage,
});

function VerifyEmailPage() {
  const { t } = useTranslation();
  const { email } = Route.useSearch();
  const addToast = useUIStore((s) => s.addToast);

  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);

  async function handleResend() {
    if (!email) return;
    setResending(true);

    try {
      await api.post('/auth/resend-verification', { email });
      setResent(true);
      addToast({ type: 'success', message: t('auth.verificationResent') });
    } catch {
      addToast({ type: 'error', message: t('auth.resendError') });
    }

    setResending(false);
  }

  return (
    <div className="min-h-dvh flex items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-8">
        {/* Logo */}
        <div className="text-center">
          <span className="icon text-brand text-[56px]">monetization_on</span>
          <h1 className="font-heading text-2xl font-bold text-brand mt-2">{t('common.appName')}</h1>
        </div>

        <div className="glass-card p-6 space-y-6 text-center">
          <span className="icon text-brand text-[56px]">mark_email_unread</span>

          <div className="space-y-2">
            <h2 className="font-heading text-lg font-semibold">{t('auth.verifyEmail')}</h2>
            <p className="text-text-secondary text-sm">{t('auth.verifyEmailDesc')}</p>
            {email && <p className="text-brand font-medium text-sm">{email}</p>}
          </div>

          <div className="space-y-3">
            <Button
              variant="secondary"
              fullWidth
              loading={resending}
              disabled={resent || !email}
              onClick={handleResend}
            >
              {resent ? t('auth.emailResent') : t('auth.resendEmail')}
            </Button>

            <Link to="/login">
              <Button variant="ghost" fullWidth>
                {t('auth.backToLogin')}
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
