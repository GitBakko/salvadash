// ─── API Response Types ────────────────────────────────────

export interface ApiResponse<T = void> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  total: number;
  page: number;
  limit: number;
}

// ─── User ──────────────────────────────────────────────────

export interface UserPublic {
  id: string;
  name: string;
  email: string;
  username: string;
  role: 'ROOT' | 'ADMIN' | 'BASE';
  language: string;
  currency: string;
  avatarUrl: string | null;
  emailVerified: boolean;
  isActive: boolean;
  createdAt: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface LoginResponse {
  user: UserPublic;
  tokens: AuthTokens;
}

// ─── Account ───────────────────────────────────────────────

export interface AccountPublic {
  id: string;
  name: string;
  type: 'MAIN' | 'SUB';
  icon: string | null;
  color: string | null;
  isActive: boolean;
  sortOrder: number;
}

// ─── Income Source ─────────────────────────────────────────

export interface IncomeSourcePublic {
  id: string;
  name: string;
  isActive: boolean;
  sortOrder: number;
}

// ─── Entry ─────────────────────────────────────────────────

export interface EntryBalancePublic {
  id: string;
  accountId: string;
  accountName: string;
  amount: number;
}

export interface EntryIncomePublic {
  id: string;
  incomeSourceId: string;
  incomeSourceName: string;
  amount: number;
}

export interface EntryPublic {
  id: string;
  date: string;
  notes: string | null;
  balances: EntryBalancePublic[];
  incomes: EntryIncomePublic[];
  total: number;
  totalIncome: number;
  createdAt: string;
  updatedAt: string;
}

export interface EntryListItem {
  id: string;
  date: string;
  total: number;
  totalIncome: number;
  delta: number | null;
  deltaPercent: number | null;
}

// ─── Dashboard ─────────────────────────────────────────────

export interface DashboardData {
  currentTotal: number;
  currentEntry: EntryListItem | null;
  yearTotal: number | null;
  yearLabel: string;
  monthlyIncome: number;
  avgMonthlyYTD: number;
  bestMonth: { month: string; delta: number } | null;
  growthYTD: number;
  accountBreakdown: { accountId: string; name: string; amount: number; percent: number; color: string | null }[];
  recentEntries: EntryListItem[];
  sparklineData: number[];
}

// ─── Analytics ─────────────────────────────────────────────

export interface AnalyticsData {
  patrimonyOverTime: { date: string; total: number }[];
  yearComparison: Record<string, { month: number; total: number }[]>;
  accountBreakdown: { name: string; amount: number; percent: number; color: string | null }[];
  monthlyIncome: { date: string; sources: { name: string; amount: number }[] }[];
  bestMonth: { date: string; delta: number };
  worstMonth: { date: string; delta: number };
  avgGrowth: number;
  bestYear: { year: number; growth: number };
}

// ─── Notification ──────────────────────────────────────────

export interface NotificationPublic {
  id: string;
  type: 'REMINDER' | 'MILESTONE' | 'ALERT' | 'ADMIN' | 'SYSTEM';
  title: string;
  body: string;
  isRead: boolean;
  createdAt: string;
}

// ─── Admin ─────────────────────────────────────────────────

export interface AdminOverview {
  totalUsers: number;
  totalEntries: number;
  avgGrowth: number;
  activeUsers30d: number;
}

export interface AdminUserListItem {
  id: string;
  name: string;
  email: string;
  username: string;
  role: 'ROOT' | 'ADMIN' | 'BASE';
  isActive: boolean;
  createdAt: string;
  entriesCount: number;
  lastEntryDate: string | null;
  totalSavings: number;
}

export interface AdminUserDetail extends AdminUserListItem {
  language: string;
  currency: string;
  emailVerified: boolean;
  accountsCount: number;
  firstEntryDate: string | null;
}

export interface InviteCodePublic {
  id: string;
  code: string;
  isActive: boolean;
  createdAt: string;
  usedAt: string | null;
  createdByName: string | null;
  usedByName: string | null;
}

// ─── Backup ────────────────────────────────────────────────

export interface BackupInfo {
  id: string;
  filename: string;
  sizeBytes: number;
  status: 'RUNNING' | 'COMPLETED' | 'FAILED';
  error: string | null;
  triggeredBy: string | null;
  createdAt: string;
  completedAt: string | null;
}

export interface BackupConfig {
  retentionDays: number;
  cloudEnabled: boolean;
  backupDir: string;
}

export interface MaintenanceResult {
  vacuum: boolean;
  analyze: boolean;
  reindex: boolean;
}

// ─── Currency ──────────────────────────────────────────────

export const CURRENCIES = {
  EUR: { symbol: '€', locale: 'it-IT' },
  GBP: { symbol: '£', locale: 'en-GB' },
  USD: { symbol: '$', locale: 'en-US' },
} as const;

export type CurrencyCode = keyof typeof CURRENCIES;

export function formatCurrency(amount: number, currency: CurrencyCode = 'EUR'): string {
  const { locale } = CURRENCIES[currency];
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatDelta(amount: number, currency: CurrencyCode = 'EUR'): string {
  const sign = amount >= 0 ? '+' : '';
  return `${sign}${formatCurrency(amount, currency)}`;
}

export function formatPercent(value: number): string {
  const sign = value >= 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}%`;
}
