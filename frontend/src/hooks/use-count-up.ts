import { useEffect, useRef, useState } from 'react';
import { usePrefersReducedMotion } from './use-prefers-reduced-motion';

/**
 * Animates a number from its previous value up to `target` using an
 * ease-out-expo curve. Returns the live value to render.
 *
 * Reduced-motion aware: jumps straight to `target` (no animation) when the
 * user prefers reduced motion. Subsequent target changes animate from the
 * previously displayed value, so updates feel continuous.
 */
export function useCountUp(target: number, durationMs = 900): number {
  const reduced = usePrefersReducedMotion();
  const [value, setValue] = useState(target);
  const fromRef = useRef(target);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (reduced) {
      fromRef.current = target;
      setValue(target);
      return;
    }
    const from = fromRef.current;
    const delta = target - from;
    if (delta === 0) {
      setValue(target);
      return;
    }
    let startTs: number | null = null;
    const tick = (ts: number) => {
      if (startTs === null) startTs = ts;
      const progress = Math.min((ts - startTs) / durationMs, 1);
      const eased = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      setValue(from + delta * eased);
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        fromRef.current = target;
      }
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [target, durationMs, reduced]);

  return reduced ? target : value;
}
