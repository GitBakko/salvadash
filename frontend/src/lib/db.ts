import Dexie, { type EntityTable } from 'dexie';

// ─── Cache Types ────────────────────────────────────────────

export interface CachedEntry {
  id: string;
  userId: string;
  date: string;
  total: number;
  totalIncome: number;
  balancesJson: string;
  incomesJson: string;
  notes: string | null;
  syncedAt: number;
}

export interface CachedAccount {
  id: string;
  userId: string;
  name: string;
  type: string;
  icon: string | null;
  color: string | null;
  isActive: boolean;
  sortOrder: number;
  syncedAt: number;
}

export interface CachedDashboard {
  id: string; // 'dashboard-{userId}'
  userId: string;
  dataJson: string;
  syncedAt: number;
}

// ─── Database ───────────────────────────────────────────────

class SalvaDashDB extends Dexie {
  entries!: EntityTable<CachedEntry, 'id'>;
  accounts!: EntityTable<CachedAccount, 'id'>;
  dashboard!: EntityTable<CachedDashboard, 'id'>;

  constructor() {
    super('salvadash');
    this.version(2).stores({
      entries: 'id, userId, date, syncedAt',
      accounts: 'id, userId, sortOrder, syncedAt',
      dashboard: 'id, userId, syncedAt',
    });
  }
}

export const db = new SalvaDashDB();

// ─── Cache Helpers ──────────────────────────────────────────

export async function clearUserCache(userId: string) {
  await db.entries.where('userId').equals(userId).delete();
  await db.accounts.where('userId').equals(userId).delete();
  await db.dashboard.where('userId').equals(userId).delete();
}

export async function clearAllCache() {
  await db.entries.clear();
  await db.accounts.clear();
  await db.dashboard.clear();
}

// ─── Sync Helpers (server → IndexedDB) ─────────────────────

export async function cacheEntries(userId: string, entries: CachedEntry[]) {
  const now = Date.now();
  await db.transaction('rw', db.entries, async () => {
    await db.entries.where('userId').equals(userId).delete();
    await db.entries.bulkPut(entries.map((e) => ({ ...e, syncedAt: now })));
  });
}

export async function cacheAccounts(userId: string, accounts: CachedAccount[]) {
  const now = Date.now();
  await db.transaction('rw', db.accounts, async () => {
    await db.accounts.where('userId').equals(userId).delete();
    await db.accounts.bulkPut(accounts.map((a) => ({ ...a, syncedAt: now })));
  });
}

export async function cacheDashboard(userId: string, data: unknown) {
  await db.dashboard.put({
    id: `dashboard-${userId}`,
    userId,
    dataJson: JSON.stringify(data),
    syncedAt: Date.now(),
  });
}

export async function getCachedDashboard(userId: string) {
  const row = await db.dashboard.get(`dashboard-${userId}`);
  if (!row) return null;
  try {
    return JSON.parse(row.dataJson);
  } catch {
    return null;
  }
}

export async function getCachedEntries(userId: string) {
  return db.entries.where('userId').equals(userId).reverse().sortBy('date');
}

export async function getCachedAccounts(userId: string) {
  return db.accounts.where('userId').equals(userId).sortBy('sortOrder');
}
