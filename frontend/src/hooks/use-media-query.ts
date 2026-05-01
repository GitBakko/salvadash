import { useEffect, useState } from 'react';

/**
 * Reactive media-query hook. Subscribes to changes so the matched value
 * updates when viewport crosses the breakpoint (e.g. user resizes window
 * or rotates a device).
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() =>
    typeof window === 'undefined' ? false : window.matchMedia(query).matches,
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia(query);
    const onChange = () => setMatches(mq.matches);
    mq.addEventListener('change', onChange);
    // Sync once on mount in case query changed
    setMatches(mq.matches);
    return () => mq.removeEventListener('change', onChange);
  }, [query]);

  return matches;
}
