/**
 * PullToRefresh – minimal touch-driven pull-to-refresh wrapper.
 *
 * - Activates only when the wrapped scroll container is at scrollTop === 0
 *   and the user pulls down with a primary touch.
 * - Caps drag distance and applies progressive resistance.
 * - Calls `onRefresh` once the pull crosses the threshold and the touch ends.
 * - No-ops on non-touch (desktop) input — falls through to normal scroll.
 * - Honors `prefers-reduced-motion`: skips the elastic transform but still
 *   triggers the refresh on a sufficient pull.
 */

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { usePrefersReducedMotion } from '@shared/hooks/useMediaQuery';
import styles from './PullToRefresh.module.css';

interface PullToRefreshProps {
  onRefresh: () => Promise<void> | void;
  children: ReactNode;
  /** Pixel distance at which a release will trigger refresh. Default 64. */
  threshold?: number;
  /** Maximum pull distance regardless of finger travel. Default 96. */
  maxPull?: number;
  /** Disable the gesture entirely (e.g., on desktop). */
  disabled?: boolean;
}

function PullToRefresh({
  onRefresh,
  children,
  threshold = 64,
  maxPull = 96,
  disabled = false,
}: PullToRefreshProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const startYRef = useRef<number | null>(null);
  const activeRef = useRef(false);
  const [pull, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const reducedMotion = usePrefersReducedMotion();

  useEffect(() => {
    const el = containerRef.current;
    if (!el || disabled) return;

    const onTouchStart = (e: TouchEvent) => {
      if (refreshing) return;
      if (el.scrollTop > 0) {
        startYRef.current = null;
        return;
      }
      if (e.touches.length !== 1) return;
      startYRef.current = e.touches[0].clientY;
      activeRef.current = false;
    };

    const onTouchMove = (e: TouchEvent) => {
      if (refreshing || startYRef.current == null) return;
      const dy = e.touches[0].clientY - startYRef.current;
      if (dy <= 0) {
        if (activeRef.current) setPull(0);
        activeRef.current = false;
        return;
      }
      // Only treat as PTR if user starts dragging downward at top.
      if (el.scrollTop > 0) {
        startYRef.current = null;
        if (activeRef.current) setPull(0);
        activeRef.current = false;
        return;
      }
      activeRef.current = true;
      // Resistance curve: ease-out toward maxPull
      const eased = maxPull * (1 - Math.exp(-dy / maxPull));
      setPull(eased);
      // Prevent the page from rubber-banding while we own the gesture.
      if (e.cancelable) e.preventDefault();
    };

    const finish = async () => {
      const triggered = pull >= threshold;
      startYRef.current = null;
      activeRef.current = false;
      if (triggered) {
        setRefreshing(true);
        setPull(threshold);
        try {
          await onRefresh();
        } finally {
          setRefreshing(false);
          setPull(0);
        }
      } else {
        setPull(0);
      }
    };

    const onTouchEnd = () => {
      if (!activeRef.current && pull === 0) return;
      void finish();
    };

    el.addEventListener('touchstart', onTouchStart, { passive: true });
    el.addEventListener('touchmove', onTouchMove, { passive: false });
    el.addEventListener('touchend', onTouchEnd, { passive: true });
    el.addEventListener('touchcancel', onTouchEnd, { passive: true });
    return () => {
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchmove', onTouchMove);
      el.removeEventListener('touchend', onTouchEnd);
      el.removeEventListener('touchcancel', onTouchEnd);
    };
  }, [disabled, refreshing, pull, threshold, maxPull, onRefresh]);

  const visible = pull > 0 || refreshing;
  const progress = Math.min(1, pull / threshold);

  return (
    <div ref={containerRef} className={styles.container}>
      <div
        className={styles.indicator}
        aria-hidden={!visible}
        style={{
          opacity: visible ? 1 : 0,
          transform: reducedMotion
            ? undefined
            : `translateY(${Math.max(0, pull - 24)}px)`,
        }}
      >
        <span
          className={`${styles.spinner} ${refreshing ? styles.spinning : ''}`}
          style={{
            transform: refreshing
              ? undefined
              : `rotate(${progress * 270}deg)`,
          }}
        />
      </div>
      <div
        className={styles.content}
        style={{
          transform:
            reducedMotion || (!visible && !refreshing)
              ? undefined
              : `translateY(${pull}px)`,
          transition: activeRef.current ? 'none' : 'transform 200ms ease-out',
        }}
      >
        {children}
      </div>
    </div>
  );
}

export default PullToRefresh;
