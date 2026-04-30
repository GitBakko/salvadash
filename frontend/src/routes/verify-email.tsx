import { createFileRoute, Link } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { useState, useEffect } from 'react';
import { CircleDollarSign, MailOpen, CheckCircle, AlertCircle } from 'lucide-react';
import { api } from '../lib/api';
import { useUIStore } from '../stores/ui-store';
import { Button } from '../components/ui/Button';

export const Route = createFileRoute('/verify-email')({
  validateSearch: (search: Record<string, unknown>) => {
    const result: { token?: string; email?: string } = {};
    if (search.token) result.token = search.token as string;
    if (search.email) result.email = search.email as string;
    return result;
  },
  component: VerifyEmailPage,
});

function VerifyEmailPage() {
  const { t } = useTranslation();
  const { token, email } = Route.useSearch();
  const addToast = useUIStore((s) => s.addToast);

  const [status, setStatus] = useState<'idle' | 'verifying' | 'success' | 'error'>(
    token ? 'verifying' : 'idle',
  );
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);

  // Auto-verify when token is present in URL
  useEffect(() => {
    if (!token) return;

    api
      .post('/auth/verify-email', { token })
      .then((res) => {
        if (res.success) {
          setStatus('success');
        } else {
          setStatus('error');
        }
      })
      .catch(() => {
        setStatus('error');
      });
  }, [token]);

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
          <CircleDollarSign size={56} strokeWidth={1.5} className="text-brand mx-auto" />
          <h1 className="font-heading text-2xl font-bold text-brand mt-2">{t('common.appName')}</h1>
        </div>

        <div className="solid-card p-6 space-y-6 text-center">
          {/* Verification success */}
          {status === 'success' && (
            <>
              <CheckCircle size={56} strokeWidth={1.5} className="text-positive mx-auto" />
              <div className="space-y-2">
                <h2 className="font-heading text-lg font-semibold">{t('auth.emailVerified')}</h2>
                <p className="text-text-secondary text-sm">{t('auth.emailVerifiedDesc')}</p>
              </div>
              <Link to="/login">
                <Button fullWidth>{t('auth.backToLogin')}</Button>
              </Link>
            </>
          )}

          {/* Verification error */}
          {status === 'error' && (
            <>
              <AlertCircle size={56} strokeWidth={1.5} className="text-negative mx-auto" />
              <div className="space-y-2">
                <h2 className="font-heading text-lg font-semibold">{t('auth.verifyFailed')}</h2>
                <p className="text-text-secondary text-sm">{t('auth.verifyFailedDesc')}</p>
              </div>
              <div className="space-y-3">
                {email && (
                  <Button
                    variant="secondary"
                    fullWidth
                    loading={resending}
                    disabled={resent}
                    onClick={handleResend}
                  >
                    {resent ? t('auth.emailResent') : t('auth.resendEmail')}
                  </Button>
                )}
                <Link to="/login">
                  <Button variant="ghost" fullWidth>
                    {t('auth.backToLogin')}
                  </Button>
                </Link>
              </div>
            </>
          )}

          {/* Verifying... */}
          {status === 'verifying' && (
            <>
              <MailOpen size={56} strokeWidth={1.5} className="text-brand mx-auto animate-pulse" />
              <p className="text-text-secondary text-sm">{t('auth.verifying')}</p>
            </>
          )}

          {/* No token — show "check your email" message */}
          {status === 'idle' && (
            <>
              <MailOpen size={56} strokeWidth={1.5} className="text-brand mx-auto" />
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
            </>
          )}
        </div>
      </div>
    </div>
  );
}
