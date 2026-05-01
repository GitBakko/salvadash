import { useState } from 'react';
import {
  Landmark,
  PiggyBank,
  CreditCard,
  Wallet,
  Bitcoin,
  TrendingUp,
  Banknote,
  WalletCards,
  CircleDollarSign,
  DollarSign,
  LineChart,
  PieChart,
} from 'lucide-react';

const ICON_MAP = {
  account_balance: Landmark,
  savings: PiggyBank,
  credit_card: CreditCard,
  wallet: Wallet,
  currency_bitcoin: Bitcoin,
  trending_up: TrendingUp,
  payments: Banknote,
  account_balance_wallet: WalletCards,
  monetization_on: CircleDollarSign,
  attach_money: DollarSign,
  show_chart: LineChart,
  pie_chart: PieChart,
} as const;

export type AccountIconName = keyof typeof ICON_MAP;

interface AccountIconProps {
  /** Image URL from API import (e.g. /uploads/account-icons/abc.webp). Highest priority. */
  iconUrl?: string | null;
  /** Lucide icon name (legacy material-symbol mapping). Used when iconUrl is null. */
  icon?: string | null;
  /** Display name — first character used in letter-avatar fallback. */
  name: string;
  /** Brand color of the account. Tints letter-avatar bg + lucide icon. */
  color?: string | null;
  /** Pixel size of the rendered icon (square). Default: 32. */
  size?: number;
  /** Tailwind className passthrough. */
  className?: string;
  /** Image alt text override; defaults to `name`. */
  alt?: string;
  /** Optional pass-through attributes (e.g. data-* for tests). */
  [key: `data-${string}`]: string | undefined;
}

export function AccountIcon({
  iconUrl,
  icon,
  name,
  color,
  size = 32,
  className = '',
  alt,
  ...rest
}: AccountIconProps) {
  const [imgFailed, setImgFailed] = useState(false);

  // Always tag rendered output for testability (Playwright queries this attr).
  const dataAttrs = { 'data-account-icon': 'true', ...rest };

  // Level 1: image URL from API (with onError fallback to next level)
  if (iconUrl && !imgFailed) {
    return (
      <img
        {...dataAttrs}
        src={iconUrl}
        alt={alt ?? name}
        width={size}
        height={size}
        loading="lazy"
        decoding="async"
        onError={() => setImgFailed(true)}
        className={`rounded-md object-contain bg-surface-elevated ${className}`}
        style={{ width: size, height: size }}
      />
    );
  }

  // Level 2: lucide icon
  const Icon = icon ? ICON_MAP[icon as AccountIconName] : null;
  if (Icon) {
    return (
      <span
        {...dataAttrs}
        className={`inline-flex items-center justify-center rounded-md ${className}`}
        style={{
          width: size,
          height: size,
          backgroundColor: color ? `${color}1f` : 'var(--color-surface-elevated)',
        }}
        aria-hidden="true"
      >
        <Icon
          size={Math.round(size * 0.6)}
          style={{ color: color ?? 'var(--color-text-secondary)' }}
          aria-hidden="true"
        />
      </span>
    );
  }

  // Level 3: letter avatar
  const letter = (name?.trim().charAt(0) || '?').toUpperCase();
  return (
    <span
      {...dataAttrs}
      className={`inline-flex items-center justify-center rounded-md font-semibold ${className}`}
      style={{
        width: size,
        height: size,
        backgroundColor: color ?? 'var(--color-surface-elevated)',
        color: color ? readableTextColor(color) : 'var(--color-text-primary)',
        fontSize: Math.round(size * 0.42),
      }}
      aria-hidden="true"
      title={name}
    >
      {letter}
    </span>
  );
}

/** Returns black or white depending on which has better contrast against bg. */
export function readableTextColor(hex: string): string {
  // Parse #RRGGBB or #RGB; fallback to white if parse fails
  let r = 0;
  let g = 0;
  let b = 0;
  const m = /^#?([a-fA-F0-9]{6}|[a-fA-F0-9]{3})$/.exec(hex.trim());
  if (!m) return '#ffffff';
  const v = m[1];
  if (v.length === 3) {
    r = parseInt(v[0] + v[0], 16);
    g = parseInt(v[1] + v[1], 16);
    b = parseInt(v[2] + v[2], 16);
  } else {
    r = parseInt(v.slice(0, 2), 16);
    g = parseInt(v.slice(2, 4), 16);
    b = parseInt(v.slice(4, 6), 16);
  }
  // Standard relative luminance approximation
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return lum > 0.55 ? '#0a0a0f' : '#ffffff';
}
