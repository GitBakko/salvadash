import { formatCurrency, formatDelta, type CurrencyCode, CURRENCIES } from '@salvadash/shared';
import { useAuthStore } from '../stores/auth-store';

function getUserCurrency(): CurrencyCode {
  const currency = useAuthStore.getState().user?.currency;
  return (currency && currency in CURRENCIES ? currency : 'EUR') as CurrencyCode;
}

export function fmtCurrency(n: number): string {
  return formatCurrency(n, getUserCurrency());
}

export function fmtCurrencyParts(n: number): { integer: string; cents: string } {
  const currency = getUserCurrency();
  const { locale } = CURRENCIES[currency];
  const parts = new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).formatToParts(n);
  const decimalIdx = parts.findIndex((p) => p.type === 'decimal');
  if (decimalIdx === -1) {
    return { integer: parts.map((p) => p.value).join(''), cents: '' };
  }
  return {
    integer: parts.slice(0, decimalIdx).map((p) => p.value).join(''),
    cents: parts.slice(decimalIdx).map((p) => p.value).join(''),
  };
}

export function fmtCurrencyCompact(n: number): string {
  const currency = getUserCurrency();
  const { locale } = CURRENCIES[currency];
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
    notation: 'compact',
  }).format(n);
}

export function fmtDelta(n: number): string {
  return formatDelta(n, getUserCurrency());
}

export function fmtPercent(n: number): string {
  const sign = n >= 0 ? '+' : '';
  return `${sign}${n.toFixed(1)}%`;
}
