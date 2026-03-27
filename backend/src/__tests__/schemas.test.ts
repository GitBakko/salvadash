import { describe, it, expect } from 'vitest';
import {
  loginSchema,
  registerSchema,
  updateProfileSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  createAccountSchema,
  updateAccountSchema,
  reorderAccountsSchema,
  createEntrySchema,
  updateEntrySchema,
  createIncomeSourceSchema,
  updateIncomeSourceSchema,
  reorderIncomeSourcesSchema,
  createInviteCodeSchema,
  sendNotificationSchema,
  adminUpdateUserSchema,
} from '@salvadash/shared';

// ─── loginSchema ────────────────────────────────────────────

describe('loginSchema', () => {
  it('accepts valid input', () => {
    const result = loginSchema.safeParse({ email: 'a@b.com', password: '12345678' });
    expect(result.success).toBe(true);
  });

  it('rejects invalid email', () => {
    const result = loginSchema.safeParse({ email: 'not-an-email', password: '12345678' });
    expect(result.success).toBe(false);
  });

  it('rejects short password', () => {
    const result = loginSchema.safeParse({ email: 'a@b.com', password: '123' });
    expect(result.success).toBe(false);
  });

  it('rejects too long password', () => {
    const result = loginSchema.safeParse({ email: 'a@b.com', password: 'x'.repeat(129) });
    expect(result.success).toBe(false);
  });

  it('rejects missing fields', () => {
    expect(loginSchema.safeParse({}).success).toBe(false);
    expect(loginSchema.safeParse({ email: 'a@b.com' }).success).toBe(false);
  });
});

// ─── registerSchema ─────────────────────────────────────────

describe('registerSchema', () => {
  const validData = {
    name: 'Mario Rossi',
    email: 'mario@test.com',
    password: 'password123',
    confirmPassword: 'password123',
    inviteCode: 'ABC123',
  };

  it('accepts valid register input', () => {
    expect(registerSchema.safeParse(validData).success).toBe(true);
  });

  it('rejects mismatching passwords', () => {
    expect(registerSchema.safeParse({ ...validData, confirmPassword: 'other' }).success).toBe(false);
  });

  it('rejects short name', () => {
    expect(registerSchema.safeParse({ ...validData, name: 'A' }).success).toBe(false);
  });

  it('rejects empty inviteCode', () => {
    expect(registerSchema.safeParse({ ...validData, inviteCode: '' }).success).toBe(false);
  });

  it('accepts optional language/currency', () => {
    const result = registerSchema.safeParse({ ...validData, language: 'en', currency: 'USD' });
    expect(result.success).toBe(true);
    expect(result.data?.language).toBe('en');
    expect(result.data?.currency).toBe('USD');
  });

  it('defaults language to it and currency to EUR', () => {
    const result = registerSchema.safeParse(validData);
    expect(result.success).toBe(true);
    expect(result.data?.language).toBe('it');
    expect(result.data?.currency).toBe('EUR');
  });

  it('rejects invalid language', () => {
    expect(registerSchema.safeParse({ ...validData, language: 'fr' }).success).toBe(false);
  });

  it('rejects invalid currency', () => {
    expect(registerSchema.safeParse({ ...validData, currency: 'JPY' }).success).toBe(false);
  });
});

// ─── updateProfileSchema ────────────────────────────────────

describe('updateProfileSchema', () => {
  it('accepts partial name update', () => {
    expect(updateProfileSchema.safeParse({ name: 'Luca' }).success).toBe(true);
  });

  it('accepts partial language update', () => {
    expect(updateProfileSchema.safeParse({ language: 'en' }).success).toBe(true);
  });

  it('accepts partial currency update', () => {
    expect(updateProfileSchema.safeParse({ currency: 'GBP' }).success).toBe(true);
  });

  it('accepts empty object (all optional)', () => {
    expect(updateProfileSchema.safeParse({}).success).toBe(true);
  });

  it('rejects short name', () => {
    expect(updateProfileSchema.safeParse({ name: 'X' }).success).toBe(false);
  });
});

// ─── forgotPasswordSchema ───────────────────────────────────

describe('forgotPasswordSchema', () => {
  it('accepts valid email', () => {
    expect(forgotPasswordSchema.safeParse({ email: 'x@y.com' }).success).toBe(true);
  });

  it('rejects invalid email', () => {
    expect(forgotPasswordSchema.safeParse({ email: 'bad' }).success).toBe(false);
  });
});

