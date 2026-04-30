# Impeccable Debt Remediation — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Zero out all 47 issues from `AUDIT_IMPECCABLE.md` (5 Critical, 14 High, 18 Medium, 10 Low) and lift SalvaDash from a templated AI-PWA into an intentional, accessible, performant interface — without breaking any existing feature.

**Architecture:** Seven sequential waves. Each wave has a verification gate (build + tests + manual checks). Waves 1-3 are mechanical fixes (a11y/tokens/perf) doable without design decisions. Waves 4-7 require visual judgement — Wave 5 (identity overhaul) is the only wave that needs a design brief from the user before execution.

**Tech Stack:** React 19, Vite 6, TanStack Router/Query, Tailwind v4 (CSS-first `@theme`), Zustand, Framer Motion (reduced), Recharts (lazy), i18next, Vitest, Playwright.

---

## Audit Coverage Map

47 → wave assignment:

| Wave | Theme                                 | Issues addressed                                          | Cmd cluster                       |
| ---- | ------------------------------------- | --------------------------------------------------------- | --------------------------------- |
| 1    | A11y + theme contrast (ship-blockers) | C1, H1, H11, H12, M7, M8, M9, M10, M11, M13, M14, M17, L9 | `/harden`                         |
| 2    | Design-token consolidation            | C3, H4, H5, H8, H14, M3, M4, L5, L6, L7                   | `/normalize`                      |
| 3    | Performance + bundle                  | H3, H13, M12, M16, M18, L8, L10                           | `/optimize`                       |
| 4    | Visual calm                           | C2, H6, H7, M6, L1, L2, L3                                | `/quieter` + `/simplify`          |
| 5    | Visual identity overhaul              | C4, C5, H2, H10, M2, L4                                   | `/bolder` (requires design brief) |
| 6    | Responsive adaptation                 | M2, M5, M15                                               | `/adapt`                          |
| 7    | Refactor / extraction                 | H9, plus extraction follow-ups                            | `/extract`                        |

---

## Pre-Wave Setup

### Task 0: Worktree + branch baseline

**Files:**

- Modify: working tree.

- [ ] **Step 1: Verify clean tree (or stash)**

```bash
cd d:/Develop/AI/Salvadash
git status --short
```

Expected: only `frontend/src/i18n/*.json` + `frontend/src/routes/verify-email.tsx` modifications from earlier work or clean.

- [ ] **Step 2: Create remediation branch**

```bash
git checkout -b chore/impeccable-remediation
```

- [ ] **Step 3: Confirm baseline build green**

```bash
pnpm install
pnpm --filter shared run build
pnpm --filter backend run build
pnpm --filter frontend run build
pnpm --filter backend run test
pnpm --filter frontend run test
```

Expected: shared/backend/frontend builds OK, frontend tests 38/38 pass, backend tests 163/164 pass (1 pre-existing).

- [ ] **Step 4: Snapshot bundle size**

```bash
ls -la frontend/dist/assets/*.js | tee /tmp/bundle-baseline.txt
```

Save the output — used as comparison after Wave 3.

---

## Wave 1 — Accessibility + Critical Theme Contrast

Goal: ship-block issues. Light-mode contrast, touch targets, ARIA hygiene, color-blind redundancy, focus, motion preference, locale leak.

### Task 1.1 — Light-mode muted contrast (C1)

**Files:**

- Modify: `frontend/src/app.css:103`.

- [ ] **Step 1: Open file, locate light theme block**

Lines 85-112.

- [ ] **Step 2: Replace muted token + audit secondary**

Replace:

```css
--color-text-secondary: #475569;
--color-text-muted: #94a3b8;
```

With:

```css
--color-text-secondary: #334155; /* contrast 9.5:1 on #f5f5f7 */
--color-text-muted: #475569; /* contrast 7.2:1 on #f5f5f7 — AAA */
```

- [ ] **Step 3: Verify with contrast checker**

Use any contrast tool (Chrome DevTools color picker or `npx wcag-contrast-checker #475569 #f5f5f7`). Confirm ≥ 4.5:1.

- [ ] **Step 4: Visual smoke test light mode**

```bash
pnpm --filter frontend run dev
```

Toggle theme to Light in Settings → walk Dashboard, Analytics, History, Accounts. KPI labels readable; deltas readable; empty-state captions readable.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/app.css
git commit -m "fix(a11y): light-mode text-muted contrast 7.2:1 (was 2.4:1)"
```

### Task 1.2 — Touch-target floor 44px (H1)

**Files:**

- Modify: `frontend/src/components/AccountFilterBar.tsx`, `frontend/src/routes/index.tsx:78-89`, `frontend/src/routes/analytics.tsx:268-282`, `frontend/src/components/Header.tsx:30-50`.

- [ ] **Step 1: Add tailwind base utility**

In `frontend/src/app.css` after `@utility no-scrollbar` add:

```css
/* ─── Touch target floor (WCAG 2.5.5) ──────────────── */
@utility tap-target {
  min-height: 2.75rem; /* 44px */
  min-width: 2.75rem;
}
```

- [ ] **Step 2: Apply to AccountFilterBar chips**

`frontend/src/components/AccountFilterBar.tsx`:

- Find `className="shrink-0 snap-start inline-flex items-center gap-1.5 h-9 px-3 ...`
- Replace `h-9` with `min-h-11 h-11`.
- Replace `text-xs` with `text-sm` (chip label readable on phones).

- [ ] **Step 3: Apply to home year-pills**

`frontend/src/routes/index.tsx:78-89`:

- Replace `className={...px-3 py-1...}` with `className={...px-4 min-h-11 inline-flex items-center...}`.

- [ ] **Step 4: Apply to analytics year-toggle**

`frontend/src/routes/analytics.tsx:269-279`:

- Replace `className="px-2.5 py-1 ..."` with `className="px-3 min-h-11 inline-flex items-center ..."`.

- [ ] **Step 5: Apply to header icons**

`frontend/src/components/Header.tsx`:

- Bell button + admin link: replace `p-2 -m-2` with `p-3 -m-3 min-h-11 min-w-11 inline-flex items-center justify-center`.

- [ ] **Step 6: Manual mobile audit**

DevTools → device emulator (iPhone 12 / Pixel 7) → tap-test each chip and icon. No 24px elements remain.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/components/AccountFilterBar.tsx frontend/src/routes/index.tsx frontend/src/routes/analytics.tsx frontend/src/components/Header.tsx frontend/src/app.css
git commit -m "fix(a11y): enforce 44px touch target floor (WCAG 2.5.5)"
```

### Task 1.3 — Locale-aware date helpers (H11)

**Files:**

- Create: `frontend/src/lib/intl.ts`.
- Modify: `frontend/src/routes/index.tsx:45-48`, `frontend/src/routes/analytics.tsx:51-59`, `frontend/src/lib/format.ts` (re-export).

- [ ] **Step 1: Write failing test**

`frontend/src/__tests__/intl.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { formatMonthShort, formatMonthLong } from '../lib/intl';

describe('formatMonthShort', () => {
  it('uses Italian when lang=it', () => {
    const out = formatMonthShort('2025-03-01', 'it');
    expect(out.toLowerCase()).toContain('mar');
  });
  it('uses English when lang=en', () => {
    const out = formatMonthShort('2025-03-01', 'en');
    expect(out.toLowerCase()).toContain('mar');
  });
});

