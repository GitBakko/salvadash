# SalvaDash — Impeccable Audit Report

_Generated: 2026-04-30 · Scope: `frontend/`_

---

## Anti-Patterns Verdict

**FAIL — looks AI-generated.**

If shown to a designer with the caption "AI made this," they would not pause. Every fingerprint from the 2024–25 AI-slop palette is present:

| Tell | Where | Severity |
|---|---|---|
| **Cyan-on-near-black** brand `#00d4a0` on `#0a0a0f` | `app.css` `@theme` | Critical |
| **Default dark mode with glowing accents** (`glow-brand` 20px+40px box-shadow) | `app.css`, `BottomNav` FAB, `Button` primary | Critical |
| **Glassmorphism everywhere** (`glass-card` utility: blur 20px + 60% surface) wrapped around every Card, Header, Nav, Modal, Auth form | `app.css`, `Card.tsx`, `Header.tsx`, `BottomNav.tsx`, `login.tsx` | Critical |
| **Hero-metric layout**: big number + small label + supporting stats (delta) + sparkline below, centered | `routes/index.tsx` `HeroCard` + `SparklineCard` | High |
| **Identical 2×2 KPI card grid** with `icon + uppercase tracking-wider label + value` repeated four times | `routes/index.tsx` `KPIGrid`, `analytics.tsx` `PerformanceGrid` | High |
| **Sparkline as decoration** ("Trend 12 mesi" mini chart, no axis, no scale) | `routes/index.tsx` `SparklineCard` | High |
| **Gold metric on dark** (`#ffd166`) for the headline number | `routes/index.tsx` line 134 | Medium |
| **Inter + Space Grotesk pair** (Inter is on the ban list; Space Grotesk is now templated) | `app.css` `--font-body`, `--font-heading` | Medium |
| **Pure white text** `#ffffff` + **near-pure black surface** `#0a0a0f` (no hue tint) | `app.css` | Medium |
| **Centered logo + tagline + glass form** auth screen | `routes/login.tsx`, `register.tsx`, `forgot-password.tsx` | Medium |
| **Gradient overlay used decoratively** on hero card (`from-brand/5 to-transparent`) | `routes/index.tsx:126` | Medium |
| **Bell + admin icon stacked top-right with badge** | `Header.tsx` | Low (templated but functional) |
| **Spring-animated counter** on hero number | `routes/index.tsx` `AnimatedNumber` | Low |
| **Centered everything** on auth pages, on dashboard hero, on empty states — no asymmetry | most routes | Medium |

**The one differentiation that would survive a redesign**: the multi-account chip filter (newly added) and the colour-coded account breakdown. Everything else is interchangeable with any other 2024 PWA finance starter.

---

## Executive Summary

**Issues found**: 47 (5 Critical, 14 High, 18 Medium, 10 Low).

**Top 5 critical/high findings (the ones that actually matter):**

1. **Aesthetic identity is interchangeable** — without a redesign of palette + type + layout language, no amount of polish will make this feel like SalvaDash vs any other AI-generated PWA. (Critical, design)
2. **Light theme contrast is broken** — `--color-text-muted: #94a3b8` on `--color-surface-base: #f5f5f7` ≈ **2.4 : 1**, well below WCAG AA 4.5 : 1 for body text. Visible on every label, every breakdown percent, every empty-state caption in light mode. (Critical, a11y)
3. **Touch targets below 44 × 44 px** in primary nav surfaces: year-selector pills (~24 px tall), notification bell hit area ~38 px, new `AccountFilterBar` chips at h-9 (36 px), small icon buttons in account list. iOS HIG + WCAG 2.5.5 violation. (High, a11y / mobile)
4. **Hard-coded colours bypass tokens** — `analytics.tsx` defines its own `BRAND`, `GOLD`, `CHART_COLORS[]`, `YEAR_COLORS[]` literals; `routes/index.tsx` hard-codes `#00d4a0` in the gradient stops; account breakdown uses `'#00d4a0'` fallback. Theme switch will break these. (High, theming)
5. **Bundle weight**: main chunk 532 KB minified / 150 KB gzip + vendor-charts 432 KB. Recharts is the single largest dependency and is loaded eagerly into the dashboard, analytics, and history pages. No code-splitting, no lazy-loaded routes. (High, performance)

**Quality score (0–10)**: **5.5**. Functionally correct, accessible at the API level, but visually templated, contrast-fragile in light mode, and not optimised for the platforms it targets (Mobile-first PWA).

