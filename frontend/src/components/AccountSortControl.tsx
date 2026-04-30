import { ArrowUp, ArrowDown, GripVertical, ArrowDownAZ, ArrowDown01 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { LucideIcon } from 'lucide-react';

export type SortMode = 'name' | 'amount' | 'custom';
export type SortDir = 'asc' | 'desc';

interface AccountSortControlProps {
  mode: SortMode;
  dir: SortDir;
  onModeChange: (mode: SortMode) => void;
  onDirChange: (dir: SortDir) => void;
  /** Hide the 'custom' option in contexts where it doesn't apply (e.g., analytics). */
  showCustom?: boolean;
  className?: string;
}

/**
 * Compact pill-group + direction toggle for account-composition lists.
 * Direction toggle hides itself when mode === 'custom' (intrinsic order).
 */
export function AccountSortControl({
  mode,
  dir,
  onModeChange,
  onDirChange,
  showCustom = true,
  className = '',
}: AccountSortControlProps) {
  const { t } = useTranslation();
  const modes: { value: SortMode; label: string; Icon: LucideIcon }[] = [
    { value: 'name', label: t('sort.name'), Icon: ArrowDownAZ },
    { value: 'amount', label: t('sort.amount'), Icon: ArrowDown01 },
    ...(showCustom
      ? [{ value: 'custom' as const, label: t('sort.custom'), Icon: GripVertical }]
      : []),
  ];
  const DirIcon = dir === 'asc' ? ArrowUp : ArrowDown;

  return (
    <div className={`inline-flex items-center gap-1 ${className}`}>
      <div
        className="inline-flex rounded-full border border-border-default bg-surface-card-solid p-0.5"
        role="group"
        aria-label={t('sort.label')}
      >
        {modes.map((m) => (
          <button
            key={m.value}
            type="button"
            onClick={() => onModeChange(m.value)}
            className={`px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all ${
              mode === m.value
                ? 'bg-brand/20 text-brand'
                : 'text-text-muted hover:text-text-primary'
            }`}
            aria-pressed={mode === m.value}
            title={m.label}
          >
            {m.label}
          </button>
        ))}
      </div>
      {mode !== 'custom' && (
        <button
          type="button"
          onClick={() => onDirChange(dir === 'asc' ? 'desc' : 'asc')}
          className="p-1.5 rounded-full text-text-muted hover:text-text-primary hover:bg-surface-elevated transition-all"
          aria-label={dir === 'asc' ? t('sort.asc') : t('sort.desc')}
          title={dir === 'asc' ? t('sort.asc') : t('sort.desc')}
        >
          <DirIcon size={14} strokeWidth={2.5} />
        </button>
      )}
    </div>
  );
}

/**
 * Pure helper — exported for unit testing. Returns a NEW sorted array.
 *
 * - `mode='custom'`: sort by `orderIndex` ascending. When all items lack
 *   `orderIndex` (or share the same value), V8's stable sort preserves
 *   the input order — i.e., "as the caller / backend returned them".
 * - `mode='name'`: locale-aware case-insensitive name compare.
 * - `mode='amount'`: numeric compare on `amount` (defaults to 0 when missing).
 *
 * `dir` only applies when `mode !== 'custom'`. `'desc'` reverses the result.
 */
export function sortAccounts<T extends { name: string; amount?: number; orderIndex?: number }>(
  items: T[],
  mode: SortMode,
  dir: SortDir,
): T[] {
  if (mode === 'custom') {
    return items.slice().sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0));
  }
  const sorted = items.slice().sort((a, b) => {
    if (mode === 'name') {
      return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
    }
    return (a.amount ?? 0) - (b.amount ?? 0);
  });
  return dir === 'desc' ? sorted.reverse() : sorted;
}
