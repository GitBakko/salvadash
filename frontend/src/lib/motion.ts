/**
 * Shared motion language — Aurora revamp (subtle-pro).
 *
 * Centralizes framer-motion variants, easing and spring presets so every
 * surface reuses the same orchestrated entrance/transition vocabulary instead
 * of ad-hoc inline `{ opacity, y }` + hardcoded delays.
 *
 * Reduced-motion is handled GLOBALLY via `<MotionConfig reducedMotion="user">`
 * in main.tsx — framer-motion strips transform/layout animations (keeps
 * opacity) when the user prefers reduced motion, so variants here are written
 * for the full-motion case and need no per-call guards.
 *
 * Principles: transform + opacity only (60fps), 150–400ms, ease-out for
 * entrances. Mirrors the `--ease-out-*` tokens in app.css.
 */
import type { Variants, Transition } from 'framer-motion';

// ─── Easing (mirror of app.css --ease-out-quart / --ease-out-expo) ──────────
export const EASE_OUT_QUART: [number, number, number, number] = [0.25, 1, 0.5, 1];
export const EASE_OUT_EXPO: [number, number, number, number] = [0.16, 1, 0.3, 1];

// ─── Durations (seconds) ────────────────────────────────────────────────────
export const DURATION = {
  fast: 0.15,
  base: 0.2,
  slow: 0.3,
  entrance: 0.4,
} as const;

// ─── Spring presets ─────────────────────────────────────────────────────────
export const SPRING = {
  /** snappy UI feedback — nav indicator, small pops */
  snappy: { type: 'spring', stiffness: 400, damping: 30 } as Transition,
  /** sheets / drawers */
  gentle: { type: 'spring', stiffness: 300, damping: 30 } as Transition,
  /** soft, larger movements */
  soft: { type: 'spring', stiffness: 200, damping: 26 } as Transition,
};

// ─── Base transitions ───────────────────────────────────────────────────────
export const entrance: Transition = { duration: DURATION.entrance, ease: EASE_OUT_EXPO };
export const quick: Transition = { duration: DURATION.base, ease: EASE_OUT_QUART };

// ─── Variants ───────────────────────────────────────────────────────────────
export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: DURATION.slow, ease: EASE_OUT_QUART } },
};

export const fadeInUp: Variants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: entrance },
};

export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.96 },
  visible: { opacity: 1, scale: 1, transition: { duration: DURATION.slow, ease: EASE_OUT_EXPO } },
};

/**
 * Stagger container — orchestrates child `staggerItem` entrances. Replaces
 * per-element hardcoded delays. Use with `initial="hidden" animate="visible"`.
 */
export function staggerContainer(stagger = 0.06, delayChildren = 0.04): Variants {
  return {
    hidden: {},
    visible: { transition: { staggerChildren: stagger, delayChildren } },
  };
}

/** Default stagger child — fade + rise. */
export const staggerItem: Variants = fadeInUp;

/** List item that can also animate out (AnimatePresence lists). */
export const listItem: Variants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: entrance },
  exit: { opacity: 0, y: -12, transition: quick },
};

/** Route outlet page transition. */
export const pageTransition: Variants = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: quick },
  exit: { opacity: 0, y: -8, transition: { duration: DURATION.fast, ease: 'easeIn' } },
};

// ─── Overlay / sheet / modal ─────────────────────────────────────────────────
export const overlayFade: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
  exit: { opacity: 0 },
};

export const sheet: Variants = {
  hidden: { y: '100%' },
  visible: { y: 0, transition: SPRING.gentle },
  exit: { y: '100%', transition: quick },
};

export const modalPop: Variants = {
  hidden: { opacity: 0, scale: 0.96, y: 8 },
  visible: { opacity: 1, scale: 1, y: 0, transition: SPRING.snappy },
  exit: { opacity: 0, scale: 0.98, y: 4, transition: { duration: DURATION.fast } },
};