**Recommended next steps**:
- Run `/normalize` to consolidate hard-coded hex into tokens.
- Run `/harden` for light-theme contrast + touch-target fixes.
- Run `/optimize` for code-splitting and chart lazy-load.
- For the design overhaul, see "Recommendations" section.

---

## Detailed Findings by Severity

### Critical Issues

#### C1. Light-theme body text contrast fails WCAG AA
- **Location**: `frontend/src/app.css:103` (`--color-text-muted: #94a3b8` in `html.light`).
- **Category**: Accessibility.
- **Standard**: WCAG 2.1 AA — 1.4.3 Contrast (minimum) 4.5 : 1 for normal text.
- **Description**: In light mode, `text-text-muted` on `--color-surface-base: #f5f5f7` measures ≈ 2.4 : 1.
- **Impact**: Users in light mode cannot reliably read KPI labels (`text-[10px] uppercase tracking-wider`), empty state captions, account percentages, breadcrumbs, version badge, every "Trend 12 mesi" caption.
- **Recommendation**: Lower lightness so the muted text on the light surface is at least 4.5 : 1: replace `#94a3b8` with `#475569` (≈ 7 : 1) or `#64748b` (≈ 5.7 : 1). Also re-audit `text-text-secondary` in light mode.
- **Fix command**: `/harden`.

#### C2. Glassmorphism applied to every container
- **Location**: `app.css:47` `@utility glass-card` used in `Card`, `Header`, `BottomNav`, every page card, all modals.
- **Category**: Anti-pattern (visual identity).
- **Description**: `backdrop-filter: blur(20px)` + `rgba(31,31,37,0.6)` + 1 px border applied to every surface. The technique is decorative, not purposeful.
- **Impact**: (a) site looks AI-generated (b) backdrop-filter is GPU-expensive and listed as a known scroll-jank source on Safari iOS for stacked sticky elements (Header + filter bar + chart sections); (c) 1-px border at low alpha (`rgba(148,163,184,0.12)`) is invisible against the dark surface — borders do nothing.
- **Recommendation**: Replace with two surface levels (solid tinted neutrals + flat 1-px tinted border) and reserve blur for one purposeful element (the bottom-nav over scroll content).
- **Fix command**: design-level rework — `/simplify` then `/normalize`.

#### C3. Hardcoded brand cyan + glow recurring across modules
- **Location**: `routes/index.tsx:264,271`, `analytics.tsx:35-46,229,233`, `routes/index.tsx:302,310`, `BottomNav.tsx:44`, `app.css:14-15,57-60`.
- **Category**: Theming + anti-pattern.
- **Description**: `#00d4a0` is repeated as a string in JSX, in CSS gradient stops, in chart Cell `fill`. The "AI palette" (cyan + neon glow on dark) is the dominant visual.
- **Impact**: Theme switch (light) does change `--color-brand` to `#00b386` but JSX/string literals stay at `#00d4a0`, so charts and gradients are off-palette in light mode. The glow utility (`box-shadow: 0 0 20px var(--color-brand-glow), 0 0 40px rgba(0, 212, 160, 0.1);`) hard-codes the rgba — the second shadow stays cyan even after the theme switch.
- **Recommendation**: Reference `var(--color-brand)` everywhere; remove the second cyan shadow in `glow-brand` or rebuild it from `color-mix(in oklch, var(--color-brand) 30%, transparent)`. Then reconsider whether glow is needed at all.
- **Fix command**: `/normalize`.

#### C4. AI hero-metric template
- **Location**: `routes/index.tsx:110-153` (`HeroCard`).
- **Category**: Anti-pattern (layout).
- **Description**: Centered card · gradient overlay · 42 px gold number · spring counter · small italic delta below. Reproduces verbatim the "hero metric" tell.
- **Impact**: Site reads as templated.
- **Recommendation**: Replace with editorial-style left-aligned figure block: a large month label set in heading font, monospaced number row with thousand-separator alignment, delta as a separate inline caption with arrow glyph (not coloured pill). Drop the gradient overlay.
- **Fix command**: `/bolder` or `/simplify` (intentional choice required).