// ─── resetPasswordSchema ────────────────────────────────────

describe('resetPasswordSchema', () => {
  it('accepts valid input', () => {
    const data = { token: 'abc123', password: '12345678', confirmPassword: '12345678' };
    expect(resetPasswordSchema.safeParse(data).success).toBe(true);
  });

  it('rejects password mismatch', () => {
    const data = { token: 'abc', password: 'password1', confirmPassword: 'password2' };
    expect(resetPasswordSchema.safeParse(data).success).toBe(false);
  });
});

// ─── createAccountSchema ────────────────────────────────────

describe('createAccountSchema', () => {
  it('accepts valid account', () => {
    expect(createAccountSchema.safeParse({ name: 'My Bank', type: 'MAIN' }).success).toBe(true);
  });

  it('rejects invalid type', () => {
    expect(createAccountSchema.safeParse({ name: 'My Bank', type: 'OTHER' }).success).toBe(false);
  });

  it('rejects missing name', () => {
    expect(createAccountSchema.safeParse({ type: 'MAIN' }).success).toBe(false);
  });
});

// ─── updateAccountSchema ────────────────────────────────────

describe('updateAccountSchema', () => {
  it('accepts partial update', () => {
    expect(updateAccountSchema.safeParse({ name: 'Updated' }).success).toBe(true);
  });

  it('accepts isActive toggle', () => {
    expect(updateAccountSchema.safeParse({ isActive: false }).success).toBe(true);
  });
});

// ─── createEntrySchema ──────────────────────────────────────

describe('createEntrySchema', () => {
  const valid = {
    date: '2025-03-01',
    balances: [{ accountId: 'acc1', amount: 1000 }],
    incomes: [{ incomeSourceId: 'src1', amount: 2000 }],
  };

  it('accepts valid entry', () => {
    expect(createEntrySchema.safeParse(valid).success).toBe(true);
  });

  it('rejects empty balances', () => {
    expect(createEntrySchema.safeParse({ ...valid, balances: [] }).success).toBe(false);
  });

  it('rejects missing date', () => {
    expect(createEntrySchema.safeParse({ balances: valid.balances, incomes: valid.incomes }).success).toBe(false);
  });
});

// ─── Income Source Schemas ──────────────────────────────────

describe('createIncomeSourceSchema', () => {
  it('accepts valid name', () => {
    expect(createIncomeSourceSchema.safeParse({ name: 'Stipendio' }).success).toBe(true);
  });

  it('rejects empty name', () => {
    expect(createIncomeSourceSchema.safeParse({ name: '' }).success).toBe(false);
  });
});

describe('updateIncomeSourceSchema', () => {
  it('accepts name update', () => {
    expect(updateIncomeSourceSchema.safeParse({ name: 'Pensione' }).success).toBe(true);
  });

  it('accepts isActive toggle', () => {
    expect(updateIncomeSourceSchema.safeParse({ isActive: false }).success).toBe(true);
  });
});

// ─── createInviteCodeSchema ─────────────────────────────────

describe('createInviteCodeSchema', () => {
  it('accepts empty object (auto-generate)', () => {
    expect(createInviteCodeSchema.safeParse({}).success).toBe(true);
  });

  it('accepts explicit code', () => {
    expect(createInviteCodeSchema.safeParse({ code: 'ABCDEF' }).success).toBe(true);
  });

  it('rejects too short code', () => {
    expect(createInviteCodeSchema.safeParse({ code: 'AB' }).success).toBe(false);
  });
});

// ─── sendNotificationSchema ─────────────────────────────────

describe('sendNotificationSchema', () => {
  it('accepts valid notification', () => {
    const data = { type: 'ALERT' as const, title: 'Titolo', body: 'Corpo' };
    expect(sendNotificationSchema.safeParse(data).success).toBe(true);
  });

  it('accepts optional userId (broadcast)', () => {
    const data = { type: 'ADMIN' as const, title: 'Test', body: 'Content', userId: 'user123' };
    expect(sendNotificationSchema.safeParse(data).success).toBe(true);
  });

  it('rejects missing title', () => {
    expect(sendNotificationSchema.safeParse({ type: 'INFO', body: 'test' }).success).toBe(false);
  });

  it('rejects missing body', () => {
    expect(sendNotificationSchema.safeParse({ type: 'INFO', title: 'test' }).success).toBe(false);
  });

  it('accepts all notification types', () => {
    for (const type of ['REMINDER', 'MILESTONE', 'ALERT', 'ADMIN', 'SYSTEM']) {
      expect(sendNotificationSchema.safeParse({ type, title: 'T', body: 'B' }).success).toBe(true);
    }
  });
});

