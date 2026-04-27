/**
 * useMediaQuery – SSR-safe React hook backed by window.matchMedia.
 *
 * Prefer pure CSS for responsive behavior. Reach for this hook only when JS
 * branching is unavoidable (e.g., rendering an entirely different component
 * tree on mobile vs. desktop, such as `BottomTabBar` vs. top nav).
 *
 * Breakpoints mirror the `--bp-*` tokens in `tokens.css`. Keep the numeric
 * values here in sync with the CSS source of truth.
 */

import { useEffect, useState } from 'react';

/**
 * Returns whether the given media query currently matches.
 * Returns `false` during SSR / before hydration.
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState<boolean>(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return false;
    return window.matchMedia(query).matches;
  });

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mql = window.matchMedia(query);
    const handler = (e: MediaQueryListEvent) => setMatches(e.matches);

    // Sync on mount in case state is stale (e.g., SSR -> hydrate).
    setMatches(mql.matches);

    // Modern API – Safari 14+, all evergreen browsers.
    if (mql.addEventListener) {
      mql.addEventListener('change', handler);
      return () => mql.removeEventListener('change', handler);
    }
    // Legacy fallback (older Safari).
    mql.addListener(handler);
    return () => mql.removeListener(handler);
  }, [query]);

  return matches;
}

/** True on phones (<768px). Mirrors `--bp-lg` token. */
export function useIsMobile(): boolean {
  return useMediaQuery('(max-width: 767px)');
}

/** True on tablet-and-up (>=768px). */
export function useIsTabletUp(): boolean {
  return useMediaQuery('(min-width: 768px)');
}

/** True on tablet only (768px–1023px). */
export function useIsTablet(): boolean {
  return useMediaQuery('(min-width: 768px) and (max-width: 1023px)');
}

/** True on desktop (>=1024px). Mirrors `--bp-xl` token. */
export function useIsDesktop(): boolean {
  return useMediaQuery('(min-width: 1024px)');
}

/** True when the user prefers reduced motion. */
export function usePrefersReducedMotion(): boolean {
  return useMediaQuery('(prefers-reduced-motion: reduce)');
}