#### C5. AI 2×2 KPI card grid duplicated on Home and Analytics
- **Location**: `routes/index.tsx:157-244` `KPIGrid`, `analytics.tsx:455-509` `PerformanceGrid`.
- **Category**: Anti-pattern (layout).
- **Description**: Identical structure: `grid-cols-2 gap-3` of cards each with `<Icon size=20 className=text-X />` + uppercase 10 px label + heading-font value.
- **Impact**: Two pages out of six look like the same screen; reinforces the templated read.
- **Recommendation**: Pick **one** location for the KPI quartet, redesign for visual rhythm (mix sizes — one wide hero + three narrow, or a 1-2-1 stagger), and use a different layout language on the other page (e.g., a single mini "performance bar" with sparkbars per KPI).
- **Fix command**: `/bolder` or design pass.

### High-Severity Issues

#### H1. Touch targets below 44 × 44 px
- **Locations**:
  - Year-selector pills `routes/index.tsx:78-89` — `px-3 py-1` ≈ 24 px tall.
  - Year-toggle pills `analytics.tsx:268-282` — `px-2.5 py-1` ≈ 22 px.
  - `AccountFilterBar` chips `components/AccountFilterBar.tsx` — `h-9` = 36 px (newly introduced).
  - Notification bell `Header.tsx:31-41` — `p-2 -m-2` around `size={22}` ≈ 38 px.
  - Admin shield icon `Header.tsx:44-50` — same pattern ≈ 38 px.
  - Toggle year chips inside `YearComparisonChart` — same.
- **Category**: Accessibility / Mobile.
- **Standard**: WCAG 2.5.5 (Target Size, AAA 44 px), Apple HIG (44 pt), Material (48 dp).
- **Impact**: Mistaps on phones, thumb-unfriendly. Particularly bad on year selectors which are the primary nav for the dashboard.
- **Recommendation**: Minimum `min-h-11 min-w-11` (44 px) on every chip / icon-button. Pad with negative margin if the visual chip should look smaller.
- **Fix command**: `/harden`.

#### H2. Inter + Space Grotesk type pair
- **Location**: `app.css:34-35`.
- **Category**: Anti-pattern (typography).
- **Description**: Inter is the most over-used UI font of 2024–25; Space Grotesk has become the templated "display" pick alongside it.
- **Impact**: Visual identity reads generic.
- **Recommendation**: Pick a distinctive body font (e.g., Söhne, Geist, Söhne Mono if going technical, IBM Plex Sans, Manrope, Sohne) and a real display contrast (Fraunces, Editorial New, Antonio, Tobias, Migra, Recoleta, GT Sectra). Lock to two weights each. Pair driven by the chosen aesthetic direction (editorial / luxury / brutalist — pick one, reject the others).
- **Fix command**: design pass; out of scope of `/normalize`.

#### H3. Bundle: 532 KB main + 432 KB charts not split
- **Location**: `vite.config.ts`, all routes importing `recharts`.
- **Category**: Performance.
- **Description**: Vite warns "Some chunks are larger than 500 kB after minification." Recharts loads on Home, Analytics, History eagerly; admin.tsx (1207 LOC) ships in main chunk.
- **Impact**: Cold install of the PWA on 4G is noticeably slow; `vendor-charts` adds ~115 KB gzip just for the dashboard sparkline.
- **Recommendation**:
  - Lazy-load `analytics`, `admin`, `settings`, `history` routes via `lazyRouteComponent`.
  - Replace the dashboard sparkline (one tiny path) with a hand-built SVG / inline `<polyline>` — drop recharts from the home critical path.
  - Move the spring counter behind `prefers-reduced-motion`.
- **Fix command**: `/optimize`.

#### H4. Hard-coded hex literals throughout charts
- **Location**: `analytics.tsx:35-47`, `routes/index.tsx:264,271,302,310`, `AnalyticsPage` `pieData` fallback `CHART_COLORS[i]`, `AccountFilterBar.tsx` accent fallback `'#00d4a0'`.
- **Category**: Theming.
- **Impact**: Light-mode users see palette mismatch; cannot rebrand without code search-replace; Recharts cannot adopt theme tokens at runtime.
- **Recommendation**: Define a `chartPalette` array in `app.css` via custom properties (`--chart-1` … `--chart-8`) and read them in JS via `getComputedStyle(document.documentElement).getPropertyValue('--chart-1')` once at mount, or use Recharts `Cell` with `fill="var(--chart-1)"` — Recharts supports CSS variables for stroke/fill.
- **Fix command**: `/normalize`.

