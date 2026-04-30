import { useTranslation } from 'react-i18next';
import { Layers, Check } from 'lucide-react';
import type { AccountPublic } from '@salvadash/shared';
import { brandColor } from '../lib/theme-vars';

interface AccountFilterBarProps {
  accounts: AccountPublic[];
  selected: string[];
  onChange: (next: string[]) => void;
}

/** Pure toggle helper — exported for unit testing without rendering. */
export function toggleAccountId(selected: string[], id: string): string[] {
  return selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id];
}

export function AccountFilterBar({ accounts, selected, onChange }: AccountFilterBarProps) {
  const { t } = useTranslation();
  const activeAccounts = accounts.filter((a) => a.isActive);
  const selectedSet = new Set(selected);
  const isAll = selected.length === 0;

  const toggle = (id: string) => onChange(toggleAccountId(selected, id));
  const clear = () => onChange([]);

  if (activeAccounts.length <= 1) return null;

  return (
    <div
      className="sticky z-20 -mx-4 px-4 pt-3 pb-2 bg-surface-base/85 backdrop-blur-md border-b border-border-default/40"
      style={{ top: 'var(--header-height)' }}
      role="region"
      aria-label={t('analytics.filter.label')}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-text-muted text-[10px] uppercase tracking-wider font-semibold">
          {t('analytics.filter.label')}
        </span>
        {!isAll && (
          <button
            type="button"
            onClick={clear}
            className="text-[11px] font-semibold text-brand hover:text-brand-strong transition-colors"
            aria-label={t('analytics.filter.clear')}
          >
            {t('analytics.filter.clear')} · {selected.length}
          </button>
        )}
      </div>

      <div
        className="flex gap-1.5 overflow-x-auto pb-1 scroll-smooth snap-x [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        role="listbox"
        aria-multiselectable="true"
      >
        <FilterChip
          label={t('analytics.filter.allAccounts')}
          icon={<Layers size={14} strokeWidth={2.2} />}
          active={isAll}
          color={null}
          onClick={clear}
          ariaSelected={isAll}
        />

        {activeAccounts.map((account) => {
          const active = selectedSet.has(account.id);
          return (
            <FilterChip
              key={account.id}
              label={account.name}
              materialIcon={account.icon}
              color={account.color}
              active={active}
              onClick={() => toggle(account.id)}
              ariaSelected={active}
            />
          );
        })}
      </div>
    </div>
  );
}

interface FilterChipProps {
  label: string;
  icon?: React.ReactNode;
  materialIcon?: string | null;
  color: string | null;
  active: boolean;
  onClick: () => void;
  ariaSelected: boolean;
}

function FilterChip({
  label,
  icon,
  materialIcon,
  color,
  active,
  onClick,
  ariaSelected,
}: FilterChipProps) {
  const accent = color ?? brandColor();
  return (
    <button
      type="button"
      onClick={onClick}
      role="option"
      aria-selected={ariaSelected}
      className="shrink-0 snap-start inline-flex items-center gap-1.5 min-h-11 h-11 px-3 rounded-full text-sm font-semibold border transition-all touch-manipulation active:scale-95"
      style={{
        backgroundColor: active ? `${accent}24` : 'transparent',
        borderColor: active ? accent : 'var(--color-border-default)',
        color: active ? accent : 'var(--color-text-muted)',
      }}
    >
      {icon}
      {!icon && materialIcon && (
        <span
          className="material-symbols-outlined"
          style={{ fontSize: 16, lineHeight: 1, color: active ? accent : 'var(--color-text-secondary)' }}
          aria-hidden="true"
        >
          {materialIcon}
        </span>
      )}
      {!icon && !materialIcon && color && (
        <span
          className="w-2 h-2 rounded-full"
          style={{ backgroundColor: accent }}
          aria-hidden="true"
        />
      )}
      <span className="truncate max-w-[10rem]">{label}</span>
      {active && <Check size={13} strokeWidth={2.5} />}
    </button>
  );
}
