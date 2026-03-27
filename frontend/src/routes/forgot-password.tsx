import { createFileRoute, Link } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { useState, type FormEvent } from 'react';
import { api } from '../lib/api';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';

export const Route = createFileRoute('/forgot-password')({
  component: ForgotPasswordPage,
});

function ForgotPasswordPage() {
  const { t } = useTranslation();

  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await api.post('/auth/forgot-password', { email });
      setSent(true);
    } catch {
      setError(t('auth.forgotPasswordError'));
    }

    setLoading(false);
  }

  return (
    <div className="min-h-dvh flex items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-8">
        {/* Logo */}
        <div className="text-center">
          <span className="icon text-brand text-[56px]">monetization_on</span>
          <h1 className="font-heading text-2xl font-bold text-brand mt-2">{t('common.appName')}</h1>
        </div>

        <div className="glass-card p-6 space-y-4">
          <h2 className="font-heading text-lg font-semibold text-center">{t('auth.forgotPassword')}</h2>

          {sent ? (
            <div className="text-center space-y-4">
              <span className="icon text-brand text-[48px]">mark_email_read</span>
              <p className="text-text-secondary text-sm">{t('auth.resetEmailSent')}</p>
              <Link to="/login">
                <Button variant="secondary" fullWidth>
                  {t('auth.backToLogin')}
                </Button>
              </Link>
            </div>
          ) : (
            <>
              <p className="text-text-secondary text-sm text-center">{t('auth.forgotPasswordDesc')}</p>

              {error && (
                <div className="bg-negative/10 border border-negative/30 rounded-[var(--radius-md)] px-4 py-2.5 text-sm text-negative">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <Input
                  label={t('auth.email')}
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="email@example.com"
                  autoComplete="email"
                  required
                  icon={<span className="icon text-lg">email</span>}
                />

                <Button type="submit" fullWidth loading={loading}>
                  {t('auth.sendResetLink')}
                </Button>
              </form>

              <div className="text-center">
                <Link to="/login" className="text-sm text-brand hover:text-brand-hover transition-colors">
                  {t('auth.backToLogin')}
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
