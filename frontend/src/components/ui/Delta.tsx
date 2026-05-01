import { ArrowUp, ArrowDown, Minus } from 'lucide-react';
import { fmtCurrencyCompact, fmtPercent } from '../../lib/format';

interface DeltaProps {
  value: number;
  variant?: 'currency' | 'percent';
  className?: string;
  ariaPrefix?: string;
}

export function Delta({ value, variant = 'currency', className = '', ariaPrefix }: DeltaProps) {
  const dir = value > 0 ? 'up' : value < 0 ? 'down' : 'flat';
  const Icon = dir === 'up' ? ArrowUp : dir === 'down' ? ArrowDown : Minus;
  const tone =
    dir === 'up' ? 'text-positive' : dir === 'down' ? 'text-negative' : 'text-text-muted';
  const formatted = variant === 'percent' ? fmtPercent(value) : fmtCurrencyCompact(value);
  const ariaLabel = ariaPrefix
    ? `${ariaPrefix} ${dir === 'down' ? '' : '+'}${formatted}`
    : undefined;
  return (
    <span className={`inline-flex items-center gap-1 ${tone} ${className}`} aria-label={ariaLabel}>
      <Icon size={12} strokeWidth={2.5} aria-hidden="true" />
      <span className="font-semibold">{formatted}</span>
    </span>
  );
}
