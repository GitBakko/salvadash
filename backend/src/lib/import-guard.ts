// Guards for the `/data/import` endpoint: bound the size/shape of an uploaded
// workbook before it is parsed and persisted, and validate the numeric/date
// values pulled out of cells. These keep a hostile or malformed file from
// exhausting memory, overflowing the `Decimal(12,2)` money columns, or writing
// nonsense dates.

export class ImportError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ImportError';
  }
}

/** Max decoded file size (5 MB) — a personal savings workbook is a few KB. */
export const MAX_IMPORT_BYTES = 5 * 1024 * 1024;
/** Max worksheets processed per import. */
export const MAX_SHEETS = 50;
/** Max rows (labels) read per worksheet. */
export const MAX_ROWS = 2000;
/** Max columns (months) read per worksheet. */
export const MAX_COLS = 500;
/** Max monthly entries created in a single import (bounds the transaction). */
export const MAX_ENTRIES = 2000;
/** Decimal(12,2) holds |value| < 10^10; reject anything that would overflow. */
export const MAX_AMOUNT = 9_999_999_999.99;
/** Lower bound for a sane entry year. */
const MIN_YEAR = 2000;

/**
 * Validate and decode the base64 payload into a Buffer, enforcing the size cap
 * both before (cheap, on the encoded length) and after decoding.
 */
export function decodeImportFile(fileBase64: unknown): Buffer {
  if (typeof fileBase64 !== 'string' || fileBase64.length === 0) {
    throw new ImportError('Missing or invalid fileBase64 field');
  }
  // base64 inflates by ~4/3; reject obviously oversized payloads before we
  // allocate a Buffer for them.
  if (fileBase64.length > Math.ceil((MAX_IMPORT_BYTES * 4) / 3) + 8) {
    throw new ImportError('File too large');
  }
  const buf = Buffer.from(fileBase64, 'base64');
  if (buf.length === 0) {
    throw new ImportError('Empty or invalid file');
  }
  if (buf.length > MAX_IMPORT_BYTES) {
    throw new ImportError('File too large');
  }
  return buf;
}

/**
 * Coerce a raw cell value to a money amount, or `null` when it is not a usable
 * number. Rejects non-finite, negative, and out-of-range values; rounds to two
 * decimals to match `Decimal(12,2)`.
 */
export function parseAmount(raw: unknown): number | null {
  if (raw === null || raw === undefined || raw === '') return null;
  const n = typeof raw === 'number' ? raw : Number(raw);
  if (!Number.isFinite(n)) return null;
  if (n < 0 || n > MAX_AMOUNT) return null;
  return Math.round(n * 100) / 100;
}

/**
 * A parsed entry date is sane when it is a valid date, not absurdly old, and
 * not in the future (entries describe past/current months).
 */
export function isSaneEntryDate(d: Date, now: Date = new Date()): boolean {
  if (!(d instanceof Date) || isNaN(d.getTime())) return false;
  if (d.getUTCFullYear() < MIN_YEAR) return false;
  return d.getTime() <= now.getTime();
}