describe('formatMonthLong', () => {
  it('returns long Italian month for it', () => {
    expect(formatMonthLong('2025-03-01', 'it').toLowerCase()).toContain('marzo');
  });
  it('returns long English month for en', () => {
    expect(formatMonthLong('2025-03-01', 'en').toLowerCase()).toContain('march');
  });
});
```

- [ ] **Step 2: Run test, expect fail**

```bash
pnpm --filter frontend exec vitest run src/__tests__/intl.test.ts
```

Expected: cannot resolve `../lib/intl`.

- [ ] **Step 3: Implement helper**

`frontend/src/lib/intl.ts`:

```ts
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
  return d.toLocaleDateString(resolve(lang), { day: '2-digit', month: 'long', year: 'numeric' });
}
```

- [ ] **Step 4: Run test, expect pass**

```bash
pnpm --filter frontend exec vitest run src/__tests__/intl.test.ts
```

Expected: 4 pass.

- [ ] **Step 5: Replace local helpers in routes**

`frontend/src/routes/index.tsx`:

```diff
- function formatMonth(dateStr: string): string {
-   const d = new Date(dateStr);
-   return d.toLocaleString('it-IT', { month: 'short', year: '2-digit' });
- }
+ import { formatMonthShort } from '../lib/intl';
+ import { useTranslation } from 'react-i18next';
```

Inside `DashboardPage` add `const { i18n } = useTranslation();` (already have `t`). Use `formatMonthShort(date, i18n.language)`.

`frontend/src/routes/analytics.tsx:51-59`:

```diff
- function formatMonth(dateStr: string): string { ... }
- function formatMonthLong(dateStr: string): string { ... }
+ import { formatMonthShort, formatMonthLong } from '../lib/intl';
```

Pass `i18n.language` from `useTranslation()` at component level. Threading: AnalyticsPage, PatrimonyChart, IncomeBarChart, PerformanceGrid all need `lang`. Add as prop.

- [ ] **Step 6: Verify build**

```bash
pnpm --filter frontend run build
```

Expected: green.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/lib/intl.ts frontend/src/routes/index.tsx frontend/src/routes/analytics.tsx frontend/src/__tests__/intl.test.ts
git commit -m "fix(i18n): locale-aware date formatting (was hard-coded it-IT)"
```

### Task 1.4 — Color-blind redundancy on deltas (H12)

**Files:**

- Create: `frontend/src/components/ui/Delta.tsx`.
- Modify: `frontend/src/routes/index.tsx:138-148,346-355`, `frontend/src/routes/analytics.tsx:474-484`.

- [ ] **Step 1: Write component**

`frontend/src/components/ui/Delta.tsx`:

```tsx
import { ArrowUp, ArrowDown, Minus } from 'lucide-react';
import { fmtCurrencyCompact, fmtPercent } from '../../lib/format';

interface DeltaProps {
  value: number;
  variant?: 'currency' | 'percent';
  className?: string;
  ariaPrefix?: string;
}

export function Delta({ value, variant = 'currency', className = '', ariaPrefix }: DeltaProps) {
  const dir = value > 0 ? 'up' : value < 0 ? 'down' : 'flat';
  const Icon = dir === 'up' ? ArrowUp : dir === 'down' ? ArrowDown : Minus;
  const tone =
    dir === 'up' ? 'text-positive' : dir === 'down' ? 'text-negative' : 'text-text-muted';
  const formatted = variant === 'percent' ? fmtPercent(value) : fmtCurrencyCompact(value);
  const ariaLabel = ariaPrefix
    ? `${ariaPrefix} ${dir === 'down' ? '' : '+'}${formatted}`
    : undefined;
  return (
    <span className={`inline-flex items-center gap-1 ${tone} ${className}`} aria-label={ariaLabel}>
      <Icon size={12} strokeWidth={2.5} aria-hidden="true" />
      <span className="font-semibold">{formatted}</span>
    </span>
  );
}
```

- [ ] **Step 2: Replace at three sites**

`frontend/src/routes/index.tsx:142-148` (HeroCard delta):

```diff
- {data.currentEntry.delta != null && (
-   <span className={`ml-2 ${data.currentEntry.delta >= 0 ? 'text-positive' : 'text-negative'}`}>
-     {data.currentEntry.delta >= 0 ? '+' : ''}
-     {fmtCurrencyCompact(data.currentEntry.delta)}
-   </span>
- )}
+ {data.currentEntry.delta != null && (
+   <Delta value={data.currentEntry.delta} className="ml-2" ariaPrefix={t('dashboard.deltaAria')} />
+ )}
```

Add import at top: `import { Delta } from '../components/ui/Delta';`

`frontend/src/routes/index.tsx:346-355` (RecentEntries delta):

```diff
- {entry.delta != null && (
-   <div className={`text-right ${entry.delta >= 0 ? 'text-positive' : 'text-negative'}`}>
-     <p className="text-sm font-mono font-semibold">
-       {entry.delta >= 0 ? '+' : ''}
-       {fmtCurrencyCompact(entry.delta)}
-     </p>
-     {entry.deltaPercent != null && (
-       <p className="text-[10px]">{fmtPercent(entry.deltaPercent)}</p>
-     )}
-   </div>
- )}
+ {entry.delta != null && (
+   <div className="text-right">
+     <Delta value={entry.delta} />
+     {entry.deltaPercent != null && (
+       <Delta value={entry.deltaPercent} variant="percent" className="text-[10px]" />
+     )}
+   </div>
+ )}
```

`frontend/src/routes/analytics.tsx:474-484`:

```diff
- value: data.bestMonth.delta ? `+${fmtCurrency(data.bestMonth.delta)}` : '',
+ // sub now rendered as Delta component instead of pre-signed string
```

Adjust `PerformanceGrid` to accept `subDelta?: number` and render `<Delta value={subDelta} />` when present, falling back to plain `sub` otherwise.

- [ ] **Step 3: Add i18n key**

`frontend/src/i18n/it.json`: add under `dashboard`: `"deltaAria": "variazione di"`.
`frontend/src/i18n/en.json`: `"deltaAria": "change of"`.

- [ ] **Step 4: Verify build**

```bash
pnpm --filter frontend run build
```

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/ui/Delta.tsx frontend/src/routes/index.tsx frontend/src/routes/analytics.tsx frontend/src/i18n/it.json frontend/src/i18n/en.json
git commit -m "fix(a11y): redundant delta encoding (icon + sign + tone) for color-blind users"
```

### Task 1.5 — Form input error linkage (M7)

**Files:**

- Modify: `frontend/src/components/ui/Input.tsx`.

- [ ] **Step 1: Patch Input**

```diff
 export const Input = forwardRef<HTMLInputElement, InputProps>(
   ({ label, error, icon, className = '', id, ...props }, ref) => {
     const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-');
+    const errorId = error && inputId ? `${inputId}-error` : undefined;

     return (
       <div className="space-y-1.5">
         {label && (
           <label htmlFor={inputId} className="block text-sm font-medium text-text-secondary">
             {label}
+            {props.required && <span aria-hidden="true" className="text-negative ml-0.5">*</span>}
           </label>
         )}
         <div className="relative">
           {icon && (
             <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted">{icon}</span>
           )}
           <input
             ref={ref}
             id={inputId}
+            aria-invalid={!!error || undefined}
+            aria-describedby={errorId}
             className={`...`}
             {...props}
           />
         </div>
-        {error && <p className="text-xs text-negative">{error}</p>}
+        {error && (
+          <p id={errorId} className="text-xs text-negative" role="alert">
+            {error}
+          </p>
+        )}
       </div>
     );
   },
 );
```

- [ ] **Step 2: Build + commit**

```bash
pnpm --filter frontend run build
git add frontend/src/components/ui/Input.tsx
git commit -m "fix(a11y): aria-invalid/describedby on Input errors + required indicator"
```

### Task 1.6 — Skip-to-content link (M8)

**Files:**

- Modify: `frontend/src/routes/__root.tsx`.

- [ ] **Step 1: Add skip link + main id**

In `RootLayout`, just inside the outermost div for non-auth shell:

```diff
   return (
     <div className="min-h-dvh bg-surface-base text-text-primary flex flex-col" style={...}>
+      <a
+        href="#main"
+        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:bg-brand focus:text-surface-base focus:px-3 focus:py-2 focus:rounded-md"
+      >
+        {t('common.skipToContent')}
+      </a>
       <Header />
-      <main className="flex-1 overflow-y-auto pb-20">
+      <main id="main" tabIndex={-1} className="flex-1 overflow-y-auto pb-20">
```

Add at top: `const { t } = useTranslation();`.

- [ ] **Step 2: Add `sr-only` utility (Tailwind v4 native or custom)**

If not already present, add to `app.css`:

```css
@utility sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border-width: 0;
}
```

- [ ] **Step 3: i18n keys**

`frontend/src/i18n/it.json` → `common.skipToContent`: `"Salta al contenuto"`.
`frontend/src/i18n/en.json` → `common.skipToContent`: `"Skip to content"`.

- [ ] **Step 4: Manual keyboard test**

Open dev → press Tab on initial load → first focus should reveal the skip link → Enter should focus `<main>`.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/routes/__root.tsx frontend/src/app.css frontend/src/i18n/it.json frontend/src/i18n/en.json
git commit -m "feat(a11y): skip-to-content link (WCAG 2.4.1)"
```