// ─── adminUpdateUserSchema ──────────────────────────────────

describe('adminUpdateUserSchema', () => {
  it('accepts role change', () => {
    expect(adminUpdateUserSchema.safeParse({ role: 'ADMIN' }).success).toBe(true);
    expect(adminUpdateUserSchema.safeParse({ role: 'BASE' }).success).toBe(true);
  });

  it('rejects ROOT role', () => {
    expect(adminUpdateUserSchema.safeParse({ role: 'ROOT' }).success).toBe(false);
  });

  it('accepts isActive toggle', () => {
    expect(adminUpdateUserSchema.safeParse({ isActive: true }).success).toBe(true);
  });

  it('accepts empty object', () => {
    expect(adminUpdateUserSchema.safeParse({}).success).toBe(true);
  });
});

// ─── Account color validation ───────────────────────────────

describe('createAccountSchema — color validation', () => {
  it('accepts valid hex color', () => {
    expect(createAccountSchema.safeParse({ name: 'Test', type: 'MAIN', color: '#FF00AA' }).success).toBe(true);
  });

  it('rejects invalid hex color', () => {
    expect(createAccountSchema.safeParse({ name: 'Test', type: 'MAIN', color: 'red' }).success).toBe(false);
    expect(createAccountSchema.safeParse({ name: 'Test', type: 'MAIN', color: '#GGG' }).success).toBe(false);
  });

  it('defaults type to MAIN', () => {
    const result = createAccountSchema.safeParse({ name: 'Test' });
    expect(result.success).toBe(true);
    expect(result.data?.type).toBe('MAIN');
  });
});

// ─── Reorder schemas ────────────────────────────────────────

describe('reorderAccountsSchema', () => {
  it('accepts valid reorder', () => {
    expect(reorderAccountsSchema.safeParse({
      accounts: [{ id: 'a1', sortOrder: 0 }, { id: 'a2', sortOrder: 1 }],
    }).success).toBe(true);
  });

  it('rejects negative sortOrder', () => {
    expect(reorderAccountsSchema.safeParse({
      accounts: [{ id: 'a1', sortOrder: -1 }],
    }).success).toBe(false);
  });
});

describe('reorderIncomeSourcesSchema', () => {
  it('accepts valid reorder', () => {
    expect(reorderIncomeSourcesSchema.safeParse({
      sources: [{ id: 's1', sortOrder: 0 }],
    }).success).toBe(true);
  });
});

// ─── Entry date validation ──────────────────────────────────

describe('createEntrySchema — date validation', () => {
  it('rejects future date', () => {
    const futureDate = new Date();
    futureDate.setFullYear(futureDate.getFullYear() + 1);
    expect(createEntrySchema.safeParse({
      date: futureDate.toISOString().slice(0, 10),
      balances: [{ accountId: 'a1', amount: 100 }],
    }).success).toBe(false);
  });

  it('rejects invalid date string', () => {
    expect(createEntrySchema.safeParse({
      date: 'not-a-date',
      balances: [{ accountId: 'a1', amount: 100 }],
    }).success).toBe(false);
  });

  it('rejects negative balance amount', () => {
    expect(createEntrySchema.safeParse({
      date: '2025-01-01',
      balances: [{ accountId: 'a1', amount: -100 }],
    }).success).toBe(false);
  });

  it('accepts notes', () => {
    const result = createEntrySchema.safeParse({
      date: '2025-01-01',
      balances: [{ accountId: 'a1', amount: 100 }],
      notes: 'Test note',
    });
    expect(result.success).toBe(true);
  });

  it('rejects notes over 1000 chars', () => {
    expect(createEntrySchema.safeParse({
      date: '2025-01-01',
      balances: [{ accountId: 'a1', amount: 100 }],
      notes: 'x'.repeat(1001),
    }).success).toBe(false);
  });
});
