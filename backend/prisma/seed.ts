import { PrismaClient, Role, AccountType } from '@prisma/client';
import bcrypt from 'bcryptjs';
import XLSX from 'xlsx';
import path from 'path';

const prisma = new PrismaClient();

// ─── Env config (credentials ONLY from env) ───────────────
const env = (key: string, fallback?: string): string => {
  const val = process.env[key] ?? fallback;
  if (!val) throw new Error(`Missing env: ${key}`);
  return val;
};

// ─── Account & Income configuration ───────────────────────
const MAIN_ACCOUNTS = ['Bancoposta', 'ING Direct'];
const SUB_ACCOUNTS = [
  'Yap',
  'Satispay',
  'Postepay',
  'Capital.com',
  'Oval',
  'Binance',
  'Coinbase',
  'Moneyfarm',
  'Directa',
  'Generali',
  'PayPal',
];

// Case-insensitive name lookup: lowercase → canonical name
const ALL_ACCOUNT_NAMES = [...MAIN_ACCOUNTS, ...SUB_ACCOUNTS];
const nameLookup: Record<string, string> = {};
for (const n of ALL_ACCOUNT_NAMES) nameLookup[n.toLowerCase()] = n;
const INCOME_SOURCES = ['Stipendio', 'Pensione'];

// Row indices (0-based) in each sheet — column A is label
const INCOME_ROWS: Record<string, number> = { Stipendio: 1, Pensione: 2 };
const MAIN_ACCOUNT_ROWS: Record<string, number> = { Bancoposta: 3, 'ING Direct': 5 };
// Row 4 = "Altri conti" (total of sub-accounts, skip), Row 6 = "TOTALE" (skip)

// Sheets to import
const SHEETS_TO_IMPORT = ['2023', '2024', '2025', '2026'];

