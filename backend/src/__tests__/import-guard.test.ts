import { describe, it, expect } from 'vitest';
import {
  decodeImportFile,
  parseAmount,
  isSaneEntryDate,
  ImportError,
  MAX_IMPORT_BYTES,
  MAX_AMOUNT,
} from '../lib/import-guard.js';

describe('decodeImportFile', () => {
  it('decodes a valid base64 payload to a Buffer', () => {
    const b64 = Buffer.from('hello world').toString('base64');
    const out = decodeImportFile(b64);
    expect(out).toBeInstanceOf(Buffer);
    expect(out.toString()).toBe('hello world');
  });

  it('rejects missing / non-string / empty input', () => {
    expect(() => decodeImportFile(undefined)).toThrow(ImportError);
    expect(() => decodeImportFile(null)).toThrow(ImportError);
    expect(() => decodeImportFile(123)).toThrow(ImportError);
    expect(() => decodeImportFile('')).toThrow(ImportError);
  });

  it('rejects an encoded payload that exceeds the size cap before decoding', () => {
    // base64 string longer than the encoded cap, without allocating real bytes
    const huge = 'A'.repeat(Math.ceil((MAX_IMPORT_BYTES * 4) / 3) + 100);
    expect(() => decodeImportFile(huge)).toThrow(/too large/i);
  });

  it('rejects a decoded buffer that exceeds the size cap', () => {
    const big = Buffer.alloc(MAX_IMPORT_BYTES + 1, 0x41).toString('base64');
    expect(() => decodeImportFile(big)).toThrow(/too large/i);
  });
});

describe('parseAmount', () => {
  it('accepts finite non-negative numbers and strings, rounding to 2 decimals', () => {
    expect(parseAmount(1500.5)).toBe(1500.5);
    expect(parseAmount('2000')).toBe(2000);
    expect(parseAmount(0)).toBe(0);
    expect(parseAmount(1234.5678)).toBe(1234.57); // rounded to 2 decimals
    expect(parseAmount(MAX_AMOUNT)).toBe(MAX_AMOUNT);
  });

  it('rejects empty / non-numeric / non-finite values', () => {
    expect(parseAmount('')).toBeNull();
    expect(parseAmount(null)).toBeNull();
    expect(parseAmount(undefined)).toBeNull();
    expect(parseAmount('abc')).toBeNull();
    expect(parseAmount(NaN)).toBeNull();
    expect(parseAmount(Infinity)).toBeNull();
  });

  it('rejects negative and overflowing amounts', () => {
    expect(parseAmount(-1)).toBeNull();
    expect(parseAmount(MAX_AMOUNT + 1)).toBeNull();
    expect(parseAmount(1e15)).toBeNull();
  });
});

describe('isSaneEntryDate', () => {
  const now = new Date('2026-06-16T00:00:00.000Z');

  it('accepts valid past/current dates', () => {
    expect(isSaneEntryDate(new Date('2020-01-31'), now)).toBe(true);
    expect(isSaneEntryDate(new Date('2026-06-16T00:00:00.000Z'), now)).toBe(true);
  });

  it('rejects invalid, pre-2000, and future dates', () => {
    expect(isSaneEntryDate(new Date('not-a-date'), now)).toBe(false);
    expect(isSaneEntryDate(new Date('1999-12-31'), now)).toBe(false);
    expect(isSaneEntryDate(new Date('2027-01-01'), now)).toBe(false);
  });
});