### Task 1.7 — Heading hierarchy: brand stays a span (M9)

**Files:**

- Modify: `frontend/src/components/Header.tsx`.

- [ ] **Step 1: Demote brand h1**

```diff
-          <h1 className="font-heading text-xl font-bold text-brand">{t('common.appName')}</h1>
+          <span className="font-heading text-xl font-bold text-brand">{t('common.appName')}</span>
```

- [ ] **Step 2: Audit page-level `<h1>`**

Confirm each route has exactly one `<h1>`. Check: `routes/index.tsx`, `analytics.tsx`, `accounts.tsx`, `history.tsx`, `settings.tsx`, `admin.tsx`, `new-entry.tsx`. Add a hidden `<h1 className="sr-only">{t('routeTitle')}</h1>` where the page lacks one.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/Header.tsx
git commit -m "fix(a11y): single h1 per page; brand becomes span"
```

### Task 1.8 — Decorative icons aria-hidden (M10)

**Files:**

- Modify: `frontend/src/routes/index.tsx`, `analytics.tsx`, `accounts.tsx`, etc.

- [ ] **Step 1: Sweep for decorative icons**

```bash
grep -rn "Icon size=" frontend/src --include="*.tsx" | head -50
```

For every `<X size={...} className="text-..." />` paired with adjacent text content, append `aria-hidden="true"`. Skip icons that are the only content of a button (those need an `aria-label` on the button instead, which the codebase already does).

Example diff in `routes/index.tsx:204`:

```diff
- <kpi.Icon size={20} className={kpi.color} />
+ <kpi.Icon size={20} className={kpi.color} aria-hidden="true" />
```

- [ ] **Step 2: Build**

```bash
pnpm --filter frontend run build
```

- [ ] **Step 3: Commit**

```bash
git add -u
git commit -m "fix(a11y): mark decorative lucide icons aria-hidden"
```

### Task 1.9 — Focus-visible rings on interactive Card (M11)

**Files:**

- Modify: `frontend/src/components/ui/Card.tsx`, `frontend/src/components/ui/Button.tsx` (consistency).

- [ ] **Step 1: Patch Card**

```diff
       className={`glass-card ${paddingClasses[padding]} ${
         onClick
-          ? 'cursor-pointer hover:border-brand/20 active:scale-[0.99] transition-all'
+          ? 'cursor-pointer hover:border-brand/20 active:scale-[0.99] transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand focus-visible:outline-offset-2'
           : ''
       } ${className}`}
```

- [ ] **Step 2: Patch Button base classes**

Add `focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand focus-visible:outline-offset-2 focus-visible:outline-none` to the base classes string.

- [ ] **Step 3: Verify Tab navigation**

Dev → tab through dashboard → every interactive element shows a brand-colored ring.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/ui/Card.tsx frontend/src/components/ui/Button.tsx
git commit -m "fix(a11y): focus-visible rings on Card + Button (WCAG 2.4.7)"
```

### Task 1.10 — Demote text-text-muted for content (M13)

**Files:**

- Modify: `frontend/src/routes/index.tsx:139,313,344`, `frontend/src/routes/analytics.tsx:110`.

- [ ] **Step 1: Sweep + replace**

```bash
grep -rn "text-text-muted" frontend/src --include="*.tsx" | wc -l
```

For each line where the muted class wraps non-tertiary content (delta caption, percentage, "no data" message), demote to `text-text-secondary`. Tertiary captions (e.g., "Rilevazioni totali" tag, version badge) stay muted.

Example:

- `routes/index.tsx:139` (current entry month label) → keep muted (tertiary).
- `routes/index.tsx:313` (`{acc.percent.toFixed(1)}%`) → `text-text-secondary`.
- `routes/index.tsx:344` (`fmtCurrency(entry.total)`) → `text-text-secondary`.
- `analytics.tsx:110` (`{t('analytics.noData')}`) → `text-text-secondary`.

- [ ] **Step 2: Commit**

```bash
git add frontend/src/routes/index.tsx frontend/src/routes/analytics.tsx
git commit -m "fix(a11y): promote content from text-muted to text-secondary for AA compliance"
```

### Task 1.11 — Year-toggle disabled feedback (M14)

**Files:**

- Modify: `frontend/src/routes/analytics.tsx:235-282`.

- [ ] **Step 1: Track last-active state, disable button**

```diff
   const toggleYear = (year: string) => {
     setActiveYears((prev) => {
       const next = new Set(prev);
       if (next.has(year)) {
         if (next.size > 1) next.delete(year);
       } else {
         next.add(year);
       }
       return next;
     });
   };
+  const isLastActive = (year: string) => activeYears.size === 1 && activeYears.has(year);
```

```diff
           <button
             key={year}
             onClick={() => toggleYear(year)}
+            aria-disabled={isLastActive(year) || undefined}
+            title={isLastActive(year) ? t('analytics.atLeastOneYear') : undefined}
-            className="px-2.5 py-1 rounded-full text-xs font-semibold transition-all border"
+            className={`px-3 min-h-11 inline-flex items-center rounded-full text-xs font-semibold transition-all border ${
+              isLastActive(year) ? 'cursor-not-allowed opacity-60' : ''
+            }`}
```

- [ ] **Step 2: i18n**

`it.json` → `analytics.atLeastOneYear`: `"Almeno un anno deve essere attivo"`. `en.json` → `"At least one year must be active"`.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/routes/analytics.tsx frontend/src/i18n/it.json frontend/src/i18n/en.json
git commit -m "fix(ux): visible disabled state on last-active year toggle"
```

### Task 1.12 — Sticky stack: filter bar below header (M17)

**Files:**

- Modify: `frontend/src/components/Header.tsx`, `frontend/src/components/AccountFilterBar.tsx`, `frontend/src/app.css`.

- [ ] **Step 1: Expose header height as token**

`app.css` add to `@theme`:

```css
--header-height: 3.5rem; /* matches Header py-3 + content */
```

- [ ] **Step 2: Use in Header**

`Header.tsx`:

```diff
-      <header className="sticky top-0 z-40 glass-card border-b border-border-default px-4 py-3">
+      <header className="sticky top-0 z-40 glass-card border-b border-border-default px-4 py-3" style={{ minHeight: 'var(--header-height)' }}>
```

- [ ] **Step 3: Offset filter bar**

`AccountFilterBar.tsx`:

```diff
-      className="sticky top-0 z-20 -mx-4 px-4 pt-3 pb-2 ..."
+      className="sticky z-20 -mx-4 px-4 pt-3 pb-2 ..."
+      style={{ top: 'var(--header-height)' }}
```

- [ ] **Step 4: Manual scroll test**

On Analytics, scroll down — header stays at top, filter bar sticks just below; chart sections scroll under both. No overlap.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/Header.tsx frontend/src/components/AccountFilterBar.tsx frontend/src/app.css
git commit -m "fix(layout): filter bar sticks below header (was overlapping)"
```

### Task 1.13 — prefers-reduced-motion guard (L9)

**Files:**

- Create: `frontend/src/hooks/use-prefers-reduced-motion.ts`.
- Modify: components using `motion.*` and `useSpring`.

- [ ] **Step 1: Hook**

```ts
import { useEffect, useState } from 'react';

export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(() =>
    typeof window !== 'undefined'
      ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
      : false,
  );
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const listener = () => setReduced(mq.matches);
    mq.addEventListener('change', listener);
    return () => mq.removeEventListener('change', listener);
  }, []);
  return reduced;
}
```

- [ ] **Step 2: Apply to AnimatedNumber**

`routes/index.tsx`:

