// CSV cell rendering hardened against spreadsheet formula injection (OWASP
// "CSV Injection" / CWE-1236) plus RFC-4180 quoting.
//
// When a spreadsheet app opens an exported CSV, a cell whose text starts with
// one of these characters is evaluated as a formula — e.g. a user-controlled
// account name of `=HYPERLINK("http://evil","click")` or `=cmd|...`. Prefixing
// such cells with a single quote forces them to be treated as literal text.
//
// Only string-typed cells are at risk; numbers are emitted verbatim so we never
// corrupt legitimate numeric values (a balance of `-50` must stay `-50`, not
// `'-50`). Our exported balances/incomes are non-negative anyway, but guarding
// on type keeps the helper correct for any caller.

const FORMULA_TRIGGERS = new Set(['=', '+', '-', '@', '\t', '\r']);

/**
 * Render an arbitrary value as a safe CSV cell:
 * 1. numbers pass through unchanged (finite) or become `0` (NaN/Infinity),
 * 2. string cells starting with a formula trigger are prefixed with `'`,
 * 3. the result is RFC-4180 quoted when it contains `,` `"` CR or LF.
 */
export function csvCell(value: unknown): string {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? String(value) : '0';
  }

  let str = value === null || value === undefined ? '' : String(value);

  if (str.length > 0 && FORMULA_TRIGGERS.has(str[0]!)) {
    str = `'${str}`;
  }

  if (/[",\n\r]/.test(str)) {
    str = `"${str.replace(/"/g, '""')}"`;
  }

  return str;
}
