import { createLazyFileRoute, Link } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Banknote,
  Bell,
  BellOff,
  Camera,
  Check,
  ChevronRight,
  Download,
  Euro,
  FileJson,
  HardDrive,
  Info,
  Languages,
  Lock,
  Mail,
  Monitor,
  Moon,
  Palette,
  Pencil,
  Plus,
  Sun,
  Trash2,
  Upload,
  User,
  X,
} from 'lucide-react';
import { CURRENCIES, type CurrencyCode, APP_VERSION } from '@salvadash/shared';
import { useAuthStore } from '../stores/auth-store';
import { useUIStore } from '../stores/ui-store';
import { useThemeStore } from '../stores/theme-store';
import { usePushNotifications } from '../hooks/use-push';
import {
  useIncomeSources,
  useCreateIncomeSource,
  useUpdateIncomeSource,
  useDeleteIncomeSource,
  useUpdateProfile,
  useChangePassword,
  useChangeEmail,
  useUploadAvatar,
  useDeleteAvatar,
  useResetData,
} from '../hooks/queries';
import { api } from '../lib/api';
import { Card, Input, Modal, Toggle } from '../components/ui';
import { WhatsNewModal } from '../components/WhatsNewModal';

export const Route = createLazyFileRoute('/settings')({
  component: SettingsPage,
});

// ─── Settings Page ─────────────────────────────────────────