// ────────────────────────────────────────────────────────────
async function main(): Promise<void> {
  console.log('🌱 Seeding SalvaDash database...\n');

  // ── 1. Create users ──────────────────────────────────────
  const rootHash = await bcrypt.hash(env('SEED_ROOT_PASSWORD'), 12);
  const bakkoHash = await bcrypt.hash(env('SEED_BAKKO_PASSWORD'), 12);

  const rootUser = await prisma.user.upsert({
    where: { email: env('SEED_ROOT_EMAIL') },
    update: {},
    create: {
      name: env('SEED_ROOT_NAME', 'Root'),
      email: env('SEED_ROOT_EMAIL'),
      username: env('SEED_ROOT_USERNAME', 'root'),
      passwordHash: rootHash,
      role: Role.ROOT,
      emailVerified: true,
    },
  });
  console.log(`✅ Root user: ${rootUser.email}`);

  const bakkoUser = await prisma.user.upsert({
    where: { email: env('SEED_BAKKO_EMAIL') },
    update: {},
    create: {
      name: env('SEED_BAKKO_NAME', 'Bakko'),
      email: env('SEED_BAKKO_EMAIL'),
      username: env('SEED_BAKKO_USERNAME', 'bakko'),
      passwordHash: bakkoHash,
      role: Role.ADMIN,
      emailVerified: true,
    },
  });
  console.log(`✅ Bakko user: ${bakkoUser.email}`);

  // ── 2. Create accounts for bakko ─────────────────────────
  const accountIds: Record<string, string> = {};

  for (let i = 0; i < MAIN_ACCOUNTS.length; i++) {
    const a = await prisma.account.upsert({
      where: { userId_name: { userId: bakkoUser.id, name: MAIN_ACCOUNTS[i] } },
      update: {},
      create: {
        userId: bakkoUser.id,
        name: MAIN_ACCOUNTS[i],
        type: AccountType.MAIN,
        sortOrder: i,
      },
    });
    accountIds[MAIN_ACCOUNTS[i]] = a.id;
  }

  for (let i = 0; i < SUB_ACCOUNTS.length; i++) {
    const a = await prisma.account.upsert({
      where: { userId_name: { userId: bakkoUser.id, name: SUB_ACCOUNTS[i] } },
      update: {},
      create: {
        userId: bakkoUser.id,
        name: SUB_ACCOUNTS[i],
        type: AccountType.SUB,
        sortOrder: MAIN_ACCOUNTS.length + i,
      },
    });
    accountIds[SUB_ACCOUNTS[i]] = a.id;
  }
  console.log(`✅ ${Object.keys(accountIds).length} accounts created`);

  // ── 3. Create income sources for bakko ───────────────────
  const incomeIds: Record<string, string> = {};

  for (let i = 0; i < INCOME_SOURCES.length; i++) {
    const s = await prisma.incomeSource.upsert({
      where: { userId_name: { userId: bakkoUser.id, name: INCOME_SOURCES[i] } },
      update: {},
      create: {
        userId: bakkoUser.id,
        name: INCOME_SOURCES[i],
        sortOrder: i,
      },
    });
    incomeIds[INCOME_SOURCES[i]] = s.id;
  }
  console.log(`✅ ${Object.keys(incomeIds).length} income sources created`);

  // ── 4. Parse Excel data ──────────────────────────────────
  const excelPath = env(
    'SEED_EXCEL_PATH',
    path.resolve(process.cwd(), 'prisma', 'data', 'Risparmi.xlsx'),
  );
  console.log(`\n📊 Reading Excel: ${excelPath}`);

  const workbook = XLSX.readFile(excelPath);
  let totalEntries = 0;

  for (const sheetName of SHEETS_TO_IMPORT) {
    if (!workbook.SheetNames.includes(sheetName)) {
      console.log(`⚠️  Sheet "${sheetName}" not found, skipping`);
      continue;
    }

    const sheet = workbook.Sheets[sheetName];
    const rows: (string | number | null)[][] = XLSX.utils.sheet_to_json(sheet, {
      header: 1,
      defval: null,
      raw: true,
    });

    if (rows.length < 7) {
      console.log(`⚠️  Sheet "${sheetName}" too short, skipping`);
      continue;
    }

    const headers = rows[0];
    const year = parseInt(sheetName, 10);
    let sheetEntries = 0;

    // Iterate columns starting from B (index 1)
    for (let col = 1; col < headers.length; col++) {
      const rawDate = headers[col];
      if (rawDate == null) continue;

      const entryDate = parseExcelDate(rawDate, year);
      if (!entryDate) {
        console.log(`  ⚠️  Cannot parse date col ${col}: ${rawDate}`);
        continue;
      }

      // Skip columns where main accounts have no data (month not yet filled)
      const hasData = Object.values(MAIN_ACCOUNT_ROWS).some(
        (row) => numAt(rows, row, col) !== null,
      );
      if (!hasData) continue;

      // Upsert entry (idempotent seed — reuse existing or create new)
      let entry = await prisma.monthlyEntry.findFirst({
        where: { userId: bakkoUser.id, date: entryDate },
      });
      if (!entry) {
        entry = await prisma.monthlyEntry.create({
          data: { userId: bakkoUser.id, date: entryDate },
        });
      } else {
        // Delete old balances/incomes so we can re-import cleanly
        await prisma.entryBalance.deleteMany({ where: { entryId: entry.id } });
        await prisma.entryIncome.deleteMany({ where: { entryId: entry.id } });
      }

      // ── Incomes ──
      for (const [name, row] of Object.entries(INCOME_ROWS)) {
        const val = numAt(rows, row, col);
        if (val !== null && incomeIds[name]) {
          await prisma.entryIncome.create({
            data: { entryId: entry.id, incomeSourceId: incomeIds[name], amount: val },
          });
        }
      }

      // ── Main account balances ──
      for (const [name, row] of Object.entries(MAIN_ACCOUNT_ROWS)) {
        const val = numAt(rows, row, col);
        if (val !== null && accountIds[name]) {
          await prisma.entryBalance.create({
            data: { entryId: entry.id, accountId: accountIds[name], amount: val },
          });
        }
      }

      // ── Sub-account balances (scan ALL rows for matching labels) ──
      for (let row = 0; row < rows.length; row++) {
        const label = rows[row]?.[0];
        if (!label || typeof label !== 'string') continue;
        const trimmed = label.trim();
        // Case-insensitive lookup to canonical name
        const canonical = nameLookup[trimmed.toLowerCase()];
        if (canonical && accountIds[canonical] && !MAIN_ACCOUNT_ROWS[canonical]) {
          const val = numAt(rows, row, col);
          if (val !== null) {
            await prisma.entryBalance.create({
              data: { entryId: entry.id, accountId: accountIds[canonical], amount: val },
            });
          }
        }
      }

      sheetEntries++;
    }

    totalEntries += sheetEntries;
    console.log(`✅ Sheet "${sheetName}": ${sheetEntries} entries`);
  }

  console.log(`\n🎉 Seed complete! ${totalEntries} entries imported.\n`);
}

// ─── Helpers ───────────────────────────────────────────────

function parseExcelDate(raw: string | number, sheetYear: number): Date | null {
  // Excel serial number
  if (typeof raw === 'number') {
    // XLSX stores dates as serial numbers — convert to JS Date
    const epoch = new Date(1899, 11, 30); // Excel epoch
    const msPerDay = 86400000;
    const d = new Date(epoch.getTime() + raw * msPerDay);
    return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  }

  if (typeof raw !== 'string') return null;

  // DD/MM or DD/MM/YYYY
  const parts = raw.split('/');
  if (parts.length >= 2) {
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10);
    const year = parts.length === 3 ? parseInt(parts[2], 10) : sheetYear;
    if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
      return new Date(Date.UTC(year, month - 1, day));
    }
  }

  return null;
}

function numAt(rows: (string | number | null)[][], row: number, col: number): number | null {
  if (row >= rows.length) return null;
  const cell = rows[row]?.[col];
  if (cell == null || cell === '') return null;
  if (typeof cell === 'number') return cell;
  if (typeof cell === 'string') {
    const cleaned = cell.replace(/[€\s]/g, '').replace(',', '.');
    const n = parseFloat(cleaned);
    return isNaN(n) ? null : n;
  }
  return null;
}

// ────────────────────────────────────────────────────────────
main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error('❌ Seed failed:', e);
    await prisma.$disconnect();
    process.exit(1);
  });
