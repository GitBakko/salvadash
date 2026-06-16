import { describe, it, expect } from 'vitest';
import { toCents, fromCents, sumMoney } from '../lib/money.js';

describe('money helpers', () => {
  describe('toCents', () => {
    it('converts euro amounts (number/string/Decimal-like) to integer cents', () => {
      expect(toCents(1234.56)).toBe(123456);
      expect(toCents('1500.50')).toBe(150050);
      expect(toCents(0)).toBe(0);
      expect(toCents(0.1)).toBe(10);
      expect(toCents({ toString: () => '0.01' })).toBe(1);
    });
  });

  describe('fromCents', () => {
    it('converts integer cents back to euros', () => {
      expect(fromCents(150050)).toBe(1500.5);
      expect(fromCents(1)).toBe(0.01);
      expect(fromCents(0)).toBe(0);
    });
  });

  describe('sumMoney', () => {
    it('sums without binary-float drift', () => {
      // The whole point: these are NOT exact with naive `+`.
      expect(0.1 + 0.2).not.toBe(0.3);
      expect(sumMoney([0.1, 0.2])).toBe(0.3);
      expect(0.1 + 0.7).not.toBe(0.8);
      expect(sumMoney([0.1, 0.7])).toBe(0.8);
      expect(sumMoney([0.1, 0.2, 0.3])).toBe(0.6);
    });

    it('sums realistic mixed inputs exactly', () => {
      expect(sumMoney([1234.56, 7.89, 0.05])).toBe(1242.5);
      expect(sumMoney(['1500.50', 2000, { toString: () => '0.01' }])).toBe(3500.51);
    });

    it('returns 0 for an empty list', () => {
      expect(sumMoney([])).toBe(0);
    });

    it('accumulates many small amounts without drift', () => {
      const cents = Array.from({ length: 100 }, () => 0.01);
      expect(sumMoney(cents)).toBe(1);
    });
  });
});
