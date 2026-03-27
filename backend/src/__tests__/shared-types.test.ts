import { describe, it, expect } from 'vitest';
import {
  formatCurrency,
  formatDelta,
  formatPercent,
  CURRENCIES,
  type CurrencyCode,
} from '@salvadash/shared';

describe('CURRENCIES', () => {
  it('has EUR, GBP, USD', () => {
    expect(Object.keys(CURRENCIES)).toEqual(['EUR', 'GBP', 'USD']);
  });

  it('EUR uses it-IT locale', () => {
    expect(CURRENCIES.EUR.locale).toBe('it-IT');
    expect(CURRENCIES.EUR.symbol).toBe('€');
  });

  it('GBP uses en-GB locale', () => {
    expect(CURRENCIES.GBP.locale).toBe('en-GB');
    expect(CURRENCIES.GBP.symbol).toBe('£');
  });

  it('USD uses en-US locale', () => {
    expect(CURRENCIES.USD.locale).toBe('en-US');
    expect(CURRENCIES.USD.symbol).toBe('$');
  });
});

describe('formatCurrency', () => {
  it('formats EUR correctly with 2 decimals', () => {
    const result = formatCurrency(1234.56, 'EUR');
    expect(result).toContain('234,56');
    expect(result).toContain('€');
  });

  it('formats USD correctly', () => {
    const result = formatCurrency(1234.56, 'USD');
    expect(result).toContain('1,234.56');
    expect(result).toContain('$');
  });

  it('formats GBP correctly', () => {
    const result = formatCurrency(1234.56, 'GBP');
    expect(result).toContain('1,234.56');
    expect(result).toContain('£');
  });

  it('defaults to EUR', () => {
    const result = formatCurrency(100);
    expect(result).toContain('€');
  });

  it('handles zero', () => {
    const result = formatCurrency(0, 'EUR');
    expect(result).toContain('0,00');
  });

  it('handles negative amounts', () => {
    const result = formatCurrency(-500, 'EUR');
    expect(result).toContain('500,00');
  });
});

describe('formatDelta', () => {
  it('adds + sign for positive values', () => {
    const result = formatDelta(100, 'EUR');
    expect(result).toMatch(/^\+/);
    expect(result).toContain('€');
  });

  it('shows negative values with -', () => {
    const result = formatDelta(-100, 'EUR');
    expect(result).not.toMatch(/^\+/);
    expect(result).toContain('€');
  });

  it('handles zero with + sign', () => {
    const result = formatDelta(0, 'EUR');
    expect(result).toMatch(/^\+/);
  });
});

describe('formatPercent', () => {
  it('formats positive percent with + sign', () => {
    expect(formatPercent(12.345)).toBe('+12.35%');
  });

  it('formats negative percent without + sign', () => {
    expect(formatPercent(-5.1)).toBe('-5.10%');
  });

  it('formats zero as +0.00%', () => {
    expect(formatPercent(0)).toBe('+0.00%');
  });
});
