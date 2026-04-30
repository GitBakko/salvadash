// Centralized React Query key factory.
// All per-domain hook files import from here to keep keys consistent.

export const queryKeys = {
  accounts: ['accounts'] as const,
  dashboard: (year: string) => ['dashboard', year] as const,
  entries: (year?: string) => (year ? (['entries', year] as const) : (['entries'] as const)),
  entry: (id: string) => ['entry', id] as const,
  incomeSources: ['incomeSources'] as const,
  analytics: (accountIds?: string[]) =>
    accountIds && accountIds.length > 0
      ? (['analytics', { accountIds: [...accountIds].sort() }] as const)
      : (['analytics'] as const),
  adminOverview: ['admin', 'overview'] as const,
  adminUsers: (search?: string, role?: string) => ['admin', 'users', { search, role }] as const,
  adminUser: (id: string) => ['admin', 'users', id] as const,
  inviteCodes: ['invite-codes'] as const,
  notifications: ['notifications'] as const,
  unreadCount: ['notifications', 'unread-count'] as const,
  backups: ['backups'] as const,
  backupConfig: ['backup', 'config'] as const,
  version: ['version'] as const,
  changelog: ['changelog'] as const,
};
