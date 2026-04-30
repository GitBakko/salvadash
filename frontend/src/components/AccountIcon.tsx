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

interface Props {
  name: string | null;
  size?: number;
  className?: string;
  color?: string;
}

export function AccountIcon({ name, size = 16, className, color }: Props) {
  if (!name) return null;
  const Icon = ICON_MAP[name as AccountIconName];
  if (!Icon) return null;
  return (
    <Icon
      size={size}
      className={className}
      style={color ? { color } : undefined}
      aria-hidden="true"
    />
  );
}
