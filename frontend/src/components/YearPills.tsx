interface YearPillsProps {
  years: string[];
  active: string | string[]; // single string when multi=false, array when multi=true
  onChange: (next: string | string[]) => void;
  multi?: boolean;
  ariaLabel?: string;
}

/** Pure helper — exported for unit testing without rendering. */
export function toggleYear(active: string[], year: string, multi: boolean): string[] {
  if (!multi) return [year];
  const set = new Set(active);
  if (set.has(year)) {
    if (set.size > 1) set.delete(year); // keep at least one when multi
  } else {
    set.add(year);
  }
  return [...set];
}

export function YearPills({ years, active, onChange, multi = false, ariaLabel }: YearPillsProps) {
  const set = new Set(Array.isArray(active) ? active : [active]);
  const handle = (year: string) => {
    if (!multi) {
      onChange(year);
      return;
    }
    onChange(toggleYear(Array.from(set), year, true));
  };
  return (
    <div
      role={multi ? 'group' : 'tablist'}
      aria-label={ariaLabel}
      className="flex gap-2 overflow-x-auto pb-1 no-scrollbar"
    >
      {years.map((y) => {
        const isActive = set.has(y);
        const isLast = multi && set.size === 1 && set.has(y);
        return (
          <button
            key={y}
            type="button"
            role={multi ? 'checkbox' : 'tab'}
            aria-checked={multi ? isActive : undefined}
            aria-selected={multi ? undefined : isActive}
            aria-disabled={isLast || undefined}
            onClick={() => !isLast && handle(y)}
            className={`shrink-0 px-4 min-h-11 inline-flex items-center rounded-full text-sm font-medium transition-all ${
              isActive
                ? 'bg-brand text-surface-base'
                : 'bg-surface-elevated text-text-secondary hover:text-text-primary'
            } ${isLast ? 'cursor-not-allowed opacity-60' : ''}`}
          >
            {y}
          </button>
        );
      })}
    </div>
  );
}
