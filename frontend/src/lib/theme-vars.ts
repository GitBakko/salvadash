export function readVar(name: string, fallback: string): string {
  if (typeof window === 'undefined') return fallback;
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v || fallback;
}

export function chartPalette(): string[] {
  return Array.from({ length: 8 }, (_, i) => readVar(`--color-chart-${i + 1}`, '#8E78FF'));
}

export function yearPalette(): string[] {
  return Array.from({ length: 6 }, (_, i) => readVar(`--color-year-${i + 1}`, '#8E78FF'));
}

export function brandColor(): string {
  return readVar('--color-brand', '#8E78FF');
}
