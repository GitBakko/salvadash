import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Search, SearchX, Trash2, X, Loader2 } from 'lucide-react';
import { useImportLogo, useSearchLogo, useDeleteAccountIcon } from '../hooks/queries';
import { useUIStore } from '../stores/ui-store';
import { AccountIcon } from './AccountIcon';
import { Skeleton } from './ui/Skeleton';

export interface SearchResult {
  brandId: string;
  name: string;
  domain: string;
  iconUrl: string;
  qualityScore: number;
  claimed: boolean;
}

interface AccountLogoPickerProps {
  accountId: string | null;
  initialName: string;
  iconUrl: string | null;
  onIconChange: (iconUrl: string | null, color: string | null) => void;
}

/**
 * Debounce a string value. Returns the value after `delay` ms of stillness.
 */
function useDebounced(value: string, delay: number): string {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}

export function AccountLogoPicker({
  accountId,
  initialName,
  iconUrl,
  onIconChange,
}: AccountLogoPickerProps) {
  const { t } = useTranslation();
  const addToast = useUIStore((s) => s.addToast);

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [importingUrl, setImportingUrl] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const debouncedQuery = useDebounced(query.trim(), 350);
  const search = useSearchLogo(debouncedQuery);
  const importLogo = useImportLogo();
  const deleteIcon = useDeleteAccountIcon();

  const disabled = accountId === null;

  // Open the panel — pre-fills query with the account name and focuses input.
  function handleOpen() {
    if (disabled) return;
    setQuery(initialName);
    setOpen(true);
    // Focus after the panel mounts
    requestAnimationFrame(() => inputRef.current?.focus());
  }

  function handleClose() {
    setOpen(false);
    setQuery('');
  }

  async function handlePick(result: SearchResult) {
    if (!accountId || importingUrl) return;
    setImportingUrl(result.iconUrl);
    try {
      const data = await importLogo.mutateAsync({
        accountId,
        iconUrl: result.iconUrl,
      });
      onIconChange(data.iconUrl, data.color);
      addToast({ type: 'success', message: t('accounts.logoAutoColor') });
      handleClose();
    } catch (err) {
      addToast({
        type: 'error',
        message: err instanceof Error ? err.message : t('accounts.logoImportError'),
      });
    } finally {
      setImportingUrl(null);
    }
  }

  async function handleClear() {
    if (!accountId) {
      onIconChange(null, null);
      return;
    }
    try {
      await deleteIcon.mutateAsync(accountId);
      onIconChange(null, null);
    } catch (err) {
      addToast({
        type: 'error',
        message: err instanceof Error ? err.message : t('accounts.logoImportError'),
      });
    }
  }

  // ── Disabled (creation flow): just render a hint card ──────────────────────
  if (disabled) {
    return (
      <section aria-labelledby="logo-section-label" className="space-y-2">
        <div className="flex items-baseline justify-between">
          <span id="logo-section-label" className="text-sm font-medium text-text-secondary">
            {t('accounts.logo')}
          </span>
        </div>
        <div className="rounded-2xl border border-dashed border-border-default bg-surface-elevated/30 p-4 text-xs text-text-muted">
          {t('accounts.logoAfterSave')}
        </div>
      </section>
    );
  }

  const hasIcon = !!iconUrl;
  const results = search.data ?? [];
  const showSkeletons = search.isFetching && results.length === 0 && debouncedQuery.length >= 2;
  const showEmpty =
    !search.isFetching && debouncedQuery.length >= 2 && results.length === 0 && !search.isError;

  return (
    <section aria-labelledby="logo-section-label" className="space-y-3">
      <div className="flex items-baseline justify-between">
        <span id="logo-section-label" className="text-sm font-medium text-text-secondary">
          {t('accounts.logo')}
        </span>
        {hasIcon && (
          <span className="text-[11px] text-text-muted">{t('accounts.logoNoteImage')}</span>
        )}
      </div>

      {/* Preview row: large icon + actions */}
      <div className="flex items-center gap-4">
        <div className="relative shrink-0">
          <div className="rounded-2xl border border-border-default bg-surface-elevated/40 p-2">
            <AccountIcon iconUrl={iconUrl} icon={null} name={initialName || '?'} size={80} />
          </div>
        </div>

        <div className="flex flex-1 flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleOpen}
            className="inline-flex items-center gap-2 rounded-full border border-brand/40 bg-brand/10 px-4 py-2 text-sm font-medium text-brand transition-colors hover:bg-brand/15 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-surface-base"
          >
            <Search size={16} aria-hidden="true" />
            {hasIcon ? t('accounts.logoChange') : t('accounts.logoSearch')}
          </button>
          {hasIcon && (
            <button
              type="button"
              onClick={handleClear}
              disabled={deleteIcon.isPending}
              aria-label={t('accounts.logoClear')}
              title={t('accounts.logoClear')}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border-default text-text-muted transition-colors hover:border-negative/40 hover:text-negative focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-negative/60 focus-visible:ring-offset-2 focus-visible:ring-offset-surface-base disabled:opacity-50"
            >
              {deleteIcon.isPending ? (
                <Loader2 size={16} className="animate-spin" aria-hidden="true" />
              ) : (
                <Trash2 size={16} aria-hidden="true" />
              )}
            </button>
          )}
        </div>
      </div>

      {/* Search panel — animates in via grid-rows trick */}
      <div
        className={`grid transition-[grid-template-rows] duration-300 ease-out ${
          open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
        }`}
      >
        <div className="overflow-hidden">
          <div className="rounded-2xl border border-border-default bg-surface-elevated/30 p-3 space-y-3">
            <div className="relative">
              <Search
                size={18}
                aria-hidden="true"
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-muted"
              />
              <input
                ref={inputRef}
                type="search"
                inputMode="search"
                autoComplete="off"
                spellCheck={false}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t('accounts.logoSearchPlaceholder')}
                aria-label={t('accounts.logoSearchPlaceholder')}
                className="block w-full rounded-xl border border-border-default bg-surface-card-solid pl-10 pr-10 py-3 text-base text-text-primary placeholder:text-text-muted focus:border-brand/60 focus:outline-none focus:ring-2 focus:ring-brand/30"
                style={{ minHeight: 48 }}
              />
              {query && (
                <button
                  type="button"
                  onClick={() => {
                    setQuery('');
                    inputRef.current?.focus();
                  }}
                  aria-label="Clear"
                  className="absolute right-2 top-1/2 -translate-y-1/2 inline-flex h-7 w-7 items-center justify-center rounded-full text-text-muted hover:bg-surface-elevated hover:text-text-primary"
                >
                  <X size={14} aria-hidden="true" />
                </button>
              )}
            </div>

            {/* Results / states */}
            {debouncedQuery.length < 2 ? (
              <div className="flex items-center gap-2 px-1 py-3 text-xs text-text-muted">
                <Search size={14} aria-hidden="true" className="opacity-60" />
                <span>{t('accounts.logoSearchPlaceholder')}</span>
              </div>
            ) : search.isError ? (
              <div className="flex items-center justify-between rounded-xl border border-negative/30 bg-negative/10 px-3 py-2.5 text-sm text-negative">
                <span>{t('accounts.logoSearchError')}</span>
                <button
                  type="button"
                  onClick={() => search.refetch()}
                  className="text-xs font-medium underline-offset-2 hover:underline"
                >
                  {t('common.retry') ?? 'Retry'}
                </button>
              </div>
            ) : showSkeletons ? (
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div
                    key={i}
                    className="rounded-2xl border border-border-default bg-surface-card-solid p-3 flex items-center gap-3"
                    style={{ minHeight: 80 }}
                  >
                    <Skeleton variant="rectangular" width={48} height={48} className="rounded-lg" />
                    <div className="flex-1 space-y-1.5 overflow-hidden">
                      <Skeleton width="80%" height={12} />
                      <Skeleton width="55%" height={10} />
                    </div>
                  </div>
                ))}
              </div>
            ) : showEmpty ? (
              <div className="flex flex-col items-center gap-2 px-4 py-8 text-center">
                <SearchX size={28} aria-hidden="true" className="text-text-muted" />
                <p className="text-sm text-text-secondary">{t('accounts.logoNoResults')}</p>
              </div>
            ) : (
              <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3" role="list">
                {results.slice(0, 5).map((r) => {
                  const isImporting = importingUrl === r.iconUrl;
                  const isDisabled = importingUrl !== null && !isImporting;
                  return (
                    <li key={r.brandId}>
                      <button
                        type="button"
                        onClick={() => handlePick(r)}
                        disabled={isDisabled || isImporting}
                        aria-label={`${r.name} — ${r.domain}`}
                        className={`group relative flex w-full items-center gap-3 rounded-2xl border bg-surface-card-solid p-3 text-left transition-[transform,border-color,background-color] duration-200 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-surface-base ${
                          isImporting
                            ? 'border-brand/60 bg-brand/5'
                            : 'border-border-default hover:border-brand/40 hover:bg-brand/5'
                        } ${isDisabled ? 'opacity-40' : ''}`}
                        style={{ minHeight: 80 }}
                      >
                        <span className="shrink-0">
                          <AccountIcon iconUrl={r.iconUrl} icon={null} name={r.name} size={48} />
                        </span>
                        <span className="flex min-w-0 flex-1 flex-col">
                          <span className="truncate text-sm font-semibold text-text-primary">
                            {r.name}
                          </span>
                          <span className="truncate text-xs text-text-muted">{r.domain}</span>
                        </span>
                        {isImporting && (
                          <span className="absolute inset-0 flex items-center justify-center rounded-2xl bg-surface-card-solid/80 backdrop-blur-[1px]">
                            <Loader2
                              size={20}
                              aria-hidden="true"
                              className="animate-spin text-brand"
                            />
                          </span>
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