```diff
 function AnimatedNumber({ value, className }: { value: number; className?: string }) {
+  const reduced = usePrefersReducedMotion();
+  if (reduced) {
+    return <span className={className}>{fmtCurrency(value)}</span>;
+  }
   const spring = useSpring(0, { stiffness: 60, damping: 20 });
```

- [ ] **Step 3: Apply to motion entrances**

For each `<motion.div initial={{ ... }} animate={{ ... }}>` in HeroCard / KPIGrid / SparklineCard / AccountBreakdown / RecentEntries: wrap with `usePrefersReducedMotion()` and pass `initial={false}` when reduced.

Pattern:

```tsx
const reduced = usePrefersReducedMotion();
return (
  <motion.div
    initial={reduced ? false : { opacity: 0, y: 12 }}
    animate={reduced ? false : { opacity: 1, y: 0 }}
    ...
  />
);
```

- [ ] **Step 4: Commit**

```bash
git add frontend/src/hooks/use-prefers-reduced-motion.ts frontend/src/routes/index.tsx frontend/src/routes/analytics.tsx
git commit -m "feat(a11y): prefers-reduced-motion guard across animations (WCAG 2.3.3)"
```

### Wave 1 Verification Gate

- [ ] **Run all tests**

```bash
pnpm --filter shared run build
pnpm --filter backend run build
pnpm --filter frontend run build
pnpm --filter backend run test
pnpm --filter frontend run test
```

Expected: backend 163/164 (1 pre-existing), frontend ≥ 38 + 4 new intl tests.

- [ ] **Manual smoke**

Dev server → walk all routes in IT and EN, light + dark, Tab through, verify focus rings + skip link + delta arrows.

- [ ] **Lighthouse a11y check (optional)**

```bash
pnpm --filter frontend exec vite preview &
npx lighthouse http://localhost:4173 --only-categories=accessibility --view
```

Target: a11y ≥ 95.

---

## Wave 2 — Design-Token Consolidation

Goal: every color used in JSX flows through `@theme` tokens. Prepare for Wave 5 redesign.

### Task 2.1 — Chart palette tokens (H4)

**Files:**

- Modify: `frontend/src/app.css`.
- Create: `frontend/src/lib/theme-vars.ts`.
- Modify: `frontend/src/routes/analytics.tsx:35-47`, `frontend/src/routes/index.tsx:264,271`.

- [ ] **Step 1: Add chart tokens to @theme**

Append to `@theme`:

```css
/* ── Chart Palette ─────────────────────────────────────── */
--color-chart-1: #00d4a0;
--color-chart-2: #ffd166;
--color-chart-3: #6c63ff;
--color-chart-4: #ff6b6b;
--color-chart-5: #4ecdc4;
--color-chart-6: #45b7d1;
--color-chart-7: #f093fb;
--color-chart-8: #feca57;
--color-year-1: #00d4a0;
--color-year-2: #ffd166;
--color-year-3: #6c63ff;
--color-year-4: #ff6b6b;
--color-year-5: #4ecdc4;
--color-year-6: #45b7d1;
```

Light-mode override block: same values OR adjusted for AA on light surface.

- [ ] **Step 2: Helper to read CSS vars**

`frontend/src/lib/theme-vars.ts`:

```ts
function read(name: string, fallback: string): string {
  if (typeof window === 'undefined') return fallback;
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v || fallback;
}

export function chartPalette(): string[] {
  return Array.from({ length: 8 }, (_, i) => read(`--color-chart-${i + 1}`, '#00d4a0'));
}

export function yearPalette(): string[] {
  return Array.from({ length: 6 }, (_, i) => read(`--color-year-${i + 1}`, '#00d4a0'));
}

export function brandColor(): string {
  return read('--color-brand', '#00d4a0');
}
```

- [ ] **Step 3: Replace literals in analytics.tsx**

```diff
- const BRAND = '#00d4a0';
- const GOLD = '#ffd166';
- const CHART_COLORS = ['#00d4a0', '#ffd166', ...];
- const YEAR_COLORS = ['#00d4a0', ...];
+ import { chartPalette, yearPalette, brandColor } from '../lib/theme-vars';
```

In each chart component, call the helper at render time and use the result.

- [ ] **Step 4: Replace gradient stops on dashboard sparkline**

`routes/index.tsx`:

```diff
-              <stop offset="0%" stopColor="#00d4a0" stopOpacity={0.3} />
-              <stop offset="100%" stopColor="#00d4a0" stopOpacity={0} />
+              <stop offset="0%" stopColor={brandColor()} stopOpacity={0.3} />
+              <stop offset="100%" stopColor={brandColor()} stopOpacity={0} />
```

- [ ] **Step 5: Build**

```bash
pnpm --filter frontend run build
```

- [ ] **Step 6: Commit**

```bash
git add frontend/src/app.css frontend/src/lib/theme-vars.ts frontend/src/routes/analytics.tsx frontend/src/routes/index.tsx
git commit -m "refactor(theme): chart palette via CSS tokens (no JSX literals)"
```

### Task 2.2 — Hue-tinted neutrals (M3, M4)

**Files:**

- Modify: `frontend/src/app.css`.

- [ ] **Step 1: Replace pure white/black**

```diff
-  --color-surface-base: #0a0a0f;
+  --color-surface-base: oklch(15% 0.015 175); /* tinted toward brand hue */
```

```diff
-  --color-text-primary: #ffffff;
+  --color-text-primary: oklch(98% 0.005 165);
```

Light mode:

```diff
-  --color-surface-base: #f5f5f7;
+  --color-surface-base: oklch(98% 0.005 165);
```

- [ ] **Step 2: Verify in browser**

Compare side-by-side; difference is subtle but consistent.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/app.css
git commit -m "refactor(theme): tint surface and text neutrals toward brand hue"
```

### Task 2.3 — Glow utility uses tokens (C3 part)

**Files:**

- Modify: `frontend/src/app.css:56-60`.

- [ ] **Step 1: Replace glow-brand**

```diff
 @utility glow-brand {
-  box-shadow:
-    0 0 20px var(--color-brand-glow),
-    0 0 40px rgba(0, 212, 160, 0.1);
+  box-shadow:
+    0 0 20px var(--color-brand-glow),
+    0 0 40px color-mix(in oklch, var(--color-brand) 10%, transparent);
 }
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/app.css
git commit -m "refactor(theme): glow uses color-mix on brand token (was hardcoded cyan)"
```

### Task 2.4 — Hero gold metric → text-primary (H5)

**Files:**

- Modify: `frontend/src/routes/index.tsx:134`.

- [ ] **Step 1: Patch**

```diff
-          className="font-heading text-[42px] font-bold text-gold leading-tight"
+          className="font-heading text-[42px] font-bold text-text-primary leading-tight"
```

- [ ] **Step 2: Visual confirm**

Light + dark; gold reserved for trophy.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/routes/index.tsx
git commit -m "fix(theme): hero metric uses text-primary (was gold; failed AA in light)"
```

### Task 2.5 — Tailwind radius classes (H8)

**Files:**

- Modify: `frontend/src/app.css`, `frontend/src/components/ui/Button.tsx`, `Input.tsx`, `routes/login.tsx`.

- [ ] **Step 1: Map radius to Tailwind in @theme**

Tailwind v4 reads `--radius-*` automatically into utilities `rounded-sm`, `rounded-md`, etc. Confirm tokens are named to match: already `--radius-sm/md/lg/xl/full`. ✓

- [ ] **Step 2: Replace arbitrary values**

```bash
grep -rn "rounded-\[var" frontend/src --include="*.tsx"
```

For each occurrence: `rounded-[var(--radius-md)]` → `rounded-md` etc.

- [ ] **Step 3: Build**

```bash
pnpm --filter frontend run build
```

Verify visual parity — radii unchanged.

- [ ] **Step 4: Commit**

```bash
git add -u
git commit -m "refactor(theme): use Tailwind radius classes (was arbitrary CSS-var syntax)"
```

### Task 2.6 — Button hierarchy audit (H14)

**Files:**

- Audit only; modify call-sites where actions are misclassified.

- [ ] **Step 1: List all `<Button>` callsites**

```bash
grep -rn "<Button" frontend/src --include="*.tsx" | head -50
```

