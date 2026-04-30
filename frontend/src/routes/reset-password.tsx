import { createFileRoute, useNavigate, Link } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { useState, type FormEvent } from 'react';
import { AlertCircle, Lock } from 'lucide-react';
import { api } from '../lib/api';
import { useUIStore } from '../stores/ui-store';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { AuthLayout } from '../components/AuthLayout';

export const Route = createFileRoute('/reset-password')({
  validateSearch: (search: Record<string, unknown>) => ({
    token: (search.token as string) || '',
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { token } = Route.useSearch();
  const addToast = useUIStore((s) => s.addToast);

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError(t('auth.passwordMismatch'));
      return;
    }

    if (password.length < 8) {
      setError(t('auth.passwordTooShort'));
      return;
    }

    setLoading(true);

    try {
      await api.post('/auth/reset-password', { token, password });
      addToast({ type: 'success', message: t('auth.passwordResetSuccess') });
      navigate({ to: '/login' });
    } catch {
      setError(t('auth.resetPasswordError'));
    }

    setLoading(false);
  }

  if (!token) {
    return (
      <AuthLayout>
        <div className="solid-card p-6 text-center space-y-4">
          <AlertCircle size={48} strokeWidth={1.5} className="text-negative mx-auto" />
          <p className="text-text-secondary text-sm">{t('auth.invalidResetLink')}</p>
          <Link to="/forgot-password">
            <Button fullWidth>{t('auth.requestNewLink')}</Button>
          </Link>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      <form onSubmit={handleSubmit} className="solid-card p-6 space-y-4">
        <h2 className="font-heading text-lg font-semibold text-center">
          {t('auth.resetPassword')}
        </h2>

        {error && (
          <div className="bg-negative/10 border border-negative/30 rounded-md px-4 py-2.5 text-sm text-negative">
            {error}
          </div>
        )}

        <Input
          label={t('auth.newPassword')}
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          autoComplete="new-password"
          required
          icon={<Lock size={20} />}
        />

        <Input
          label={t('auth.confirmPassword')}
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          placeholder="••••••••"
          autoComplete="new-password"
          required
          icon={<Lock size={20} />}
        />

        <Button type="submit" fullWidth loading={loading}>
          {t('auth.resetPassword')}
        </Button>

        <div className="text-center">
          <Link
            to="/login"
            className="text-sm text-brand hover:text-brand-hover transition-colors"
          >
            {t('auth.backToLogin')}
          </Link>
        </div>
      </form>
    </AuthLayout>
  );
}
