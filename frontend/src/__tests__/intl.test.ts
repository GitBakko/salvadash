import { describe, it, expect } from 'vitest';
import { formatMonthShort, formatMonthLong, formatDateLong } from '../lib/intl';

describe('formatMonthShort', () => {
  it('uses Italian when lang=it', () => {
    const out = formatMonthShort('2025-03-01', 'it');
    expect(out.toLowerCase()).toContain('mar');
  });
  it('uses English when lang=en', () => {
    const out = formatMonthShort('2025-03-01', 'en');
    expect(out.toLowerCase()).toContain('mar');
  });
});

describe('formatMonthLong', () => {
  it('returns long Italian month for it', () => {
    expect(formatMonthLong('2025-03-01', 'it').toLowerCase()).toContain('marzo');
  });
  it('returns long English month for en', () => {
    expect(formatMonthLong('2025-03-01', 'en').toLowerCase()).toContain('march');
  });
});

describe('formatMonthShort fallback', () => {
  it('falls back to en-GB for unknown locale', () => {
    const out = formatMonthShort('2025-03-01', 'fr');
    expect(out.toLowerCase()).toContain('mar');
  });
});

describe('formatDateLong', () => {
  it('formats a long English date', () => {
    expect(formatDateLong('2025-03-15', 'en').toLowerCase()).toContain('march');
  });
  it('formats a long Italian date', () => {
    expect(formatDateLong('2025-03-15', 'it').toLowerCase()).toContain('marzo');
  });
});
