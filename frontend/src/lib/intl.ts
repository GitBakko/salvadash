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
