import { create } from 'zustand';

type Theme = 'dark' | 'light' | 'system';
type Effective = 'dark' | 'light';

interface ThemeState {
  theme: Theme; // user preference
  effective: Effective; // actually applied theme
  setTheme: (theme: Theme) => void;
}

const STORAGE_KEY = 'salvadash-theme';

function getStoredTheme(): Theme {
  if (typeof window === 'undefined') return 'system';
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === 'dark' || stored === 'light' || stored === 'system') return stored;
  return 'system';
}

function resolveEffective(theme: Theme): Effective {
  if (theme === 'system') {
    if (typeof window === 'undefined') return 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return theme;
}

function applyTheme(effective: Effective) {
  const root = document.documentElement;
  if (effective === 'light') {
    root.classList.add('light');
  } else {
    root.classList.remove('light');
  }
  // Update meta theme-color for mobile browser chrome
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) {
    meta.setAttribute('content', effective === 'light' ? '#f5f5f7' : '#0a0a0f');
  }
}

let mediaUnsub: (() => void) | null = null;

function subscribeToSystem(set: (state: Partial<ThemeState>) => void) {
  if (typeof window === 'undefined') return;
  mediaUnsub?.();
  const mq = window.matchMedia('(prefers-color-scheme: dark)');
  const onChange = () => {
    // only react when current preference is 'system'
    if (localStorage.getItem(STORAGE_KEY) !== 'system') return;
    const eff: Effective = mq.matches ? 'dark' : 'light';
    applyTheme(eff);
    set({ effective: eff });
  };
  mq.addEventListener('change', onChange);
  mediaUnsub = () => mq.removeEventListener('change', onChange);
}

// Apply theme on load (before React renders)
const initialTheme = getStoredTheme();
const initialEffective = resolveEffective(initialTheme);
if (typeof window !== 'undefined') {
  applyTheme(initialEffective);
}

export const useThemeStore = create<ThemeState>((set) => {
  subscribeToSystem(set);
  return {
    theme: initialTheme,
    effective: initialEffective,
    setTheme: (theme) => {
      localStorage.setItem(STORAGE_KEY, theme);
      const eff = resolveEffective(theme);
      applyTheme(eff);
      set({ theme, effective: eff });
    },
  };
});