#### H5. `text-gold` headline metric (`#ffd166`)
- **Location**: `routes/index.tsx:134`.
- **Category**: Anti-pattern + theming.
- **Description**: Gold on dark for the primary number is exactly the AI "hero metric" colour cue. In light mode `--color-gold` is unchanged → fails contrast (AA: gold on white ≈ 1.7 : 1).
- **Impact**: Low contrast in light mode + reinforces template look.
- **Recommendation**: Use `text-text-primary` for the number (semantic — it's the most important data) and reserve gold for the trophy icon only. Test both themes.
- **Fix command**: `/harden` + `/normalize`.

#### H6. Decorative gradient overlay on hero card
- **Location**: `routes/index.tsx:126`.
- **Description**: `<div className="absolute inset-0 bg-gradient-to-b from-brand/5 to-transparent" />`.
- **Impact**: Adds DOM weight + paint cost for a barely-visible 5 % opacity wash; classic decorative gradient anti-pattern.
- **Recommendation**: Remove. If background interest needed, use a subtle hue-tinted neutral surface token instead.
- **Fix command**: `/simplify`.

#### H7. `glow-brand` decoratively used on FAB and primary buttons
- **Location**: `app.css:56-60`, applied at `BottomNav.tsx:44`, `Button.tsx:18`.
- **Description**: `box-shadow: 0 0 20px var(--color-brand-glow), 0 0 40px rgba(0, 212, 160, 0.1)`.
- **Impact**: Visual noise on every primary CTA; overlapping shadows when buttons sit near the FAB.
- **Recommendation**: Drop from `Button.primary`. Keep on the FAB only (one focal point), and tone the second shadow down to `8px 16px rgba(...)`.
- **Fix command**: `/quieter`.

#### H8. `radius-[var(--radius-md)]` syntax in JSX
- **Location**: `Button.tsx:26-28`, `Input.tsx:29`, `login.tsx:58`.
- **Description**: Using arbitrary-value `rounded-[var(--radius-md)]` instead of Tailwind v4 `rounded-md` mapped to the token via `@theme`.
- **Impact**: Brittle, bypasses Tailwind's caching; if the token name changes (e.g., to `--radius-button`) the components break silently.
- **Recommendation**: Add `--radius-md` semantic alias in `@theme` and use `rounded-md` Tailwind class normally.
- **Fix command**: `/normalize`.

#### H9. Year selector duplicated in three places
- **Location**: `routes/index.tsx:76-90`, `analytics.tsx:264-283`, `history.tsx`.
- **Description**: Same horizontal scrolling year-pill pattern, copy-pasted thrice with subtle styling drift (different opacity, padding, animation).
- **Impact**: UX inconsistency + maintenance burden + duplicated component.
- **Recommendation**: Extract `<YearPills>` shared component. Settle on one styling spec.
- **Fix command**: `/extract`.

#### H10. Centered everything (anti-pattern)
- **Location**: every auth page (`login.tsx`, `register.tsx`, `forgot-password.tsx`, `reset-password.tsx`, `verify-email.tsx`), dashboard hero, all empty states.
- **Description**: `text-center` + `mx-auto` everywhere; no asymmetric layouts.
- **Impact**: "Centered template" look; no design point of view.
- **Recommendation**: Pick at least two pages where left-aligned editorial layout is appropriate (Home hero — drop the centering; auth — left-align with a structural sidebar / image rail on tablet+).
- **Fix command**: design pass / `/bolder`.

#### H11. Locale hard-coded in date formatting
- **Location**: `analytics.tsx:53,58`, `routes/index.tsx:47`, multiple `formatMonth` helpers.
- **Description**: `new Date(...).toLocaleDateString('it-IT', ...)` even though `i18next` is configured for IT/EN.
- **Impact**: English users see Italian month names ("gen 24", "feb 24") — i18n bug.
- **Recommendation**: Read `i18n.language` and pass it to `toLocaleDateString`. Or use `Intl.DateTimeFormat` with the user's `language` from auth-store.
- **Fix command**: `/harden` (i18n).

#### H12. Status colors only encoded by hue
- **Location**: `routes/index.tsx:143-148,346-355`, `analytics.tsx:474-484`.
- **Description**: Positive/negative deltas distinguished only by `text-positive` (green) / `text-negative` (red); no icon, no sign repetition for screen readers, and the colours are problematic for deuteranopia.
- **Standard**: WCAG 1.4.1 (Use of Color).
- **Impact**: Color-blind users cannot tell deltas apart.
- **Recommendation**: Add ↑/↓ glyph or `+`/`−` prefix consistently, and redundant aria-label like `aria-label="aumento di 200 €"`.
- **Fix command**: `/harden`.

#### H13. Backdrop blur on multiple stacked elements (sticky)
- **Location**: `Header.tsx:20` (sticky `glass-card`), `AccountFilterBar.tsx` (sticky `backdrop-blur-md`), `Card.tsx` `glass-card`.
- **Description**: Header, filter bar, and chart cards all use backdrop-filter. When the user scrolls Analytics, three blur layers composite per frame.
- **Category**: Performance.
- **Impact**: jank on iOS Safari; tested anecdotally — the FPS drops on lower-tier devices when scrolling Analytics with stacked sticky blurs.
- **Recommendation**: Reserve blur for the bottom-nav (one element). Header + filter use solid tinted surfaces.
- **Fix command**: `/optimize` + `/simplify`.

#### H14. Single primary-button style; no hierarchy
- **Location**: every CTA across the app uses `<Button>` default `primary` (cyan + glow). Secondary/ghost variants exist but are rarely used (login uses primary; new-entry uses primary; settings uses primary).
- **Description**: "Make every button primary" anti-pattern.
- **Impact**: No visual call-to-action hierarchy on screens with multiple actions (e.g., Settings has Save / Cancel / Delete chained — all read equally important).
- **Recommendation**: Audit `<Button>` callsites; default destructive to `danger`, defaults like Cancel to `ghost`, secondary actions to `secondary`. Reserve `primary` for one CTA per view.
- **Fix command**: `/normalize`.

### Medium-Severity Issues

#### M1. `space-y-*` and `p-4` everywhere — no spacing rhythm
- **Location**: every route component.
- **Description**: Default `p-4` page padding + `space-y-4` between sections. No clamp(), no fluid spacing.
- **Impact**: Layouts feel monotonous; on tablet+ the content hugs `max-w-lg` (32 rem) without breathing.
- **Recommendation**: Introduce two spacing tokens (`--gap-section`, `--gap-tight`) using `clamp()`; `clamp(1rem, 2vw + 0.5rem, 2.5rem)`.
- **Fix command**: `/normalize`.

#### M2. `max-w-lg mx-auto` pinned across all pages
- **Location**: Home, Accounts, History, Analytics, Settings, NewEntry.
- **Description**: 512 px content column on every breakpoint. On a desktop browser the app looks like a phone frame in the middle of a dark void.
- **Recommendation**: Container queries for the pages that contain charts (Analytics, Admin) — let them widen to `min(96vw, 1100px)` past 768 px and adopt a side-by-side chart layout.
- **Fix command**: `/adapt`.

#### M3. Pure `#ffffff` text on dark
- **Location**: `app.css:25` `--color-text-primary: #ffffff`.
- **Impact**: Eye fatigue at night; flat against the cyan accent. Doesn't match the brand-tinted neutrals advice.
- **Recommendation**: Tint toward brand: e.g., `oklch(98% 0.005 165)` or `#f5fdfa`.
- **Fix command**: `/normalize`.

#### M4. Pure `#0a0a0f` background
- **Location**: `app.css:6`.
- **Impact**: Near-black with a slight cool tint that reads as "default ChatGPT dark mode."
- **Recommendation**: Pick a meaningful tint — warmer (`oklch(15% 0.02 60)` for editorial) or deeper plum / forest. Whatever the aesthetic direction is.
- **Fix command**: `/normalize`.

#### M5. Modals used for routine flows
- **Location**: `AccountFormModal.tsx`, `WhatsNewModal.tsx`, `NotificationCenter` (sheet).
- **Description**: Edit/Create account is a modal with form fields. Editing 4 fields in a modal on mobile fights the keyboard.
- **Recommendation**: Use full-screen routes for create/edit on mobile (the existing `/new-entry` pattern is already correct — reuse it for accounts).
- **Fix command**: `/adapt`.

#### M6. Spring counter animation on every dashboard load
- **Location**: `routes/index.tsx:20-41`.
- **Description**: `useSpring(0, { stiffness: 60, damping: 20 })` animates from 0 to total on every route entry.
- **Impact**: Feels like a casino slot-machine on a personal-finance app; ignores `prefers-reduced-motion`.
- **Recommendation**: Animate only on first render in a session, respect `prefers-reduced-motion`. Or drop entirely — show the number directly.
- **Fix command**: `/quieter` + `/harden`.

#### M7. Form errors not associated to inputs
- **Location**: `Input.tsx:42` — `<p className="text-xs text-negative">{error}</p>` not linked to input via `aria-describedby` or `aria-errormessage`.
- **Standard**: WCAG 3.3.1 (Error Identification), 3.3.3 (Error Suggestion).
- **Recommendation**: Generate `inputId-error` id, set `aria-describedby={error ? id-error : undefined}`, `aria-invalid={!!error}`.
- **Fix command**: `/harden`.

#### M8. No skip-to-content link
- **Location**: `routes/__root.tsx`.
- **Standard**: WCAG 2.4.1 Bypass Blocks.
- **Impact**: Keyboard users tab through Header (logo, version badge, bell, admin) on every page before reaching `<main>`.
- **Recommendation**: Add `<a href="#main" className="sr-only focus:not-sr-only ...">Skip to content</a>` and `<main id="main">`.
- **Fix command**: `/harden`.

#### M9. Heading hierarchy skips levels
- **Location**: `Header.tsx` uses `<h1>` for the brand on every page; pages use `<h1>` for their own title (`routes/accounts.tsx`, `analytics.tsx:118`). Two `<h1>` per page.
- **Standard**: WCAG 1.3.1.
- **Recommendation**: Brand stays a `<span>` (visually styled as heading); each page owns the single `<h1>`.
- **Fix command**: `/harden`.

#### M10. Decorative icons not hidden from AT
- **Location**: most `<*Icon size=… />` lucide instances inside cards/pills.
- **Description**: lucide-react icons render as SVG with no `aria-hidden`. They are read by screen readers as "image".
- **Recommendation**: When the icon is decorative (paired with text), wrap with `<span aria-hidden="true">` or pass `aria-hidden` directly. Lucide forwards SVG attrs.
- **Fix command**: `/harden`.

#### M11. `Card` with `onClick` uses `role="button"` but no focus ring
- **Location**: `Card.tsx:18-30`.
- **Description**: Sets `tabIndex={0}` and `role="button"` but no `:focus-visible` outline (default browser outline is suppressed via Tailwind preflight).
- **Standard**: WCAG 2.4.7 Focus Visible.
- **Recommendation**: Add `focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand focus-visible:outline-offset-2`.
- **Fix command**: `/harden`.

#### M12. `motion.button` Buttons + framer-motion `whileTap` for every click
- **Location**: `Button.tsx:46-48`, `AccountFormModal.tsx`, others.
- **Description**: Every button instantiates a framer-motion node just for `whileTap: scale 0.97`.
- **Impact**: ~20–30 KB of framer-motion runtime on critical path; testing pain (we hit this earlier — vitest hangs); the same effect can be done with `active:scale-95` Tailwind class.
- **Recommendation**: Use plain `<button>` + `active:scale-[0.97] transition-transform`. Reserve framer-motion for orchestrated entrances and the bottom-nav indicator's `layoutId`.
- **Fix command**: `/optimize`.

#### M13. `text-text-muted` used for visible body content (not just labels)
- **Location**: `routes/index.tsx:139,313,344`, `analytics.tsx:110`.
- **Description**: Muted gray (`#64748b` dark / `#94a3b8` light) used for delta percent, breakdown caption, "no data" text. These are content, not adornment.
- **Impact**: Borderline AA in dark mode (≈ 4.6 : 1), fail in light mode.
- **Recommendation**: Demote to `text-text-secondary` for content, reserve `text-text-muted` strictly for non-essential tertiary captions.
- **Fix command**: `/harden`.

#### M14. Year-toggle keeps "at least 1" rule with no feedback
- **Location**: `analytics.tsx:236-244`.
- **Description**: `if (next.size > 1) next.delete(year)` silently ignores the click when only one year remains active.
- **Impact**: User clicks → nothing happens → confusion.
- **Recommendation**: Visually disable the last-active chip (`opacity-60 cursor-not-allowed`) with a `title` / `aria-disabled`.
- **Fix command**: `/harden`.

#### M15. `<input type="date">` styling not normalised
- **Location**: `new-entry.tsx`, settings.
- **Impact**: native iOS date picker looks completely different from the rest of the app, and the date input on dark mode shows a white background on Chrome desktop.
- **Recommendation**: Either embrace native (drop the surrounding glass-card styling for that input) or use a portable component.
- **Fix command**: `/normalize`.

#### M16. Body uses `bg-surface-base text-text-primary antialiased` from index.html
- **Location**: `index.html:39`.
- **Description**: Setting Tailwind classes on `<body>` works but the colour is rendered before the React tree mounts. On first paint the user sees `bg-surface-base` solid (not blurred), then the glass cards overlay — small flash.
- **Recommendation**: Set `background-color` on `:root` via the `@theme` token to avoid FOUC.
- **Fix command**: `/optimize`.

#### M17. New `AccountFilterBar` is sticky inside a sticky-Header context
- **Location**: `AccountFilterBar.tsx:30`.
- **Description**: Header is `sticky top-0`, filter bar is `sticky top-0`. The filter bar sticks to viewport top, overlapping the header.
- **Impact**: Header gets visually covered when scrolling Analytics.
- **Recommendation**: Filter bar should stick to `top-[var(--header-height)]`, where header height is exposed as a CSS var, OR live above the header within the same sticky stack.
- **Fix command**: `/harden`.

#### M18. Material Symbols loaded from CDN as part of critical CSS
- **Location**: `index.html:42-44`.
- **Description**: Two Google Fonts requests blocking, including the Material Symbols variable file. Material Symbols are used **only** for the user-customised account icons (12 options) → ship 12 SVGs instead.
- **Impact**: ~150 KB blocking font on cold start.
- **Recommendation**: Bake the 12 icons as inline SVGs (or an SVG sprite). Drop Material Symbols entirely.
- **Fix command**: `/optimize`.

### Low-Severity Issues

#### L1. `text-[10px]` UPPERCASE labels
- Repeated as "uppercase tracking-wider" 10 px label — SaaS-template fingerprint. Demote to `text-xs` regular weight for less templated feel.

#### L2. `font-mono` used for delta numbers
- `routes/index.tsx:348`. The skill flags monospace-as-technical-vibes. Use tabular-nums of the body font instead: `font-variant-numeric: tabular-nums;`.

#### L3. `divide-border-default` between recent-entries rows
- Common shadcn-template detail; consider grid/asymmetric instead of horizontal rules.

#### L4. `font-heading` and `font-body` used inconsistently
- e.g., chart labels and KPI values both use heading font; nav labels use body. Inconsistent rules.

#### L5. CSS variables alphabetised but not grouped semantically
- `app.css` has tokens loosely grouped; missing `--color-chart-*`, `--shadow-*`, `--easing-*`.

#### L6. Bell badge contrast
- `Header.tsx:37` `bg-brand text-surface-0` — `surface-0` is not defined. Probably renders as transparent/inherit. Visual bug.

#### L7. Hard-coded `'#666'` and `'#888'` in `AccountFilterBar.tsx`
- Just introduced. Replace with `var(--color-text-muted)` / `var(--color-text-secondary)`.

#### L8. PWA precache 1408 KB
- Generated SW precaches everything; many splash images are device-specific and could be excluded for desktop installs.

#### L9. No reduced-motion guard around framer-motion
- The whole app ignores `prefers-reduced-motion`. WCAG 2.3.3 (Animation from Interactions, AAA).

#### L10. `pb-24` / `pb-20` magic numbers for bottom-nav clearance
- Several routes hard-code `pb-20` to compensate for the BottomNav. Convert to `--nav-height` token + `pb-[calc(var(--nav-height)+env(safe-area-inset-bottom))]`.

---

## Patterns & Systemic Issues

1. **Token bypass**: hex literals exist in 7+ source files — chart palettes, fallbacks, gradient stops, glow shadow. The token system is set up but only enforced in CSS, not in JSX/recharts. Single biggest theming risk.
2. **`glass-card` overuse**: applied as default container reflex. Removing it from non-critical surfaces (cards, modals, header) would simplify the visual language and reclaim performance.
3. **Touch targets consistently below 44 px** on every chip / icon-button cluster — year selector, filter bar, header icons, year toggles. Mobile is the primary platform; this needs a sweep.
4. **Locale leak** — `'it-IT'` hard-coded in date helpers across pages despite a wired-up i18n.
5. **Centered hero / centered auth / centered empty-states** — every screen recovers to dead-centre composition. No design point of view.
6. **Decorative motion** — spring counter, gradient fade-ins, layout-id transitions, glow shadows. The app moves a lot for an interface that should feel like a calm ledger.

---

## Positive Findings

- **Tokenized colour and font in `@theme`** — Tailwind v4 CSS-first setup is clean; only the JSX bypass spoils it.
- **Form inputs have associated labels via auto-id** (`Input.tsx:11`) — good baseline a11y.
- **Routing layer auth-gating** in `__root.tsx` with explicit AUTH_PATHS / FULLSCREEN_PATHS — correct pattern.
- **i18next set up** with two languages, dynamic switch.
- **Card with onClick** properly forwards `role="button"`, `tabIndex`, and `Enter`/`Space` handlers — good a11y intent.
- **ARIA labels** on Bell + Admin shield + every nav button — keyboard-only users get reasonable feedback.
- **Skeleton loaders** instead of spinners — non-jarring loading state.
- **Service-worker + Dexie offline cache** — real PWA behaviour, not lip-service.
- **PWA icons + apple splash screens completely set up** — production-ready.
- **AccountFilterBar (just added)**: multi-select with `aria-multiselectable`, `role="listbox"/"option"`, keyboard reachable, hides itself when ≤1 active account. Good a11y from the start.

---

## Recommendations by Priority

### Immediate (this week)
1. **Fix light-theme contrast** — replace `--color-text-muted` for `html.light`, audit `text-gold` and KPI labels.
2. **Touch targets** — add `min-h-11 min-w-11` to chip/icon-button surfaces.
3. **Hard-coded hex** — sweep `analytics.tsx`, `routes/index.tsx`, `AccountFilterBar.tsx`.
4. **Locale leak** — read i18n.language inside `formatMonth` helpers.
5. **Sticky stack** — fix `AccountFilterBar` `top` offset to sit below the header.

### Short-term (this sprint)
6. **Bundle split** — lazy-load admin / analytics / history routes.
7. **Replace dashboard sparkline with hand-rolled SVG** — drop recharts from home critical path.
8. **Drop framer-motion from `Button.tsx`** — switch to `active:scale-[0.97]`.
9. **Add `<a href="#main">` skip link**, `aria-describedby` on Input errors, `:focus-visible` rings on interactive cards.
10. **Drop Material Symbols CDN** — inline SVG sprite for the 12 account icons.
11. **Year-pill component extraction** — single source of truth for year-selectors.
12. **Color-blind hardening** — add ↑/↓ glyphs to delta amounts.

### Medium-term (next sprint)
13. **Visual identity overhaul** — pick a real aesthetic direction (editorial / brutalist / luxury etc.) and rebuild palette + type pair + hero layout. Without this, "polish" still leaves it AI-shaped.
14. **Container queries** for analytics charts at desktop breakpoints.
15. **Replace AccountFormModal with full-screen route** on mobile (consistent with `/new-entry`).
16. **`prefers-reduced-motion` guard** across all framer-motion usage.
17. **Spacing tokens via `clamp()`** for fluid rhythm.

### Long-term
18. Code-split queries.ts into per-domain hook files.
19. Progressive disclosure on Settings (currently 929-line monolith).
20. PWA precache trim (per-device manifest).

---

## Suggested Commands for Fixes

| Issue cluster | Count | Command | Notes |
|---|---:|---|---|
| Light-mode contrast, touch targets, ARIA, focus rings, status colours, locale leak, error-id linking, year-toggle no-feedback, `prefers-reduced-motion` | 12 | `/harden` | i18n + a11y sweep |
| Hard-coded hex → tokens, `radius-[var(...)]` → Tailwind classes, hue-tinted neutrals, button hierarchy audit | 9 | `/normalize` | design-system alignment |
| Bundle split / lazy routes / drop framer-motion from Button / inline SVG icons / drop Material Symbols / FOUC fix | 6 | `/optimize` | performance pass |
| Glassmorphism reduction, glow trim, gradient overlay drop, decorative-motion trim | 5 | `/quieter` + `/simplify` | calm down the visual language |
| Hero rebuild, KPI grid duplication, type pair, centered template, palette identity | 5 | `/bolder` | requires aesthetic decision before fixing |
| Container queries, AccountFormModal → full-screen route on mobile | 2 | `/adapt` | responsive pass |
| Year-pill extraction, queries.ts split | 2 | `/extract` (or manual) | refactor |

---

_End of audit. Read top-down, fix bottom-up._
