import { createLazyFileRoute, useNavigate } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useDeferredValue } from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  Calendar,
  CalendarDays,
  CheckCircle,
  Clock,
  CloudOff,
  Database,
  Download,
  Globe,
  Hammer,
  KeyRound,
  Landmark,
  Megaphone,
  PiggyBank,
  Plus,
  Receipt,
  RotateCcw,
  Search,
  Send,
  Settings,
  Shield,
  ShieldCheck,
  Timer,
  Trash2,
  TrendingUp,
  User,
  UserCheck,
  UserX,
  Users,
  Wrench,
  X,
  XCircle,
} from 'lucide-react';
import { useAuthStore } from '../stores/auth-store';
import { Card, Skeleton, SkeletonCard } from '../components/ui';
import { formatDateMedium, formatDateTimeMedium } from '../lib/intl';
import { formatCurrency } from '@salvadash/shared';
import {
  useAdminOverview,
  useAdminUsers,
  useAdminUser,
  useAdminUpdateUser,
  useAdminDeleteUser,
  useInviteCodes,
  useCreateInviteCode,
  useDeleteInviteCode,
  useBroadcastNotification,
  useBackups,
  useBackupConfig,
  useCreateBackup,
  useDeleteBackup,
  useRestoreBackup,
  useRunRetention,
  useRunMaintenance,
} from '../hooks/queries';

export const Route = createLazyFileRoute('/admin')({
  component: AdminPage,
});

// ─── Constants ──────────────────────────────────────────────

const ROLE_COLORS: Record<string, string> = {
  ROOT: 'text-red-400',
  ADMIN: 'text-gold',
  BASE: 'text-text-muted',
};

const ROLE_BG: Record<string, string> = {
  ROOT: 'bg-red-500/15 text-red-400',
  ADMIN: 'bg-gold/15 text-gold',
  BASE: 'bg-surface-2 text-text-muted',
};

const TAB_ICONS: Record<string, LucideIcon> = {
  users: Users,
  invites: KeyRound,
  notify: Megaphone,
  backup: Database,
};

// ─── Main Page ──────────────────────────────────────────────