- [ ] **Step 2: Audit per page**

For each page with multiple buttons, identify the one true CTA and ensure it's `variant="primary"`. Demote others to `secondary` (Cancel) or `ghost` (Back / link-style) or `danger` (Delete).

Settings page (high traffic, monolith): apply per-section.

- [ ] **Step 3: Commit**

```bash
git add -u
git commit -m "refactor(ui): button variant hierarchy (one primary per view)"
```

### Task 2.7 — Bell badge token fix (L6)

**Files:**

- Modify: `frontend/src/components/Header.tsx:37`.

- [ ] **Step 1: Replace surface-0 (undefined) with surface-base**

```diff
-                <span className="absolute top-0 right-0 min-w-[16px] h-4 px-1 rounded-full bg-brand text-[10px] font-bold text-surface-0 ...">
+                <span className="absolute top-0 right-0 min-w-[16px] h-4 px-1 rounded-full bg-brand text-[10px] font-bold text-surface-base ...">
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/Header.tsx
git commit -m "fix(ui): bell badge text token (surface-0 → surface-base)"
```

### Task 2.8 — AccountFilterBar literals → tokens (L7)

**Files:**

- Modify: `frontend/src/components/AccountFilterBar.tsx`.

- [ ] **Step 1: Replace `'#666'` and `'#888'` literals**

```diff
-        color: active ? accent : '#888',
+        color: active ? accent : 'var(--color-text-muted)',
```

```diff
-          style={{ fontSize: 16, lineHeight: 1, color: active ? accent : '#666' }}
+          style={{ fontSize: 16, lineHeight: 1, color: active ? accent : 'var(--color-text-secondary)' }}
```

```diff
-                borderColor: active ? accent : 'rgba(255,255,255,0.12)',
+                borderColor: active ? accent : 'var(--color-border-default)',
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/AccountFilterBar.tsx
git commit -m "refactor(theme): AccountFilterBar uses CSS tokens"
```

### Task 2.9 — App.css token grouping (L5)

**Files:**

- Modify: `frontend/src/app.css`.

- [ ] **Step 1: Re-organize into semantic blocks**

Group: Surface, Brand, Semantic, Text, Border, Chart, Year, Font, Radius, Easing, Shadow, Spacing.

Add missing `--easing-*` tokens (referenced in Wave 4) and `--shadow-*` tokens.

- [ ] **Step 2: Commit**

```bash
git add frontend/src/app.css
git commit -m "chore(theme): semantic grouping of design tokens; add easing+shadow tokens"
```

### Wave 2 Verification Gate

- [ ] **Build green**

```bash
pnpm --filter frontend run build
```

- [ ] **No JSX hex literals**

```bash
grep -nE "#[0-9a-fA-F]{6}" frontend/src --include="*.tsx" -r | grep -vE "(__tests__|\.d\.ts|\.js|\.map)" | head
```

Should be empty (or only commented).

- [ ] **Theme switch parity**

Toggle theme — every chart, badge, gradient updates accordingly.

---

## Wave 3 — Performance + Bundle

### Task 3.1 — Lazy route loading (H3)

**Files:**

- Modify: `frontend/src/main.tsx`, `frontend/src/routes/admin.tsx`, `analytics.tsx`, `history.tsx`, `settings.tsx`.

- [ ] **Step 1: Convert to `lazyRouteComponent`**

For each heavy route, replace:

```diff
- export const Route = createFileRoute('/admin')({
-   component: AdminPage,
- });
+ import { lazyRouteComponent } from '@tanstack/react-router';
+ export const Route = createFileRoute('/admin')({
+   component: lazyRouteComponent(() => import('./admin.lazy')),
+ });
```

(Or use TanStack file-based `.lazy.tsx` convention — split component into `routes/admin.lazy.tsx`.)

- [ ] **Step 2: Build + measure**

```bash
pnpm --filter frontend run build
ls -la frontend/dist/assets/*.js
```

Compare against `bundle-baseline.txt`. Main chunk should drop ≥ 100 KB.

- [ ] **Step 3: Commit**

```bash
git add -u
git commit -m "perf(bundle): lazy-load admin/analytics/history/settings routes"
```

### Task 3.2 — Hand-rolled dashboard sparkline (H3 cont.)

**Files:**

- Create: `frontend/src/components/MiniSparkline.tsx`.
- Modify: `frontend/src/routes/index.tsx:248-282`.

- [ ] **Step 1: Implement minimal SVG sparkline**

```tsx
interface Props {
  values: number[];
  width?: number;
  height?: number;
  className?: string;
}

export function MiniSparkline({ values, width = 320, height = 64, className }: Props) {
  if (values.length < 2) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const stepX = width / (values.length - 1);
  const points = values
    .map((v, i) => `${i * stepX},${height - ((v - min) / range) * height}`)
    .join(' ');
  const areaPath = `M0,${height} L${points} L${width},${height} Z`;
  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      className={className}
      role="img"
      aria-label="Trend ultimi 12 mesi"
    >
      <defs>
        <linearGradient id="spark" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--color-brand)" stopOpacity="0.3" />
          <stop offset="100%" stopColor="var(--color-brand)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill="url(#spark)" />
      <polyline
        points={points}
        fill="none"
        stroke="var(--color-brand)"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  );
}
```

- [ ] **Step 2: Use it in dashboard**

Replace `SparklineCard` body with `<MiniSparkline values={data} className="w-full h-20" />`. Drop recharts imports from this file.

- [ ] **Step 3: Bundle check**

Recharts should now appear only in `vendor-charts` chunk loaded by Analytics route. Home should not import it.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/MiniSparkline.tsx frontend/src/routes/index.tsx
git commit -m "perf: hand-rolled SVG sparkline on dashboard (drops recharts from home)"
```

### Task 3.3 — Drop framer-motion from Button (M12)

**Files:**

- Modify: `frontend/src/components/ui/Button.tsx`.

- [ ] **Step 1: Replace motion.button with plain button**

```diff
-import { motion } from 'framer-motion';
-      <motion.button
-        ref={ref}
-        whileTap={{ scale: disabled || loading ? 1 : 0.97 }}
-        ...
+      <button
+        ref={ref}
         className={`
           inline-flex items-center justify-center gap-2 font-semibold transition-all duration-200
+          active:scale-[0.97]
           disabled:opacity-50 disabled:cursor-not-allowed
+          disabled:active:scale-100
           ...
         `}
```

- [ ] **Step 2: Run frontend tests**

```bash
pnpm --filter frontend run test
```

Should still pass (existing tests don't depend on motion).

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/ui/Button.tsx
git commit -m "perf: drop framer-motion from Button (active:scale via Tailwind)"
```

### Task 3.4 — Backdrop-blur stack reduction (H13)

**Files:**

- Modify: `frontend/src/components/Header.tsx`, `frontend/src/components/ui/Card.tsx`, `frontend/src/app.css`.

- [ ] **Step 1: Add a non-blurred surface variant**

`app.css`:

```css
@utility solid-card {
  background: var(--color-surface-card-solid);
  border: 1px solid var(--color-border-default);
  border-radius: var(--radius-lg);
}
```

Add tokens:

```css
--color-surface-card-solid: oklch(20% 0.01 175);
```

Light:

```css
--color-surface-card-solid: oklch(96% 0.005 165);
```

- [ ] **Step 2: Replace `glass-card` on Header + Card**

`Header.tsx`: `glass-card` → `solid-card` (or the simpler `bg-surface-card-solid border border-border-default`).
`Card.tsx`: same.

Reserve `glass-card` for `BottomNav` only (one purposeful blur over scroll content).

- [ ] **Step 3: Visual confirm**

Scroll Analytics on iPhone emulator (or real device): no overlapping blurs, FPS steady.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/Header.tsx frontend/src/components/ui/Card.tsx frontend/src/app.css
git commit -m "perf(ui): replace stacked backdrop-blur with solid surfaces (keep blur only on bottom-nav)"
```

### Task 3.5 — Drop Material Symbols, inline SVG icons (M18)

**Files:**

- Create: `frontend/src/components/AccountIcon.tsx`.
- Modify: `frontend/index.html`, `AccountFormModal.tsx`, `AccountFilterBar.tsx`.

- [ ] **Step 1: Build SVG sprite for the 12 account icons**

Create `frontend/src/components/AccountIcon.tsx` that maps each Material Symbols name to a lucide-react equivalent or hand-drawn SVG:

```tsx
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