function SettingsPage() {
  const { t, i18n } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const [showWhatsNew, setShowWhatsNew] = useState(false);

  return (
    <div className="p-4 max-w-lg mx-auto space-y-4">
      <motion.h1
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="font-heading text-2xl font-bold"
      >
        {t('settings.title')}
      </motion.h1>

      {/* Profile */}
      <ProfileSection />

      {/* Push Notifications */}
      <PushSection />

      {/* Income Sources */}
      <IncomeSourcesSection />

      {/* Currency */}
      <CurrencySection />

      {/* Language */}
      <Section
        title={t('settings.language')}
        icon={<Languages size={20} className="text-brand" />}
        delay={0.2}
      >
        <div className="flex gap-2">
          {(['it', 'en'] as const).map((lang) => (
            <button
              key={lang}
              onClick={() => i18n.changeLanguage(lang)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                i18n.language === lang
                  ? 'bg-brand text-surface-base'
                  : 'bg-surface-elevated text-text-secondary hover:text-text-primary'
              }`}
            >
              {lang === 'it' ? '🇮🇹 Italiano' : '🇬🇧 English'}
            </button>
          ))}
        </div>
      </Section>

      {/* Theme (V2 — dark only for now) */}
      <ThemeSection />

      {/* Data Management */}
      <DataManagementSection />

      {/* About */}
      <Section
        title={t('settings.about')}
        icon={<Info size={20} className="text-brand" />}
        delay={0.3}
      >
        <div className="space-y-2 text-sm text-text-secondary">
          <div className="flex justify-between">
            <span>{t('settings.version')}</span>
            <button
              onClick={() => setShowWhatsNew(true)}
              className="font-mono text-text-muted hover:text-brand transition-colors cursor-pointer"
            >
              v{APP_VERSION}
            </button>
          </div>
          <Link
            to="/release-history"
            className="flex items-center justify-between text-text-secondary hover:text-text-primary transition-colors"
          >
            <span>{t('version.releaseHistory')}</span>
            <ChevronRight size={16} className="text-text-muted" />
          </Link>
        </div>
      </Section>

      {/* Logout */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
      >
        <button
          onClick={logout}
          className="w-full py-3 rounded-xl bg-negative/10 text-negative font-medium text-sm hover:bg-negative/20 transition-colors"
        >
          Logout
        </button>
      </motion.div>

      {/* WhatsNew Modal — rendered from WhatsNewModal component */}
      {showWhatsNew && <WhatsNewModal onClose={() => setShowWhatsNew(false)} />}
    </div>
  );
}

// ─── Profile Section ───────────────────────────────────────

function ProfileSection() {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const addToast = useUIStore((s) => s.addToast);
  const updateProfile = useUpdateProfile();
  const changePassword = useChangePassword();
  const changeEmail = useChangeEmail();
  const uploadAvatar = useUploadAvatar();
  const deleteAvatar = useDeleteAvatar();

  const avatarInputRef = useRef<HTMLInputElement>(null);

  // Edit name
  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState('');

  // Change email modal
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailForm, setEmailForm] = useState({ newEmail: '', password: '' });

  // Change password modal
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [passwordError, setPasswordError] = useState('');
  const [emailError, setEmailError] = useState('');

  const handleNameSave = async () => {
    const trimmed = nameValue.trim();
    if (!trimmed || trimmed === user?.name) {
      setEditingName(false);
      return;
    }
    try {
      const updatedUser = await updateProfile.mutateAsync({ name: trimmed });
      setUser(updatedUser);
      setEditingName(false);
      addToast({ type: 'success', message: t('settings.profileUpdated') });
    } catch (e: any) {
      addToast({ type: 'error', message: e.message });
    }
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const updatedUser = await uploadAvatar.mutateAsync(file);
      setUser(updatedUser);
      addToast({ type: 'success', message: t('settings.avatarUpdated') });
    } catch (e: any) {
      addToast({ type: 'error', message: e.message });
    }
    if (avatarInputRef.current) avatarInputRef.current.value = '';
  };

  const handleAvatarRemove = async () => {
    try {
      const updatedUser = await deleteAvatar.mutateAsync();
      setUser(updatedUser);
      addToast({ type: 'success', message: t('settings.avatarRemoved') });
    } catch (e: any) {
      addToast({ type: 'error', message: e.message });
    }
  };

  const handleEmailChange = async () => {
    if (!emailForm.newEmail || !emailForm.password) return;
    setEmailError('');
    try {
      const updatedUser = await changeEmail.mutateAsync(emailForm);
      setUser(updatedUser);
      setShowEmailModal(false);
      setEmailForm({ newEmail: '', password: '' });
      addToast({ type: 'success', message: t('settings.emailUpdated') });
    } catch (e: any) {
      setEmailError(e.message);
    }
  };

  const handlePasswordChange = async () => {
    if (!passwordForm.currentPassword || !passwordForm.newPassword) return;
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError(t('settings.passwordMismatch'));
      return;
    }
    setPasswordError('');
    try {
      await changePassword.mutateAsync(passwordForm);
      setShowPasswordModal(false);
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      addToast({ type: 'success', message: t('settings.passwordUpdated') });
    } catch (e: any) {
      setPasswordError(e.message);
    }
  };

  const initials =
    user?.name
      ?.split(' ')
      .map((w) => w[0])
      .join('')
      .toUpperCase()
      .slice(0, 2) ?? '??';

  return (
    <Section
      title={t('settings.profile')}
      icon={<User size={20} className="text-brand" />}
      delay={0.05}
    >
      {/* Avatar + Info */}
      <div className="flex items-center gap-4 mb-4">
        <div className="relative group">
          {user?.avatarUrl ? (
            <img
              src={user.avatarUrl}
              alt={user.name}
              className="w-14 h-14 rounded-full object-cover ring-2 ring-brand/30"
            />
          ) : (
            <div className="w-14 h-14 rounded-full bg-brand/20 flex items-center justify-center ring-2 ring-brand/30">
              <span className="text-brand font-bold text-lg">{initials}</span>
            </div>
          )}
          <button
            onClick={() => avatarInputRef.current?.click()}
            className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
          >
            <Camera size={20} className="text-white" />
          </button>
          <input
            ref={avatarInputRef}
            type="file"
            accept=".jpg,.jpeg,.png,.webp"
            onChange={handleAvatarChange}
            className="hidden"
          />
        </div>

        <div className="min-w-0 flex-1">
          {editingName ? (
            <div className="flex items-center gap-1.5">
              <input
                value={nameValue}
                onChange={(e) => setNameValue(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleNameSave()}
                className="bg-transparent font-medium text-sm outline-none border-b border-brand/40 py-0.5 w-full"
                autoFocus
              />
              <button onClick={handleNameSave} className="p-2.5 text-brand shrink-0">
                <Check size={20} />
              </button>
              <button
                onClick={() => setEditingName(false)}
                className="p-2.5 text-text-muted shrink-0"
              >
                <X size={20} />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1.5">
              <p className="font-medium truncate">{user?.name}</p>
              <button
                onClick={() => {
                  setEditingName(true);
                  setNameValue(user?.name ?? '');
                }}
                className="p-2.5 text-text-muted hover:text-brand transition-colors shrink-0"
              >
                <Pencil size={16} />
              </button>
            </div>
          )}
          <p className="text-sm text-text-muted truncate">{user?.email}</p>
          <p className="text-xs text-text-muted capitalize">{user?.role?.toLowerCase()}</p>
        </div>
      </div>

      {/* Avatar remove link */}
      {user?.avatarUrl && (
        <button
          onClick={handleAvatarRemove}
          disabled={deleteAvatar.isPending}
          className="text-xs text-text-muted hover:text-negative transition-colors mb-3"
        >
          {t('settings.removeAvatar')}
        </button>
      )}

      {/* Action Buttons */}
      <div className="flex gap-2">
        <button
          onClick={() => {
            setShowEmailModal(true);
            setEmailForm({ newEmail: '', password: '' });
            setEmailError('');
          }}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-surface-elevated rounded-lg text-sm font-medium text-text-secondary hover:text-text-primary transition-colors"
        >
          <Mail size={16} />
          {t('settings.changeEmail')}
        </button>
        <button
          onClick={() => {
            setShowPasswordModal(true);
            setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
            setPasswordError('');
          }}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-surface-elevated rounded-lg text-sm font-medium text-text-secondary hover:text-text-primary transition-colors"
        >
          <Lock size={16} />
          {t('settings.changePassword')}
        </button>
      </div>

      {/* Change Email Modal */}
      <Modal
        isOpen={showEmailModal}
        onClose={() => setShowEmailModal(false)}
        title={t('settings.changeEmail')}
        size="sm"
      >
        <div className="space-y-3">
          <Input
            label={t('settings.newEmail')}
            type="email"
            value={emailForm.newEmail}
            onChange={(e) => {
              setEmailForm((f) => ({ ...f, newEmail: e.target.value }));
              setEmailError('');
            }}
            placeholder="nuova@email.com"
          />
          <Input
            label={t('settings.confirmWithPassword')}
            type="password"
            value={emailForm.password}
            onChange={(e) => {
              setEmailForm((f) => ({ ...f, password: e.target.value }));
              setEmailError('');
            }}
          />
          {emailError && <p className="text-sm text-negative font-medium">{emailError}</p>}
          <div className="flex gap-2 pt-1">
            <button
              onClick={() => setShowEmailModal(false)}
              className="flex-1 py-2.5 rounded-lg bg-surface-elevated text-text-secondary text-sm font-medium"
            >
              {t('common.cancel')}
            </button>
            <button
              onClick={handleEmailChange}
              disabled={!emailForm.newEmail || !emailForm.password || changeEmail.isPending}
              className="flex-1 py-2.5 rounded-lg bg-brand text-surface-base text-sm font-medium disabled:opacity-50 transition-opacity"
            >
              {t('common.save')}
            </button>
          </div>
        </div>
      </Modal>

      {/* Change Password Modal */}
      <Modal
        isOpen={showPasswordModal}
        onClose={() => setShowPasswordModal(false)}
        title={t('settings.changePassword')}
        size="sm"
      >
        <div className="space-y-3">
          <Input
            label={t('settings.currentPassword')}
            type="password"
            value={passwordForm.currentPassword}
            onChange={(e) => {
              setPasswordForm((f) => ({ ...f, currentPassword: e.target.value }));
              setPasswordError('');
            }}
          />
          <Input
            label={t('settings.newPassword')}
            type="password"
            value={passwordForm.newPassword}
            onChange={(e) => {
              setPasswordForm((f) => ({ ...f, newPassword: e.target.value }));
              setPasswordError('');
            }}
          />
          <Input
            label={t('settings.confirmNewPassword')}
            type="password"
            value={passwordForm.confirmPassword}
            onChange={(e) => {
              setPasswordForm((f) => ({ ...f, confirmPassword: e.target.value }));
              setPasswordError('');
            }}
          />
          {passwordError && <p className="text-sm text-negative font-medium">{passwordError}</p>}
          <div className="flex gap-2 pt-1">
            <button
              onClick={() => setShowPasswordModal(false)}
              className="flex-1 py-2.5 rounded-lg bg-surface-elevated text-text-secondary text-sm font-medium"
            >
              {t('common.cancel')}
            </button>
            <button
              onClick={handlePasswordChange}
              disabled={
                !passwordForm.currentPassword ||
                !passwordForm.newPassword ||
                !passwordForm.confirmPassword ||
                changePassword.isPending
              }
              className="flex-1 py-2.5 rounded-lg bg-brand text-surface-base text-sm font-medium disabled:opacity-50 transition-opacity"
            >
              {t('common.save')}
            </button>
          </div>
        </div>
      </Modal>
    </Section>
  );
}

// ─── Push Section ──────────────────────────────────────────

function PushSection() {
  const { t } = useTranslation();
  const { state, subscribe, unsubscribe } = usePushNotifications();

  if (state === 'unsupported') {
    return (
      <Section title={t('push.title')} icon={<Bell size={20} className="text-brand" />} delay={0.1}>
        <p className="text-sm text-text-muted">{t('push.unsupported')}</p>
      </Section>
    );
  }

  if (state === 'denied') {
    return (
      <Section
        title={t('push.title')}
        icon={<BellOff size={20} className="text-brand" />}
        delay={0.1}
      >
        <p className="text-sm text-text-muted">{t('push.denied')}</p>
      </Section>
    );
  }

  const isSubscribed = state === 'subscribed';
  const isLoading = state === 'loading';

  return (
    <Section title={t('push.title')} icon={<Bell size={20} className="text-brand" />} delay={0.1}>
      <p className="text-sm text-text-secondary mb-3">{t('push.description')}</p>
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">
          {isSubscribed ? t('push.enabled') : t('push.title')}
        </span>
        <Toggle
          checked={isSubscribed}
          onChange={isSubscribed ? unsubscribe : subscribe}
          disabled={isLoading}
          aria-label={t('push.title')}
        />
      </div>
    </Section>
  );
}

// ─── Income Sources Section ────────────────────────────────

function IncomeSourcesSection() {
  const { t } = useTranslation();
  const { data: sources, isLoading } = useIncomeSources();
  const createSource = useCreateIncomeSource();
  const updateSource = useUpdateIncomeSource();
  const deleteSource = useDeleteIncomeSource();
  const addToast = useUIStore((s) => s.addToast);
  const [newName, setNewName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  const handleCreate = async () => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    try {
      await createSource.mutateAsync({ name: trimmed });
      setNewName('');
      addToast({ type: 'success', message: t('incomeSources.created') });
    } catch (e: any) {
      addToast({ type: 'error', message: e.message });
    }
  };

  const handleUpdate = async (id: string) => {
    const trimmed = editName.trim();
    if (!trimmed) return;
    try {
      await updateSource.mutateAsync({ id, name: trimmed });
      setEditingId(null);
      addToast({ type: 'success', message: t('incomeSources.updated') });
    } catch (e: any) {
      addToast({ type: 'error', message: e.message });
    }
  };

  const handleToggle = async (id: string, isActive: boolean) => {
    try {
      await updateSource.mutateAsync({ id, isActive: !isActive });
    } catch (e: any) {
      addToast({ type: 'error', message: e.message });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteSource.mutateAsync(id);
      addToast({ type: 'success', message: t('incomeSources.deleted') });
    } catch (e: any) {
      addToast({ type: 'info', message: t('incomeSources.deactivated') });
    }
  };

  return (
    <Section
      title={t('incomeSources.title')}
      icon={<Banknote size={20} className="text-brand" />}
      delay={0.15}
    >
      {isLoading ? (
        <div className="h-20 animate-pulse bg-surface-elevated rounded-lg" />
      ) : (
        <>
          {/* List */}
          <div className="space-y-2 mb-3">
            <AnimatePresence mode="popLayout">
              {sources?.map((source) => (
                <motion.div
                  key={source.id}
                  layout
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="flex items-center gap-2 bg-surface-elevated rounded-lg px-3 py-2"
                >
                  {editingId === source.id ? (
                    <>
                      <input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleUpdate(source.id)}
                        className="flex-1 bg-transparent text-sm outline-none border-b border-brand/40 py-0.5"
                        autoFocus
                      />
                      <button onClick={() => handleUpdate(source.id)} className="p-2.5 text-brand">
                        <Check size={20} />
                      </button>
                      <button onClick={() => setEditingId(null)} className="p-2.5 text-text-muted">
                        <X size={20} />
                      </button>
                    </>
                  ) : (
                    <>
                      <span
                        className={`flex-1 text-sm ${!source.isActive ? 'text-text-muted line-through' : ''}`}
                      >
                        {source.name}
                      </span>
                      <Toggle
                        checked={source.isActive}
                        onChange={() => handleToggle(source.id, source.isActive)}
                        aria-label={
                          source.isActive ? t('incomeSources.active') : t('incomeSources.inactive')
                        }
                      />
                      <button
                        onClick={() => {
                          setEditingId(source.id);
                          setEditName(source.name);
                        }}
                        className="p-2.5 text-text-muted hover:text-text-primary"
                      >
                        <Pencil size={20} />
                      </button>
                      <button
                        onClick={() => handleDelete(source.id)}
                        className="p-2.5 text-text-muted hover:text-negative"
                      >
                        <Trash2 size={20} />
                      </button>
                    </>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
            {sources?.length === 0 && (
              <p className="text-sm text-text-muted text-center py-2">{t('incomeSources.empty')}</p>
            )}
          </div>

          {/* Add new */}
          <div className="flex gap-2">
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              placeholder={t('incomeSources.name')}
              className="flex-1 bg-surface-elevated/50 border border-border-default rounded-lg px-3 py-2 text-sm placeholder:text-text-muted focus:outline-none focus:border-brand/60 transition-colors"
            />
            <button
              onClick={handleCreate}
              disabled={!newName.trim() || createSource.isPending}
              className="px-3 py-2 bg-brand text-surface-base rounded-lg text-sm font-medium disabled:opacity-50 transition-opacity"
            >
              <Plus size={16} />
            </button>
          </div>
        </>
      )}
    </Section>
  );
}

// ─── Currency Section ──────────────────────────────────────

function CurrencySection() {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const updateProfile = useUpdateProfile();
  const addToast = useUIStore((s) => s.addToast);

  const handleChange = async (currency: CurrencyCode) => {
    if (currency === user?.currency) return;
    try {
      const updatedUser = await updateProfile.mutateAsync({ currency });
      setUser(updatedUser);
      addToast({ type: 'success', message: t('settings.currencySaved') });
    } catch (e: any) {
      addToast({ type: 'error', message: e.message });
    }
  };

  return (
    <Section
      title={t('settings.currency')}
      icon={<Euro size={20} className="text-brand" />}
      delay={0.18}
    >
      <p className="text-sm text-text-secondary mb-3">{t('settings.currencyDesc')}</p>
      <div className="flex gap-2">
        {(Object.keys(CURRENCIES) as CurrencyCode[]).map((code) => (
          <button
            key={code}
            onClick={() => handleChange(code)}
            disabled={updateProfile.isPending}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              user?.currency === code
                ? 'bg-brand text-surface-base'
                : 'bg-surface-elevated text-text-secondary hover:text-text-primary'
            }`}
          >
            {CURRENCIES[code].symbol} {code}
          </button>
        ))}
      </div>
    </Section>
  );
}

