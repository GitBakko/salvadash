type Locale = 'it' | 'en';

const localeMap: Record<Locale, string> = {
  it: 'it-IT',
  en: 'en-GB',
};

function resolve(lang: string): string {
  return localeMap[lang as Locale] ?? 'en-GB';
}

export function formatMonthShort(dateStr: string, lang: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString(resolve(lang), { month: 'short', year: '2-digit' });
}

export function formatMonthLong(dateStr: string, lang: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString(resolve(lang), { month: 'long', year: 'numeric' });
}

export function formatDateLong(dateStr: string, lang: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString(resolve(lang), {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

/** Like formatDateLong but with non-padded day (e.g. "1 gennaio 2025"). */
export function formatDateLongDay(dateStr: string, lang: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString(resolve(lang), {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

/** Compact numeric date (e.g. "01/03/2025"). */
export function formatDateShort(dateStr: string, lang: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString(resolve(lang), {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

/** Medium date (e.g. "01 mar 2025"). */
export function formatDateMedium(dateStr: string, lang: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString(resolve(lang), {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

/** Medium date + time (e.g. "01 mar 2025, 14:23"). */
export function formatDateTimeMedium(dateStr: string, lang: string): string {
  const d = new Date(dateStr);
  return d.toLocaleString(resolve(lang), {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** Standalone short month name (e.g. "mar"). */
export function formatMonthName(dateStr: string, lang: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString(resolve(lang), { month: 'short' });
}
