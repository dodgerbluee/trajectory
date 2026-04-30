import { useEffect, useRef } from 'react';
import { useLocation, useNavigationType } from 'react-router-dom';

/**
 * Mounts once at the app root (Layout) to give the SPA browser-native scroll
 * behavior across route changes:
 *
 * - PUSH/REPLACE navigation (link clicks, programmatic navigates): scroll to top.
 * - POP navigation (browser back/forward, mobile edge-swipe back, hardware back):
 *   restore the scroll position the user was at when they left that route.
 *
 * Skips hash-anchor navigation so in-page #section links keep working.
 *
 * Positions are kept in an in-memory Map keyed by location.key. The Map resets
 * on full page reload, which matches what the user expects after a hard refresh.
 */
export function useScrollRestoration() {
  const location = useLocation();
  const navigationType = useNavigationType();
  const positions = useRef<Map<string, number>>(new Map());

  // Save the leaving page's scroll position when location.key changes.
  useEffect(() => {
    const leavingKey = location.key;
    const map = positions.current;
    return () => {
      map.set(leavingKey, window.scrollY);
    };
  }, [location.key]);

  // After navigation: restore on POP, else scroll to top.
  useEffect(() => {
    if (location.hash) return; // browser handles #anchor jumps natively
    if (navigationType === 'POP') {
      const saved = positions.current.get(location.key) ?? 0;
      window.scrollTo(0, saved);
    } else {
      window.scrollTo(0, 0);
    }
  }, [location.key, location.hash, navigationType]);
}
