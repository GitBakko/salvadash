import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fmtCurrency, fmtCurrencyCompact, fmtDelta, fmtPercent } from '../lib/format';

// Mock the auth store
vi.mock('../stores/auth-store', () => ({
  useAuthStore: {
    getState: vi.fn(() => ({ user: { currency: 'EUR' } })),
  },
}));

import { useAuthStore } from '../stores/auth-store';

describe('format utilities', () => {
  beforeEach(() => {
    vi.mocked(useAuthStore.getState).mockReturnValue({ user: { currency: 'EUR' } } as any);
  });

  // ─── fmtCurrency ──────────────────────────

  describe('fmtCurrency', () => {
    it('formats EUR values', () => {
      const result = fmtCurrency(1234.56);
      expect(result).toContain('234,56');
      expect(result).toContain('€');
    });

    it('formats zero', () => {
      const result = fmtCurrency(0);
      expect(result).toContain('0,00');
    });

    it('formats negative values', () => {
      const result = fmtCurrency(-500);
      expect(result).toContain('500,00');
    });

    it('uses user currency from store (USD)', () => {
      vi.mocked(useAuthStore.getState).mockReturnValue({ user: { currency: 'USD' } } as any);
      const result = fmtCurrency(99.99);
      expect(result).toContain('$');
      expect(result).toContain('99.99');
    });

    it('falls back to EUR when no user', () => {
      vi.mocked(useAuthStore.getState).mockReturnValue({ user: null } as any);
      const result = fmtCurrency(100);
      expect(result).toContain('€');
    });

    it('falls back to EUR for unknown currency', () => {
      vi.mocked(useAuthStore.getState).mockReturnValue({ user: { currency: 'XYZ' } } as any);
      const result = fmtCurrency(100);
      expect(result).toContain('€');
    });
  });

  // ─── fmtCurrencyCompact ───────────────────

  describe('fmtCurrencyCompact', () => {
    it('formats large numbers compactly', () => {
      const result = fmtCurrencyCompact(50000);
      expect(result).toContain('€');
      // Compact notation: e.g., 50.000 € or 50K €
    });

    it('formats small numbers', () => {
      const result = fmtCurrencyCompact(42);
      expect(result).toContain('€');
      expect(result).toContain('42');
    });
  });

  // ─── fmtDelta ─────────────────────────────

  describe('fmtDelta', () => {
    it('formats positive delta with +', () => {
      const result = fmtDelta(250);
      expect(result).toContain('+');
      expect(result).toContain('250');
    });

    it('formats negative delta with -', () => {
      const result = fmtDelta(-100);
      expect(result).toContain('-');
      expect(result).toContain('100');
    });

    it('formats zero delta', () => {
      const result = fmtDelta(0);
      expect(result).toContain('0');
    });
  });

  // ─── fmtPercent ───────────────────────────

  describe('fmtPercent', () => {
    it('formats positive percent with + and %', () => {
      expect(fmtPercent(12.3)).toBe('+12.3%');
    });

    it('formats negative percent', () => {
      expect(fmtPercent(-5.7)).toBe('-5.7%');
    });

    it('formats zero percent', () => {
      expect(fmtPercent(0)).toBe('+0.0%');
    });

    it('rounds to 1 decimal', () => {
      expect(fmtPercent(3.456)).toBe('+3.5%');
    });
  });
});