// ─── Theme Section ─────────────────────────────────────────

function ThemeSection() {
  const { t } = useTranslation();
  const { theme, setTheme } = useThemeStore();

  const modes = [
    { value: 'dark', Icon: Moon },
    { value: 'light', Icon: Sun },
    { value: 'system', Icon: Monitor },
  ] as const;

  return (
    <Section
      title={t('settings.theme')}
      icon={<Palette size={20} className="text-brand" />}
      delay={0.22}
    >
      <div className="flex gap-2">
        {modes.map(({ value, Icon }) => (
          <button
            key={value}
            onClick={() => setTheme(value)}
            className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${
              theme === value
                ? 'bg-brand text-surface-base'
                : 'bg-surface-elevated text-text-secondary hover:text-text-primary'
            }`}
          >
            <Icon size={16} />
            {t(`settings.${value}`)}
          </button>
        ))}
      </div>
      <p className="text-xs text-text-muted mt-2">{t('settings.themeDesc')}</p>
    </Section>
  );
}

// ─── Data Management Section ───────────────────────────────

function DataManagementSection() {
  const { t } = useTranslation();
  const addToast = useUIStore((s) => s.addToast);
  const resetData = useResetData();
  const fileRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetInput, setResetInput] = useState('');

  const handleExportCSV = () => {
    window.open('/api/data/export/csv', '_blank');
  };

  const handleExportJSON = () => {
    window.open('/api/data/export/json', '_blank');
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    try {
      const buffer = await file.arrayBuffer();
      const base64 = btoa(
        new Uint8Array(buffer).reduce((data, byte) => data + String.fromCharCode(byte), ''),
      );
      const res = await api.post<{ imported: number; skipped: number }>('/data/import', {
        fileBase64: base64,
      });
      if (res.success && res.data) {
        addToast({
          type: 'success',
          message: t('settings.importSuccess', {
            imported: String(res.data.imported),
            skipped: String(res.data.skipped),
          }),
        });
      } else {
        addToast({ type: 'error', message: res.error ?? t('settings.importError') });
      }
    } catch {
      addToast({ type: 'error', message: t('settings.importError') });
    } finally {
      setImporting(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const handleReset = async () => {
    try {
      await resetData.mutateAsync();
      setShowResetModal(false);
      setResetInput('');
      addToast({ type: 'success', message: t('settings.resetSuccess') });
    } catch {
      addToast({ type: 'error', message: t('settings.resetError') });
    }
  };

  return (
    <Section
      title={t('settings.dataManagement')}
      icon={<HardDrive size={20} className="text-brand" />}
      delay={0.25}
    >
      <div className="space-y-3">
        {/* Export buttons */}
        <div className="flex gap-2">
          <button
            onClick={handleExportCSV}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-surface-elevated rounded-lg text-sm font-medium text-text-secondary hover:text-text-primary transition-colors"
          >
            <Download size={16} />
            {t('settings.exportCSV')}
          </button>
          <button
            onClick={handleExportJSON}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-surface-elevated rounded-lg text-sm font-medium text-text-secondary hover:text-text-primary transition-colors"
          >
            <FileJson size={16} />
            {t('settings.exportJSON')}
          </button>
        </div>

        {/* Import */}
        <label className="flex items-center justify-center gap-2 py-2.5 bg-surface-elevated rounded-lg text-sm font-medium text-text-secondary hover:text-text-primary transition-colors cursor-pointer">
          <Upload size={16} />
          {importing ? t('settings.importing') : t('settings.selectFile')}
          <input
            ref={fileRef}
            type="file"
            accept=".xlsx,.xls"
            onChange={handleImport}
            className="hidden"
            disabled={importing}
          />
        </label>

        {/* Reset */}
        <button
          onClick={() => setShowResetModal(true)}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium bg-negative/10 text-negative hover:bg-negative/20 transition-colors"
        >
          <Trash2 size={16} />
          {t('settings.resetData')}
        </button>
      </div>

      {/* Reset Confirmation Modal */}
      <Modal
        isOpen={showResetModal}
        onClose={() => {
          setShowResetModal(false);
          setResetInput('');
        }}
        title={t('settings.resetData')}
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-negative">{t('settings.resetWarning')}</p>
          <Input
            label={t('settings.resetConfirm')}
            value={resetInput}
            onChange={(e) => setResetInput(e.target.value)}
            placeholder="RESET"
          />
          <div className="flex gap-2">
            <button
              onClick={() => {
                setShowResetModal(false);
                setResetInput('');
              }}
              className="flex-1 py-2.5 rounded-lg bg-surface-elevated text-text-secondary text-sm font-medium"
            >
              Cancel
            </button>
            <button
              onClick={handleReset}
              disabled={resetInput !== 'RESET' || resetData.isPending}
              className="flex-1 py-2.5 rounded-lg bg-negative text-white text-sm font-medium disabled:opacity-50 transition-opacity"
            >
              {t('settings.resetData')}
            </button>
          </div>
        </div>
      </Modal>
    </Section>
  );
}

// ─── Reusable Section ──────────────────────────────────────

function Section({
  title,
  icon,
  delay,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  delay: number;
  children: React.ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
    >
      <Card>
        <div className="flex items-center gap-2 mb-3">
          {icon}
          <h2 className="font-heading text-sm font-semibold uppercase tracking-wider text-text-muted">
            {title}
          </h2>
        </div>
        {children}
      </Card>
    </motion.div>
  );
}
