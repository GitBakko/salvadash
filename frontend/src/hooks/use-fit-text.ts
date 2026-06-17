import { useCallback, useLayoutEffect, useRef, useState } from 'react';

interface FitTextOptions {
  /** Max font size in px (the design ceiling). */
  max?: number;
  /** Min font size in px (never shrink below this). */
  min?: number;
}

interface FitTextResult<T extends HTMLElement> {
  ref: React.RefObject<T | null>;
  fontSize: number;
  /** Re-measure on demand (e.g. after the displayed value changes). */
  refit: () => void;
}

/**
 * Fit-to-width: scales an element's font-size down so its content fits on one
 * line, never growing past `max`. Robust for arbitrary magnitudes (e.g. a large
 * patrimony amount) where a viewport-based `clamp()` would still overflow,
 * because it reacts to the actual rendered width, not the viewport.
 *
 * The target element must be `white-space: nowrap` so its natural (overflow)
 * width can be measured. Re-measures via ResizeObserver on the element's box.
 */
export function useFitText<T extends HTMLElement = HTMLDivElement>({
  max = 88,
  min = 28,
}: FitTextOptions = {}): FitTextResult<T> {
  const ref = useRef<T | null>(null);
  const [fontSize, setFontSize] = useState(max);

  const measure = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    // Lay out at max, then scale down by the overflow ratio in one pass.
    el.style.fontSize = `${max}px`;
    const available = el.clientWidth;
    const natural = el.scrollWidth;
    if (natural > available && available > 0) {
      const next = Math.max(min, Math.floor((max * available) / natural));
      el.style.fontSize = `${next}px`;
      setFontSize(next);
    } else {
      setFontSize(max);
    }
  }, [max, min]);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    measure();
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => measure());
    ro.observe(el);
    return () => ro.disconnect();
  }, [measure]);

  return { ref, fontSize, refit: measure };
}
