// Money is stored as Decimal(12,2). Summing those amounts in JavaScript as binary
// floats drifts (0.1 + 0.2 !== 0.3, 0.1 + 0.7 !== 0.8), which shows up in totals,
// deltas and averages across dashboard/analytics/admin/export. To keep results
// exact we convert each amount to integer cents, do the arithmetic on integers,
// and convert back to a euro number only at the boundary.

export type DecimalLike = number | string | { toString(): string };

/** Round a money amount (euros, or a Decimal/string) to exact integer cents. */
export function toCents(value: DecimalLike): number {
  return Math.round(Number(value) * 100);
}

/** Convert integer cents back to a 2-decimal euro number. */
export function fromCents(cents: number): number {
  return cents / 100;
}

/** Exact sum of money amounts (euros or Decimal), returned in euros. */
export function sumMoney(values: DecimalLike[]): number {
  return fromCents(values.reduce<number>((acc, v) => acc + toCents(v), 0));
}
