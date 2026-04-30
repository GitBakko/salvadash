import { createFileRoute, useNavigate, Link } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { useState, type FormEvent } from 'react';
import { User, Mail, Lock, KeyRound } from 'lucide-react';
import { useAuthStore } from '../stores/auth-store';
import { useUIStore } from '../stores/ui-store';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { AuthLayout } from '../components/AuthLayout';

export const Route = createFileRoute('/register')({
  component: RegisterPage,
});

function RegisterPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const register = useAuthStore((s) => s.register);
  const addToast = useUIStore((s) => s.addToast);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [inviteCode, setInviteCode] = useState('');
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

    const result = await register({ name, email, password, confirmPassword, inviteCode });

    if (result.success) {
      addToast({ type: 'success', message: t('auth.registrationSuccess') });
      navigate({ to: '/verify-email', search: { email } });
    } else {
      setError(result.error ?? t('auth.registerError'));
    }

    setLoading(false);
  }

  return (
    <AuthLayout>
      {/* Form */}
      <form onSubmit={handleSubmit} className="solid-card p-6 space-y-4">
        <h2 className="font-heading text-lg font-semibold text-center">{t('auth.register')}</h2>

        {error && (
          <div className="bg-negative/10 border border-negative/30 rounded-md px-4 py-2.5 text-sm text-negative">
            {error}
          </div>
        )}

        <Input
          label={t('auth.name')}
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t('auth.namePlaceholder')}
          autoComplete="name"
          required
          icon={<User size={20} />}
        />

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

        <Input
          label={t('auth.inviteCode')}
          type="text"
          value={inviteCode}
          onChange={(e) => setInviteCode(e.target.value)}
          placeholder={t('auth.inviteCodePlaceholder')}
          required
          icon={<KeyRound size={20} />}
        />

        <Button type="submit" fullWidth loading={loading}>
          {t('auth.register')}
        </Button>
      </form>

      {/* Login link */}
      <p className="text-center text-sm text-text-secondary">
        {t('auth.hasAccount')}{' '}
        <Link
          to="/login"
          className="text-brand hover:text-brand-hover font-medium transition-colors"
        >
          {t('auth.login')}
        </Link>
      </p>
    </AuthLayout>
  );
}
