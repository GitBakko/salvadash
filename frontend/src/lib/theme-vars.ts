function read(name: string, fallback: string): string {
  if (typeof window === 'undefined') return fallback;
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v || fallback;
}

export function chartPalette(): string[] {
  return Array.from({ length: 8 }, (_, i) => read(`--color-chart-${i + 1}`, '#5b3df6'));
}

export function yearPalette(): string[] {
  return Array.from({ length: 6 }, (_, i) => read(`--color-year-${i + 1}`, '#5b3df6'));
}

export function brandColor(): string {
  return read('--color-brand', '#5b3df6');
}