function AdminPage() {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'users' | 'invites' | 'notify' | 'backup'>('users');
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  const isAdmin = user?.role === 'ROOT' || user?.role === 'ADMIN';

  // Redirect non-admin users
  if (!isAdmin) {
    navigate({ to: '/' });
    return null;
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
      {/* Title */}
      <motion.h1
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="font-heading text-2xl font-bold text-text-primary flex items-center gap-2"
      >
        <ShieldCheck size={28} className="text-gold" />
        {t('admin.title')}
      </motion.h1>

      {/* Overview KPIs */}
      <OverviewCards />

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar">
        {(['users', 'invites', 'notify', 'backup'] as const).map((tab) => {
          const TabIcon = TAB_ICONS[tab];
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-xl font-medium text-sm transition-all whitespace-nowrap flex items-center gap-1 ${
                activeTab === tab
                  ? 'bg-brand/15 text-brand'
                  : 'bg-surface-2 text-text-muted hover:text-text-primary'
              }`}
            >
              <TabIcon size={16} />
              {tab === 'users'
                ? t('admin.users')
                : tab === 'invites'
                  ? t('admin.inviteCodes')
                  : tab === 'notify'
                    ? t('notifications.broadcast')
                    : t('backup.backups')}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        {activeTab === 'users' ? (
          <motion.div
            key="users"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
          >
            <UsersSection selectedUserId={selectedUserId} onSelectUser={setSelectedUserId} />
          </motion.div>
        ) : activeTab === 'invites' ? (
          <motion.div
            key="invites"
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
          >
            <InviteCodesSection />
          </motion.div>
        ) : activeTab === 'notify' ? (
          <motion.div
            key="notify"
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
          >
            <BroadcastSection />
          </motion.div>
        ) : (
          <motion.div
            key="backup"
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
          >
            <BackupSection />
          </motion.div>
        )}
      </AnimatePresence>

      {/* User Detail Sheet */}
      <AnimatePresence>
        {selectedUserId && (
          <UserDetailSheet userId={selectedUserId} onClose={() => setSelectedUserId(null)} />
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Overview Cards ─────────────────────────────────────────

function OverviewCards() {
  const { t } = useTranslation();
  const { data, isLoading } = useAdminOverview();

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    );
  }

  if (!data) return null;

  const kpis: { Icon: LucideIcon; label: string; value: string | number; color: string }[] = [
    { Icon: Users, label: t('admin.totalUsers'), value: data.totalUsers, color: 'text-brand' },
    {
      Icon: Receipt,
      label: t('admin.totalEntries'),
      value: data.totalEntries,
      color: 'text-gold',
    },
    {
      Icon: TrendingUp,
      label: t('admin.avgGrowth'),
      value: formatCurrency(data.avgGrowth),
      color: data.avgGrowth >= 0 ? 'text-brand' : 'text-red-400',
    },
    {
      Icon: UserCheck,
      label: t('admin.activeUsers'),
      value: data.activeUsers30d,
      color: 'text-brand',
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3">
      {kpis.map((kpi, i) => (
        <motion.div
          key={kpi.label}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.05 }}
        >
          <Card className="p-3">
            <div className="flex items-center gap-2 mb-1">
              <kpi.Icon size={20} className={kpi.color} />
              <span className="text-xs text-text-muted">{kpi.label}</span>
            </div>
            <p className="text-xl font-bold font-heading">{kpi.value}</p>
          </Card>
        </motion.div>
      ))}
    </div>
  );
}

// ─── Users Section ──────────────────────────────────────────

function UsersSection({
  selectedUserId,
  onSelectUser,
}: {
  selectedUserId: string | null;
  onSelectUser: (id: string | null) => void;
}) {
  const { t } = useTranslation();
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const deferredSearch = useDeferredValue(search);
  const { data, isLoading } = useAdminUsers(deferredSearch, roleFilter);

  return (
    <div className="space-y-3">
      {/* Search + Filter */}
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <Search
            size={20}
            className="text-text-muted absolute left-3 top-1/2 -translate-y-1/2"
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('admin.searchPlaceholder')}
            className="w-full bg-surface-2 border border-border-default rounded-xl py-2 pl-10 pr-3 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-brand"
          />
        </div>
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="bg-surface-2 border border-border-default rounded-xl px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-brand"
        >
          <option value="">{t('admin.allRoles')}</option>
          <option value="ROOT">ROOT</option>
          <option value="ADMIN">ADMIN</option>
          <option value="BASE">BASE</option>
        </select>
      </div>

      {/* Users List */}
      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : !data?.data?.length ? (
        <Card className="p-6 text-center">
          <UserX size={48} strokeWidth={1.5} className="text-text-muted mx-auto" />
          <p className="text-text-muted mt-2">{t('admin.noUsers')}</p>
        </Card>
      ) : (
        <div className="space-y-2">
          {data.data.map((u, i) => (
            <motion.div
              key={u.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
            >
              <Card
                className={`p-3 cursor-pointer transition-all hover:border-brand/30 ${
                  selectedUserId === u.id ? 'border-brand/50 bg-brand/5' : ''
                }`}
                onClick={() => onSelectUser(selectedUserId === u.id ? null : u.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    {/* Avatar */}
                    <div
                      className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${
                        u.isActive ? 'bg-brand/15 text-brand' : 'bg-surface-3 text-text-muted'
                      }`}
                    >
                      {u.name.charAt(0).toUpperCase()}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm truncate">{u.name}</p>
                        <span
                          className={`text-[10px] tabular-nums px-1.5 py-0.5 rounded ${ROLE_BG[u.role]}`}
                        >
                          {u.role}
                        </span>
                        {!u.isActive && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/15 text-red-400">
                            OFF
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-text-muted truncate">{u.email}</p>
                    </div>
                  </div>

                  <div className="text-right shrink-0 ml-2">
                    <p className="text-sm font-bold font-heading">
                      {formatCurrency(u.totalSavings)}
                    </p>
                    <p className="text-[10px] text-text-muted">
                      {u.entriesCount} {t('admin.entries')}
                    </p>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}

          {data.total > data.data.length && (
            <p className="text-center text-xs text-text-muted py-2">
              {data.data.length} / {data.total}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// ─── User Detail Sheet ──────────────────────────────────────

function UserDetailSheet({ userId, onClose }: { userId: string; onClose: () => void }) {
  const { t, i18n } = useTranslation();
  const currentUser = useAuthStore((s) => s.user);
  const { data: user, isLoading } = useAdminUser(userId);
  const updateUser = useAdminUpdateUser();
  const deleteUser = useAdminDeleteUser();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const isRoot = currentUser?.role === 'ROOT';
  const isTargetRoot = user?.role === 'ROOT';
  const isSelf = currentUser?.id === userId;

  const handleToggleActive = () => {
    if (!user || isTargetRoot || isSelf) return;
    updateUser.mutate({ id: userId, isActive: !user.isActive });
  };

  const handleRoleChange = (newRole: 'ADMIN' | 'BASE') => {
    if (!user || isTargetRoot || !isRoot) return;
    updateUser.mutate({ id: userId, role: newRole });
  };

  const handleDelete = () => {
    if (!isRoot || isTargetRoot || isSelf) return;
    deleteUser.mutate(userId, {
      onSuccess: () => onClose(),
    });
  };

  const formatDate = (d: string | null) => {
    if (!d) return t('admin.never');
    return formatDateMedium(d, i18n.language);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end justify-center"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" />

      {/* Sheet */}
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="relative w-full max-w-lg bg-surface-1 rounded-t-2xl border-t border-border-default p-5 pb-8 max-h-[80vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Handle */}
        <div className="w-10 h-1 rounded-full bg-surface-3 mx-auto mb-4" />

        {isLoading || !user ? (
          <div className="space-y-3">
            <Skeleton width={200} height={24} />
            <Skeleton width="100%" height={16} />
            <Skeleton width="100%" height={16} />
          </div>
        ) : (
          <div className="space-y-5">
            {/* Header */}
            <div className="flex items-center gap-3">
              <div
                className={`w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold ${
                  user.isActive ? 'bg-brand/15 text-brand' : 'bg-surface-3 text-text-muted'
                }`}
              >
                {user.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-heading text-lg font-bold">{user.name}</h3>
                  <span className={`text-xs tabular-nums px-2 py-0.5 rounded ${ROLE_BG[user.role]}`}>
                    {user.role}
                  </span>
                </div>
                <p className="text-sm text-text-muted">{user.email}</p>
                <p className="text-xs text-text-muted">@{user.username}</p>
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-3">
              <StatItem
                Icon={PiggyBank}
                label={t('admin.savings')}
                value={formatCurrency(user.totalSavings)}
              />
              <StatItem
                Icon={Receipt}
                label={t('admin.entries')}
                value={String(user.entriesCount)}
              />
              <StatItem
                Icon={Landmark}
                label={t('admin.accounts')}
                value={String(user.accountsCount)}
              />
              <StatItem
                Icon={Calendar}
                label={t('admin.memberSince')}
                value={formatDate(user.createdAt)}
                small
              />
              <StatItem
                Icon={CalendarDays}
                label={t('admin.lastEntry')}
                value={formatDate(user.lastEntryDate)}
                small
              />
              <StatItem
                Icon={Globe}
                label={t('settings.language')}
                value={user.language.toUpperCase()}
              />
            </div>

            {/* Actions */}
            {!isTargetRoot && !isSelf && (
              <div className="space-y-2 pt-2 border-t border-border-default">
                {/* Role Change (ROOT only) */}
                {isRoot && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-text-muted">{t('admin.changeRole')}</span>
                    <div className="flex gap-1">
                      {(['BASE', 'ADMIN'] as const).map((r) => (
                        <button
                          key={r}
                          onClick={() => handleRoleChange(r)}
                          disabled={user.role === r || updateUser.isPending}
                          className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                            user.role === r
                              ? 'bg-brand/20 text-brand'
                              : 'bg-surface-2 text-text-muted hover:text-text-primary'
                          }`}
                        >
                          {r}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Toggle Active */}
                <button
                  onClick={handleToggleActive}
                  disabled={updateUser.isPending}
                  className={`w-full py-2.5 rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-1 ${
                    user.isActive
                      ? 'bg-orange-500/15 text-orange-400 hover:bg-orange-500/25'
                      : 'bg-brand/15 text-brand hover:bg-brand/25'
                  }`}
                >
                  {user.isActive ? <UserX size={16} /> : <UserCheck size={16} />}
                  {user.isActive ? t('admin.deactivate') : t('admin.activate')}
                </button>

                {/* Delete (ROOT only) */}
                {isRoot && (
                  <>
                    {!showDeleteConfirm ? (
                      <button
                        onClick={() => setShowDeleteConfirm(true)}
                        className="w-full py-2.5 rounded-xl text-sm font-medium bg-red-500/15 text-red-400 hover:bg-red-500/25 transition-all flex items-center justify-center gap-1"
                      >
                        <Trash2 size={16} />
                        {t('admin.deleteUser')}
                      </button>
                    ) : (
                      <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 space-y-2">
                        <p className="text-sm text-red-400">{t('admin.deleteUserConfirm')}</p>
                        <div className="flex gap-2">
                          <button
                            onClick={() => setShowDeleteConfirm(false)}
                            className="flex-1 py-2 rounded-lg text-sm bg-surface-2 text-text-muted hover:text-text-primary transition-all"
                          >
                            {t('common.cancel')}
                          </button>
                          <button
                            onClick={handleDelete}
                            disabled={deleteUser.isPending}
                            className="flex-1 py-2 rounded-lg text-sm bg-red-500 text-white hover:bg-red-600 transition-all"
                          >
                            {deleteUser.isPending ? '...' : t('common.confirm')}
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {/* ROOT protection message */}
            {isTargetRoot && (
              <div className="flex items-center gap-2 bg-gold/10 border border-gold/30 rounded-xl p-3 text-sm text-gold">
                <Shield size={20} />
                {t('admin.rootProtected')}
              </div>
            )}
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}

function StatItem({
  Icon,
  label,
  value,
  small,
}: {
  Icon: LucideIcon;
  label: string;
  value: string;
  small?: boolean;
}) {
  return (
    <div className="bg-surface-2 rounded-xl p-2.5">
      <div className="flex items-center gap-1.5 mb-0.5">
        <Icon size={14} className="text-text-muted" />
        <span className="text-[10px] text-text-muted uppercase tracking-wide">{label}</span>
      </div>
      <p className={`font-bold font-heading ${small ? 'text-xs' : 'text-sm'}`}>{value}</p>
    </div>
  );
}

// ─── Invite Codes Section ───────────────────────────────────

function InviteCodesSection() {
  const { t, i18n } = useTranslation();
  const { data: codes, isLoading } = useInviteCodes();
  const createCode = useCreateInviteCode();
  const deleteCode = useDeleteInviteCode();

  const handleGenerate = () => {
    createCode.mutate(undefined);
  };

  const formatDate = (d: string | null) => {
    if (!d) return '—';
    return formatDateMedium(d, i18n.language);
  };

  const getStatusBadge = (code: { isActive: boolean; usedAt: string | null }) => {
    if (code.usedAt) return { label: t('admin.used'), className: 'bg-brand/15 text-brand' };
    if (!code.isActive)
      return { label: t('admin.inactive'), className: 'bg-red-500/15 text-red-400' };
    return { label: t('admin.active'), className: 'bg-gold/15 text-gold' };
  };

  return (
    <div className="space-y-3">
      {/* Generate Button */}
      <button
        onClick={handleGenerate}
        disabled={createCode.isPending}
        className="w-full py-2.5 rounded-xl text-sm font-medium bg-brand/15 text-brand hover:bg-brand/25 transition-all flex items-center justify-center gap-1"
      >
        <Plus size={20} />
        {createCode.isPending ? '...' : t('admin.generateCode')}
      </button>

      {/* Codes List */}
      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : !codes?.length ? (
        <Card className="p-6 text-center">
          <KeyRound size={48} strokeWidth={1.5} className="text-text-muted mx-auto opacity-50" />
          <p className="text-text-muted mt-2">{t('admin.noInviteCodes')}</p>
        </Card>
      ) : (
        <div className="space-y-2">
          {codes.map((code, i) => {
            const status = getStatusBadge(code);
            return (
              <motion.div
                key={code.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
              >
                <Card className="p-3">
                  <div className="flex items-center justify-between">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <code className="tabular-nums text-sm font-bold text-brand tracking-wider">
                          {code.code}
                        </code>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded ${status.className}`}>
                          {status.label}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-[10px] text-text-muted">
                        <span>{formatDate(code.createdAt)}</span>
                        {code.usedByName && (
                          <span className="flex items-center gap-0.5">
                            <User size={10} />
                            {code.usedByName}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Deactivate button (only for unused active codes) */}
                    {code.isActive && !code.usedAt && (
                      <button
                        onClick={() => deleteCode.mutate(code.id)}
                        disabled={deleteCode.isPending}
                        className="p-2.5 rounded-lg text-text-muted hover:text-red-400 hover:bg-red-500/10 transition-all"
                        title={t('common.delete')}
                      >
                        <X size={20} />
                      </button>
                    )}
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Broadcast Section ──────────────────────────────────────

const NOTIFICATION_TYPES = ['ADMIN', 'SYSTEM', 'ALERT', 'REMINDER', 'MILESTONE'] as const;

function BroadcastSection() {
  const { t } = useTranslation();
  const broadcast = useBroadcastNotification();
  const [type, setType] = useState<string>('ADMIN');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [targetUserId, setTargetUserId] = useState('');
  const [sent, setSent] = useState(false);

  const handleSend = () => {
    if (!title.trim() || !body.trim()) return;
    broadcast.mutate(
      {
        type,
        title: title.trim(),
        body: body.trim(),
        ...(targetUserId ? { userId: targetUserId } : {}),
      },
      {
        onSuccess: () => {
          setSent(true);
          setTitle('');
          setBody('');
          setTargetUserId('');
          setTimeout(() => setSent(false), 3000);
        },
      },
    );
  };

  return (
    <div className="space-y-4">
      <Card className="p-4 space-y-4">
        {/* Type */}
        <div>
          <label className="text-xs text-text-muted mb-1.5 block">
            {t('notifications.broadcastType')}
          </label>
          <div className="flex flex-wrap gap-1.5">
            {NOTIFICATION_TYPES.map((nt) => (
              <button
                key={nt}
                onClick={() => setType(nt)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  type === nt
                    ? 'bg-brand/20 text-brand'
                    : 'bg-surface-2 text-text-muted hover:text-text-primary'
                }`}
              >
                {t(`notifications.type${nt}`)}
              </button>
            ))}
          </div>
        </div>

        {/* Target */}
        <div>
          <label className="text-xs text-text-muted mb-1.5 block">
            {t('notifications.broadcastUser')}
          </label>
          <input
            type="text"
            value={targetUserId}
            onChange={(e) => setTargetUserId(e.target.value)}
            placeholder={t('notifications.broadcastAll')}
            className="w-full bg-surface-2 border border-border-default rounded-xl py-2 px-3 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-brand"
          />
          <p className="text-[10px] text-text-muted mt-1">
            {targetUserId ? t('notifications.broadcastUser') : t('notifications.broadcastAll')}
          </p>
        </div>

        {/* Title */}
        <div>
          <label className="text-xs text-text-muted mb-1.5 block">
            {t('notifications.broadcastTitle')}
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={200}
            className="w-full bg-surface-2 border border-border-default rounded-xl py-2 px-3 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-brand"
          />
        </div>

        {/* Body */}
        <div>
          <label className="text-xs text-text-muted mb-1.5 block">
            {t('notifications.broadcastBody')}
          </label>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            maxLength={2000}
            rows={3}
            className="w-full bg-surface-2 border border-border-default rounded-xl py-2 px-3 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-brand resize-none"
          />
        </div>

        {/* Send Button */}
        <button
          onClick={handleSend}
          disabled={!title.trim() || !body.trim() || broadcast.isPending}
          className="w-full py-2.5 rounded-xl text-sm font-medium bg-brand/15 text-brand hover:bg-brand/25 transition-all flex items-center justify-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Send size={20} />
          {broadcast.isPending ? '...' : t('notifications.broadcast')}
        </button>

        {/* Success */}
        <AnimatePresence>
          {sent && (
            <motion.div
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="bg-brand/10 border border-brand/30 rounded-xl p-3 text-sm text-brand text-center flex items-center justify-center gap-1"
            >
              <CheckCircle size={16} />
              {t('notifications.broadcastSentOne')}
            </motion.div>
          )}
        </AnimatePresence>

        {broadcast.isError && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 text-sm text-red-400 text-center">
            {broadcast.error?.message}
          </div>
        )}
      </Card>
    </div>
  );
}

// ─── Backup Section ─────────────────────────────────────────

function BackupSection() {
  const { t, i18n } = useTranslation();
  const currentUser = useAuthStore((s) => s.user);
  const { data: backups, isLoading } = useBackups();
  const { data: backupConfig } = useBackupConfig();
  const createBackup = useCreateBackup();
  const deleteBackup = useDeleteBackup();
  const restoreBackup = useRestoreBackup();
  const runRetention = useRunRetention();
  const runMaintenance = useRunMaintenance();

  const [restoreConfirmId, setRestoreConfirmId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [maintenanceResult, setMaintenanceResult] = useState<{
    vacuum: boolean;
    analyze: boolean;
    reindex: boolean;
  } | null>(null);

  const isRoot = currentUser?.role === 'ROOT';

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDate = (d: string | null) => {
    if (!d) return '—';
    return formatDateTimeMedium(d, i18n.language);
  };

  const handleCreate = () => {
    createBackup.mutate(undefined);
  };

  const handleRestore = (id: string) => {
    restoreBackup.mutate(id, {
      onSuccess: () => setRestoreConfirmId(null),
    });
  };

  const handleDelete = (id: string) => {
    deleteBackup.mutate(id, {
      onSuccess: () => setDeleteConfirmId(null),
    });
  };

  const handleMaintenance = () => {
    runMaintenance.mutate(undefined, {
      onSuccess: (data) => {
        setMaintenanceResult(data);
        setTimeout(() => setMaintenanceResult(null), 5000);
      },
    });
  };

  const statusColor: Record<string, string> = {
    RUNNING: 'bg-blue-500/15 text-blue-400',
    COMPLETED: 'bg-brand/15 text-brand',
    FAILED: 'bg-red-500/15 text-red-400',
  };

  return (
    <div className="space-y-4">
      {/* Create Backup + Actions */}
      <div className="flex gap-2">
        <button
          onClick={handleCreate}
          disabled={createBackup.isPending}
          className="flex-1 py-2.5 rounded-xl text-sm font-medium bg-brand/15 text-brand hover:bg-brand/25 transition-all flex items-center justify-center gap-1"
        >
          <Database size={20} />
          {createBackup.isPending ? t('backup.creating') : t('backup.createBackup')}
        </button>
      </div>

      {/* Config Info */}
      {backupConfig && (
        <Card className="p-3">
          <div className="flex items-center gap-2 mb-2">
            <Settings size={14} className="text-text-muted" />
            <span className="text-xs font-medium text-text-muted uppercase tracking-wide">
              {t('backup.config')}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <span className="text-text-muted">{t('backup.retentionDays')}:</span>{' '}
              <span className="font-medium">{backupConfig.retentionDays}</span>
            </div>
            <div>
              <span className="text-text-muted">{t('backup.cloudEnabled')}:</span>{' '}
              <span
                className={`font-medium ${backupConfig.cloudEnabled ? 'text-brand' : 'text-text-muted'}`}
              >
                {backupConfig.cloudEnabled ? 'Sì' : 'No'}
              </span>
            </div>
          </div>
        </Card>
      )}

      {/* Backups List */}
      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : !backups?.length ? (
        <Card className="p-6 text-center">
          <CloudOff size={48} strokeWidth={1.5} className="text-text-muted mx-auto" />
          <p className="text-text-muted mt-2">{t('backup.noBackups')}</p>
        </Card>
      ) : (
        <div className="space-y-2">
          {backups.map((backup, i) => (
            <motion.div
              key={backup.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
            >
              <Card className="p-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${statusColor[backup.status]}`}
                      >
                        {t(`backup.${backup.status}`)}
                      </span>
                      {backup.status === 'COMPLETED' && (
                        <span className="text-[10px] text-text-muted">
                          {formatSize(backup.sizeBytes)}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-text-muted mt-1 truncate">{backup.filename}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between text-[10px] text-text-muted">
                  <div className="flex items-center gap-3">
                    <span>{formatDate(backup.createdAt)}</span>
                    <span className="flex items-center gap-0.5">
                      {backup.triggeredBy === 'scheduler' ? (
                        <Clock size={10} />
                      ) : (
                        <User size={10} />
                      )}
                      {backup.triggeredBy === 'scheduler'
                        ? t('backup.scheduler')
                        : t('backup.manual')}
                    </span>
                  </div>

                  {backup.status === 'COMPLETED' && (
                    <div className="flex items-center gap-1">
                      {/* Download */}
                      <a
                        href={`/api/backup/${backup.id}/download`}
                        className="p-2.5 rounded-lg text-text-muted hover:text-brand hover:bg-brand/10 transition-all"
                        title={t('backup.download')}
                      >
                        <Download size={16} />
                      </a>

                      {/* Restore (ROOT only) */}
                      {isRoot && (
                        <button
                          onClick={() => setRestoreConfirmId(backup.id)}
                          className="p-2.5 rounded-lg text-text-muted hover:text-gold hover:bg-gold/10 transition-all"
                          title={t('backup.restore')}
                        >
                          <RotateCcw size={16} />
                        </button>
                      )}

                      {/* Delete */}
                      <button
                        onClick={() => setDeleteConfirmId(backup.id)}
                        className="p-2.5 rounded-lg text-text-muted hover:text-red-400 hover:bg-red-500/10 transition-all"
                        title={t('common.delete')}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  )}
                </div>

                {/* Error message */}
                {backup.error && (
                  <p className="text-[10px] text-red-400 mt-1 truncate">{backup.error}</p>
                )}

                {/* Restore Confirm */}
                {restoreConfirmId === backup.id && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="bg-gold/10 border border-gold/30 rounded-xl p-3 mt-2 space-y-2"
                  >
                    <p className="text-xs text-gold">{t('backup.restoreConfirm')}</p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setRestoreConfirmId(null)}
                        className="flex-1 py-1.5 rounded-lg text-xs bg-surface-2 text-text-muted hover:text-text-primary transition-all"
                      >
                        {t('common.cancel')}
                      </button>
                      <button
                        onClick={() => handleRestore(backup.id)}
                        disabled={restoreBackup.isPending}
                        className="flex-1 py-1.5 rounded-lg text-xs bg-gold text-black font-medium hover:bg-gold/80 transition-all"
                      >
                        {restoreBackup.isPending ? '...' : t('common.confirm')}
                      </button>
                    </div>
                  </motion.div>
                )}

                {/* Delete Confirm */}
                {deleteConfirmId === backup.id && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 mt-2 space-y-2"
                  >
                    <p className="text-xs text-red-400">{t('backup.deleteConfirm')}</p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setDeleteConfirmId(null)}
                        className="flex-1 py-1.5 rounded-lg text-xs bg-surface-2 text-text-muted hover:text-text-primary transition-all"
                      >
                        {t('common.cancel')}
                      </button>
                      <button
                        onClick={() => handleDelete(backup.id)}
                        disabled={deleteBackup.isPending}
                        className="flex-1 py-1.5 rounded-lg text-xs bg-red-500 text-white hover:bg-red-600 transition-all"
                      >
                        {deleteBackup.isPending ? '...' : t('common.confirm')}
                      </button>
                    </div>
                  </motion.div>
                )}
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {/* DB Maintenance */}
      <Card className="p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Wrench size={20} className="text-purple-400" />
          <h3 className="font-heading font-bold text-sm">{t('backup.maintenance')}</h3>
        </div>
        <p className="text-xs text-text-muted">{t('backup.maintenanceDesc')}</p>

        <div className="flex gap-2">
          <button
            onClick={handleMaintenance}
            disabled={runMaintenance.isPending}
            className="flex-1 py-2.5 rounded-xl text-sm font-medium bg-purple-500/15 text-purple-400 hover:bg-purple-500/25 transition-all flex items-center justify-center gap-1"
          >
            <Hammer size={20} />
            {runMaintenance.isPending ? t('backup.running') : t('backup.runMaintenance')}
          </button>
          <button
            onClick={() => runRetention.mutate(undefined)}
            disabled={runRetention.isPending}
            className="flex-1 py-2.5 rounded-xl text-sm font-medium bg-orange-500/15 text-orange-400 hover:bg-orange-500/25 transition-all flex items-center justify-center gap-1"
          >
            <Timer size={20} />
            {runRetention.isPending ? t('backup.running') : t('backup.runRetention')}
          </button>
        </div>

        {/* Maintenance Result */}
        <AnimatePresence>
          {maintenanceResult && (
            <motion.div
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="bg-purple-500/10 border border-purple-500/30 rounded-xl p-3"
            >
              <p className="text-xs text-purple-400 font-medium mb-1">
                {t('backup.maintenanceSuccess')}
              </p>
              <div className="grid grid-cols-3 gap-2 text-[10px]">
                <div className="flex items-center gap-1">
                  {maintenanceResult.vacuum ? (
                    <CheckCircle size={12} className="text-brand" />
                  ) : (
                    <XCircle size={12} className="text-red-400" />
                  )}
                  {t('backup.vacuum')}
                </div>
                <div className="flex items-center gap-1">
                  {maintenanceResult.analyze ? (
                    <CheckCircle size={12} className="text-brand" />
                  ) : (
                    <XCircle size={12} className="text-red-400" />
                  )}
                  {t('backup.analyze')}
                </div>
                <div className="flex items-center gap-1">
                  {maintenanceResult.reindex ? (
                    <CheckCircle size={12} className="text-brand" />
                  ) : (
                    <XCircle size={12} className="text-red-400" />
                  )}
                  {t('backup.reindex')}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {runMaintenance.isError && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 text-xs text-red-400">
            {runMaintenance.error?.message}
          </div>
        )}
      </Card>
    </div>
  );
}
