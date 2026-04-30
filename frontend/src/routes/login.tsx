import { createFileRoute, useNavigate, Link } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { useState, type FormEvent } from 'react';
import { Mail, Lock } from 'lucide-react';
import { useAuthStore } from '../stores/auth-store';
import { useUIStore } from '../stores/ui-store';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { AuthLayout } from '../components/AuthLayout';

export const Route = createFileRoute('/login')({
  component: LoginPage,
});

function LoginPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const login = useAuthStore((s) => s.login);
  const addToast = useUIStore((s) => s.addToast);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    const result = await login(email, password);

    if (result.success) {
      addToast({ type: 'success', message: t('auth.loginSuccess') });
      navigate({ to: '/' });
    } else {
      setError(result.error ?? t('auth.loginError'));
    }

    setLoading(false);
  }

  return (
    <AuthLayout>
      {/* Form */}
      <form onSubmit={handleSubmit} className="solid-card p-6 space-y-4">
        <h2 className="font-heading text-lg font-semibold text-center">{t('auth.login')}</h2>

        {error && (
          <div className="bg-negative/10 border border-negative/30 rounded-md px-4 py-2.5 text-sm text-negative">
            {error}
          </div>
        )}

        <Input
          label={t('auth.email')}
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="email@example.com"
          autoComplete="email"
          required
          icon={<Mail size={20} />}
        />

        <Input
          label={t('auth.password')}
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          autoComplete="current-password"
          required
          icon={<Lock size={20} />}
        />

        <Button type="submit" fullWidth loading={loading}>
          {t('auth.login')}
        </Button>

        <div className="text-center">
          <Link
            to="/forgot-password"
            className="text-sm text-brand hover:text-brand-hover transition-colors"
          >
            {t('auth.forgotPassword')}
          </Link>
        </div>
      </form>

      {/* Register link */}
      <p className="text-center text-sm text-text-secondary">
        {t('auth.noAccount')}{' '}
        <Link
          to="/register"
          className="text-brand hover:text-brand-hover font-medium transition-colors"
        >
          {t('auth.register')}
        </Link>
      </p>
    </AuthLayout>
  );
}