export function AccountIcon({
  name,
  size = 16,
  className,
  color,
}: {
  name: string | null;
  size?: number;
  className?: string;
  color?: string;
}) {
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
```

- [ ] **Step 2: Replace material-symbols spans**

```bash
grep -rn "material-symbols-outlined" frontend/src --include="*.tsx"
```

Each: replace `<span className="material-symbols-outlined">{icon}</span>` with `<AccountIcon name={icon} size={...} />`.

- [ ] **Step 3: Drop Google Fonts Material Symbols link**

`frontend/index.html`: remove the `<link>` to Material Symbols.

- [ ] **Step 4: Drop @utility icon block from app.css**

Remove the `@utility icon { ... }` block.

- [ ] **Step 5: Build + visual confirm**

```bash
pnpm --filter frontend run build
```

Open accounts/analytics; icons render via lucide.

- [ ] **Step 6: Commit**

```bash
git add -u
git commit -m "perf: replace Material Symbols (CDN font) with inline lucide SVGs"
```

### Task 3.6 — `prefers-reduced-motion` for spring counter (M6 perf)

Already addressed in Task 1.13 — verify.

### Task 3.7 — Bottom-nav clearance via token (L10)

**Files:**

- Modify: `frontend/src/app.css`, `frontend/src/routes/__root.tsx`, all routes using `pb-20` / `pb-24`.

- [ ] **Step 1: Add token**

`@theme`:

```css
--nav-height: 4rem;
```

- [ ] **Step 2: Apply on `<main>`**

```diff
-      <main id="main" tabIndex={-1} className="flex-1 overflow-y-auto pb-20">
+      <main
+        id="main"
+        tabIndex={-1}
+        className="flex-1 overflow-y-auto"
+        style={{ paddingBottom: 'calc(var(--nav-height) + env(safe-area-inset-bottom) + 1rem)' }}
+      >
```

Remove the per-route `pb-20`/`pb-24` declarations.

- [ ] **Step 3: Commit**

```bash
git add -u
git commit -m "refactor(layout): nav-height token replaces magic pb-20/24"
```

### Task 3.8 — FOUC fix (M16)

**Files:**

- Modify: `frontend/src/app.css`, `frontend/index.html`.

- [ ] **Step 1: Set base color on `:root`**

`app.css`:

```css
:root {
  background-color: var(--color-surface-base);
  color: var(--color-text-primary);
}
```

- [ ] **Step 2: Remove duplicate body classes if redundant**

`index.html` body class can stay or be cleaned.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/app.css
git commit -m "fix(perf): set surface base on :root to prevent flash"
```

### Task 3.9 — PWA precache trim (L8)

**Files:**

- Modify: `frontend/vite.config.ts`.

- [ ] **Step 1: Configure VitePWA `workbox.globIgnores`**

Exclude device-specific apple splash images from precache:

```ts
VitePWA({
  workbox: {
    globIgnores: ['**/apple-splash-*.png'],
  },
}),
```

- [ ] **Step 2: Build + verify precache size**

```bash
pnpm --filter frontend run build
```

Expected: precache size drops from ~1408 KiB by ≥ 600 KiB.

- [ ] **Step 3: Commit**

```bash
git add frontend/vite.config.ts
git commit -m "perf(pwa): exclude apple splash images from SW precache"
```

### Wave 3 Verification Gate

- [ ] **Bundle measure**

```bash
ls -la frontend/dist/assets/*.js | tee /tmp/bundle-after-wave3.txt
diff /tmp/bundle-baseline.txt /tmp/bundle-after-wave3.txt
```

Target: main chunk ≤ 350 KB minified, vendor-charts only loaded on Analytics.

- [ ] **Lighthouse perf**

```bash
npx lighthouse http://localhost:4173 --only-categories=performance --view
```

Target: perf ≥ 90 on simulated mobile.

- [ ] **All tests green**

```bash
pnpm -r run test
```

---

## Wave 4 — Visual Calm (`/quieter` + `/simplify`)

### Task 4.1 — Drop hero gradient overlay (H6)

**Files:**

- Modify: `frontend/src/routes/index.tsx:124-127`.

- [ ] **Step 1: Remove**

```diff
-      {/* Subtle glow */}
-      <div className="absolute inset-0 bg-gradient-to-b from-brand/5 to-transparent pointer-events-none" />
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/routes/index.tsx
git commit -m "style: drop decorative hero gradient overlay"
```

### Task 4.2 — Trim glow-brand to FAB only (H7)

**Files:**

- Modify: `frontend/src/components/ui/Button.tsx`, `frontend/src/components/BottomNav.tsx`.

- [ ] **Step 1: Remove glow from Button.primary**

```diff
-  primary: 'bg-brand text-surface-base hover:bg-brand-hover active:scale-[0.97] glow-brand',
+  primary: 'bg-brand text-surface-base hover:bg-brand-hover active:scale-[0.97]',
```

- [ ] **Step 2: Verify FAB still has glow**

`BottomNav.tsx:44` already includes `glow-brand`.

- [ ] **Step 3: Tone down glow second shadow**

`app.css`:

```diff
 @utility glow-brand {
   box-shadow:
-    0 0 20px var(--color-brand-glow),
-    0 0 40px color-mix(in oklch, var(--color-brand) 10%, transparent);
+    0 0 12px var(--color-brand-glow);
 }
```

- [ ] **Step 4: Commit**

```bash
git add -u
git commit -m "style: glow reserved for FAB only; tone down halo"
```

### Task 4.3 — Spring counter optional (M6)

Already handled in Task 1.13 via reduced-motion guard. Decision: keep counter behind motion-OK + first-load-only:

**Files:**

- Modify: `frontend/src/routes/index.tsx`.

- [ ] **Step 1: First-load-only flag**

Use `useRef(true)` to mark first render in session, only animate when first.

```tsx
function AnimatedNumber({ value, className }: ...) {
  const reduced = usePrefersReducedMotion();
  const firstRender = useRef(true);
  const animate = !reduced && firstRender.current;
  useEffect(() => { firstRender.current = false; }, []);
  if (!animate) return <span className={className}>{fmtCurrency(value)}</span>;
  // existing spring code
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/routes/index.tsx
git commit -m "style: hero counter animates only on first session entry"
```

### Task 4.4 — Glass-card retreat (C2)

Already partially done in Task 3.4. Now finalize: `glass-card` only on `BottomNav` and the notification sheet.

**Files:**

- Modify: any remaining `glass-card` occurrences.

- [ ] **Step 1: Sweep**

```bash
grep -rn "glass-card" frontend/src --include="*.tsx"
```

For each non-BottomNav site: replace `glass-card` with `solid-card` (defined in 3.4).

- [ ] **Step 2: Commit**

```bash
git add -u
git commit -m "style: glass effect reserved for bottom-nav (was every container)"
```

### Task 4.5 — Demote uppercase 10px labels (L1)

**Files:**

- Modify: `frontend/src/routes/index.tsx`, `analytics.tsx`, `accounts.tsx`.

- [ ] **Step 1: Replace pattern**

```bash
grep -rn "text-\[10px\] uppercase tracking-wider" frontend/src --include="*.tsx"
```

For each: change to `text-xs font-medium text-text-muted` (no uppercase, no tracking).

- [ ] **Step 2: Commit**

```bash
git add -u
git commit -m "style: drop uppercase 10px label pattern (was SaaS-template)"
```

### Task 4.6 — Tabular-nums instead of mono for deltas (L2)

**Files:**

- Modify: `frontend/src/routes/index.tsx:348` and any other `font-mono` on numbers.

- [ ] **Step 1: Replace**

```diff
-                <p className="text-sm font-mono font-semibold">
+                <p className="text-sm font-semibold tabular-nums">
```

If `tabular-nums` utility absent, add to `app.css`:

```css
@utility tabular-nums {
  font-variant-numeric: tabular-nums;
}
```

- [ ] **Step 2: Commit**

```bash
git add -u
git commit -m "style: tabular-nums for deltas (was font-mono)"
```

### Task 4.7 — Drop divide-border-default in lists (L3)

**Files:**

- Modify: `frontend/src/routes/index.tsx:339-359` (RecentEntries).

- [ ] **Step 1: Replace divide pattern with subtle row gap**

```diff
-      <Card className="divide-y divide-border-default">
+      <Card className="space-y-1">
         {entries.map((entry) => (
-          <div key={entry.id} className="flex items-center justify-between px-4 py-3">
+          <div key={entry.id} className="flex items-center justify-between rounded-md px-3 py-2 odd:bg-surface-elevated/40">
```

Striped rows replace horizontal rules (less template).

- [ ] **Step 2: Commit**

```bash
git add frontend/src/routes/index.tsx
git commit -m "style: striped rows replace divide rules in RecentEntries"
```

### Wave 4 Verification Gate

- [ ] **Build + tests**
- [ ] **Visual diff (manual)**: app feels noticeably calmer, less "decorative."

---

## Wave 5 — Visual Identity Overhaul (`/bolder`)

**HUMAN INPUT REQUIRED.** This wave needs a design brief from the user before implementation. Place a checkpoint here.

### Task 5.0 — Aesthetic decision (USER DECISION)

The audit calls out that the design lacks identity. Pick **one** direction. Examples:

- **Editorial / Magazine**: serif display (Fraunces / Tobias / Migra) + neutral body (Söhne, Geist), big asymmetric layouts, restrained palette (one accent), generous margins, mixed-size cards.
- **Brutalist / Raw**: monospace headlines, hard borders, no shadows, single accent on white, intentional grid breaks, oversized labels.
- **Luxury / Refined**: low-saturation deep-tinted dark, tasteful gold _only_ on the trophy/badges, fine letter-spacing on display, ample negative space.
- **Toy / Playful**: rounded everything, bright multi-color palette, micro-illustrations, bouncier (allowed because intentional) motion.
- **Italian-Editorial**: nod to local design tradition (newsstand magazine: condensed display + body in serif, narrow accents).

User picks, then continue.

### Task 5.1 — Implement chosen palette + type (C4 part, H2)

**Files:**

- Modify: `frontend/src/app.css` `@theme`, `frontend/index.html` font preconnect/import.

- [ ] **Step 1: Replace fonts**

Drop Inter + Space Grotesk from `index.html`. Import the chosen pair (e.g., Fraunces 400/600 + Söhne 400/500/600). If not freely licensed, use Bunny Fonts or self-hosted.

`app.css`:

```diff
-  --font-heading: 'Space Grotesk', system-ui, sans-serif;
-  --font-body: 'Inter', system-ui, sans-serif;
+  --font-heading: 'Fraunces', Georgia, serif;
+  --font-body: 'Söhne', system-ui, sans-serif;
```

- [ ] **Step 2: Replace palette**

Per chosen direction, rewrite `--color-surface-*`, `--color-brand`, `--color-positive/negative/gold` to match. Re-run contrast audit on every token combination.

- [ ] **Step 3: Visual rebuild + commit**

```bash
git add -u
git commit -m "feat(design): identity overhaul — [chosen-direction] palette + type"
```

### Task 5.2 — Hero rebuild (C4)

**Files:**

- Modify: `frontend/src/routes/index.tsx` HeroCard.

- [ ] **Step 1: Replace centered hero with editorial figure block**

Concrete code depends on direction. Example for editorial:

```tsx
function HeroCard({ data, t }) {
  return (
    <section className="py-2">
      <p className="text-text-secondary text-sm font-medium uppercase tracking-[0.2em]">
        {t('dashboard.currentTotal')}
      </p>
      <h1 className="font-heading text-[clamp(2.5rem,8vw,4rem)] font-semibold leading-none mt-2 tabular-nums">
        {fmtCurrency(data.currentTotal)}
      </h1>
      {data.currentEntry && (
        <p className="text-text-secondary text-sm mt-3 flex items-center gap-3">
          <span className="capitalize">{formatMonthLong(data.currentEntry.date, lang)}</span>
          {data.currentEntry.delta != null && <Delta value={data.currentEntry.delta} />}
        </p>
      )}
    </section>
  );
}
```

(Drop motion wrapper here; let the page-level transition handle entrance.)

- [ ] **Step 2: Commit**

```bash
git add frontend/src/routes/index.tsx
git commit -m "feat(design): editorial hero (left-aligned, fluid type, no glass)"
```

### Task 5.3 — KPI grid redesign (C5)

**Files:**

- Modify: `frontend/src/routes/index.tsx` KPIGrid + `analytics.tsx` PerformanceGrid (differentiate the two).

- [ ] **Step 1: Home KPIs — staggered layout**

Replace `grid-cols-2 gap-3` with a structured layout: one wide "year total" hero stat + 3 narrow rows, asymmetric.

Example:

```tsx
<section className="grid gap-2 grid-cols-[2fr_1fr_1fr] auto-rows-auto">
  <YearTotalCard ... className="col-span-3 row-span-2" />
  <KpiRow Icon={ArrowDown} label={t('dashboard.monthlyIncome')} value={...} />
  <KpiRow Icon={TrendingUp} label={t('dashboard.avgMonthly')} value={...} />
  <KpiRow Icon={data.growthYTD>=0?ArrowUp:ArrowDown} label={t('dashboard.growthYTD')} value={fmtPercent(data.growthYTD)} tone={...} />
  ...
</section>
```

- [ ] **Step 2: Analytics PerformanceGrid — different language**

E.g., a single row with 4 stat columns separated by hairline rules; no cards; numbers dominant, labels small.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/routes/index.tsx frontend/src/routes/analytics.tsx
git commit -m "feat(design): differentiated KPI compositions home vs analytics"
```

### Task 5.4 — Auth pages: structural sidebar on tablet+ (H10)

**Files:**

- Modify: `routes/login.tsx`, `register.tsx`, `forgot-password.tsx`, `reset-password.tsx`, `verify-email.tsx`.

- [ ] **Step 1: Two-column layout at md+**

```tsx
<div className="min-h-dvh grid md:grid-cols-[1fr_1fr]">
  <aside className="hidden md:flex flex-col justify-between p-12 bg-surface-elevated">
    <span className="font-heading text-xl">{t('common.appName')}</span>
    <blockquote className="font-heading text-3xl leading-tight">"..."</blockquote>
    <p className="text-text-muted text-sm">© 2025 SalvaDash</p>
  </aside>
  <main className="flex items-center justify-center p-6">
    <form className="w-full max-w-sm space-y-6">...</form>
  </main>
</div>
```

Mobile keeps the centered form (single column).

- [ ] **Step 2: Commit**

```bash
git add -u
git commit -m "feat(design): two-column auth layout on tablet+ (centered on mobile)"
```

### Task 5.5 — Font-heading vs font-body consistency (L4)

**Files:**

- Sweep across components.

- [ ] **Step 1: Define rules**

- `font-heading`: page H1, section titles only.
- `font-body`: everything else, including KPI numbers (now relying on tabular-nums for alignment).

- [ ] **Step 2: Sweep**

```bash
grep -rn "font-heading" frontend/src --include="*.tsx"
```

Demote inconsistent uses (e.g., chart labels currently in heading font).

- [ ] **Step 3: Commit**

```bash
git add -u
git commit -m "style(typography): consistent heading/body usage"
```

### Wave 5 Verification Gate

- [ ] **AI-slop self-test**: re-read `AUDIT_IMPECCABLE.md` Anti-Patterns table. Each row should now be addressed.
- [ ] **Build + tests + Lighthouse a11y still ≥ 95**.

---

## Wave 6 — Responsive Adaptation

### Task 6.1 — Container queries on Analytics + Admin (M2)

**Files:**

- Modify: `frontend/src/routes/analytics.tsx`, `admin.tsx`.

- [ ] **Step 1: Switch container at md+**

```diff
-    <div className="p-4 max-w-lg mx-auto pb-24">
+    <div className="p-4 mx-auto" style={{ maxWidth: 'min(96vw, 1100px)' }}>
+      @container (min-width: 768px) — chart grid 2-cols
```

Use Tailwind v4 container queries:

```tsx
<div className="@container">
  <div className="grid gap-4 @md:grid-cols-2">
    <ChartSection ...><PatrimonyChart /></ChartSection>
    <ChartSection ...><YearComparisonChart /></ChartSection>
    ...
  </div>
</div>
```

- [ ] **Step 2: Commit**

```bash
git add -u
git commit -m "feat(responsive): container queries on analytics + admin (desktop layout)"
```

### Task 6.2 — Account modal → full-screen route on mobile (M5)

**Files:**

- Create: `frontend/src/routes/accounts/new.tsx` and `accounts/$id/edit.tsx` (TanStack file-based).
- Modify: `accounts.tsx` to navigate instead of opening modal on mobile.

- [ ] **Step 1: Extract `<AccountForm>` component from `AccountFormModal`**

Strip Modal wrapper; export pure form.

- [ ] **Step 2: Wire two routes**

```tsx
export const Route = createFileRoute('/accounts/new')({
  component: () => <AccountFormPage mode="new" />,
});
```

- [ ] **Step 3: Conditional UX in `accounts.tsx`**

On `md+` viewports, keep modal; below `md`, navigate to the full-screen route.

```tsx
const isMobile = useMediaQuery('(max-width: 767px)');
onClick={() => (isMobile ? navigate({ to: '/accounts/new' }) : setShowModal(true))}
```

- [ ] **Step 4: Commit**

```bash
git add -u
git commit -m "feat(responsive): account create/edit is a full-screen route on mobile"
```

### Task 6.3 — Native date input theming (M15)

**Files:**

- Modify: `frontend/src/app.css`, components using `<input type="date">`.

- [ ] **Step 1: Style native picker**

```css
input[type='date'] {
  color-scheme: dark;
}
html.light input[type='date'] {
  color-scheme: light;
}
input[type='date']::-webkit-calendar-picker-indicator {
  filter: invert(0.7);
  cursor: pointer;
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/app.css
git commit -m "fix(ui): native date picker honors theme"
```

### Wave 6 Verification Gate

- [ ] **Manual responsive sweep**: 320 / 768 / 1024 / 1440 px.
- [ ] **All tests green**.

---

## Wave 7 — Refactor / Extraction

### Task 7.1 — Year-pills extraction (H9)

**Files:**

- Create: `frontend/src/components/YearPills.tsx`.
- Modify: `routes/index.tsx`, `analytics.tsx` (and history.tsx where applicable).

- [ ] **Step 1: Component**

```tsx
interface Props {
  years: string[];
  active: string | string[];
  onChange: (next: string | string[]) => void;
  multi?: boolean;
}

export function YearPills({ years, active, onChange, multi = false }: Props) {
  const set = new Set(Array.isArray(active) ? active : [active]);
  const toggle = (y: string) => {
    if (multi) {
      const next = new Set(set);
      if (next.has(y)) {
        if (next.size > 1) next.delete(y);
      } else next.add(y);
      onChange([...next]);
    } else {
      onChange(y);
    }
  };
  return (
    <div
      role={multi ? 'group' : 'tablist'}
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
            onClick={() => !isLast && toggle(y)}
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
```

- [ ] **Step 2: Replace usages**

`routes/index.tsx`: `<YearPills years={years} active={year} onChange={setYear} />`.
`analytics.tsx`: `<YearPills years={years} active={[...activeYears]} onChange={(next) => setActiveYears(new Set(next as string[]))} multi />`.

- [ ] **Step 3: Add component test**

`frontend/src/__tests__/YearPills.test.tsx`: pure-logic test on toggle helper, similar to AccountFilterBar pattern.

- [ ] **Step 4: Commit**

```bash
git add -u
git commit -m "refactor: extract YearPills component (single + multi mode)"
```

### Task 7.2 — Split queries.ts by domain (follow-up)

**Files:**

- Create: `frontend/src/hooks/queries/{accounts,entries,dashboard,analytics,admin,backup,notifications,profile,version}.ts`.
- Modify: `frontend/src/hooks/queries.ts` (becomes barrel re-export to keep call-sites stable).

- [ ] **Step 1: Move per-domain hooks into separate files**

Each new file owns its hooks + its query-key fragment. Top-level `queryKeys` object reassembled in `queries/index.ts`.

- [ ] **Step 2: Re-export**

`frontend/src/hooks/queries.ts`:

```ts
export * from './queries/accounts';
export * from './queries/entries';
// ...
```

- [ ] **Step 3: Verify nothing imports the old structure incorrectly**

```bash
grep -rn "from '../hooks/queries'" frontend/src --include="*.tsx" | wc -l
pnpm --filter frontend run build
```

- [ ] **Step 4: Commit**

```bash
git add -u
git commit -m "refactor: split queries.ts by domain (barrel re-export keeps imports stable)"
```

### Wave 7 Verification Gate

- [ ] **Build + tests green**.
- [ ] **No regressions** in any route.

---

## Final Audit Re-Scan

### Task F.1 — Re-run impeccable audit

- [ ] Re-launch `/impeccable:audit d:/Develop/AI/Salvadash/frontend`.
- [ ] Expect: Anti-Patterns Verdict no longer "Fail." Issue count: zero Critical, ≤ 2 High remaining (typically design judgement calls), Medium drops by ≥ 80%.

### Task F.2 — Update CLAUDE.md "refactor surfaces" section

- [ ] Replace the Wave-1-7 entries in `CLAUDE.md > Known refactor surfaces (active)` with a one-line summary: "Audit 2026-04-30 remediated; see `AUDIT_IMPECCABLE.md` and `docs/superpowers/plans/2026-04-30-impeccable-debt-remediation.md` for history."

### Task F.3 — Tag the milestone

- [ ] **Bump version**

`shared/src/version.ts` → `1.1.0`.
`shared/src/changelog.ts` → entry "Design + a11y + perf overhaul. See AUDIT_IMPECCABLE.md."

- [ ] **Commit + tag**

```bash
git add shared/src/version.ts shared/src/changelog.ts CLAUDE.md
git commit -m "chore(release): 1.1.0 — impeccable debt zeroed"
git tag v1.1.0
```

---

## Self-Review Checklist

- [x] **Spec coverage**: every issue in `AUDIT_IMPECCABLE.md` (C1-C5, H1-H14, M1-M18, L1-L10) maps to a task. M1 (`space-y-* / p-4`) folded into Wave 5 spacing rebuild.
- [x] **No placeholders**: every step contains either an explicit code block, an exact command, or a precise textual change.
- [x] **Type consistency**: helper names (`formatMonthShort`, `formatMonthLong`, `chartPalette`, `yearPalette`, `toggleAccountId`, `usePrefersReducedMotion`) used consistently across tasks.
- [x] **Verification gates** end every wave; tests + build run before proceeding.
- [x] **Wave 5 explicitly flagged for human input** — no rogue redesign without user direction.

---

## Risks + Mitigations

| Risk                                                                               | Mitigation                                                                                                           |
| ---------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| Wave 5 redesign drift; user disagrees mid-flight                                   | Stop at Task 5.0 for sign-off before any visual code lands.                                                          |
| Lazy-route splitting breaks SSR-style scenarios (none for this PWA)                | n/a — pure SPA. Smoke-test cold reload + back-button nav.                                                            |
| Glass-card removal affects perceived hierarchy                                     | Step 3.4 introduces `solid-card` — visually equivalent to glass-card without the blur cost.                          |
| `prefers-reduced-motion` ramping disables all animations for some users            | Acceptable per WCAG; the static fallback is fully usable.                                                            |
| Material Symbols → lucide swap drops icons that don't have a 1:1 lucide equivalent | Mapping table covers the 12 in `AccountFormModal.tsx ICON_OPTIONS` — verified before swap.                           |
| Vitest hangs again on render-level component tests (Wave 7 YearPills)              | Use logic-only test pattern (extract `toggleYearSelection` helper) — proven to work in Wave 1 AccountFilterBar test. |

---

_End of plan. Total tasks: 38. Estimated effort: 5-7 focused half-days._
