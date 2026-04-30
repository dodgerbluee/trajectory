/**
 * ChildChipRow – horizontally scrollable row of child avatars (story-rail style).
 *
 * Used at the top of the mobile home feed to scope the rest of the feed to a
 * single child. When `selectedId` is null the feed shows everyone; selecting a
 * child highlights their avatar with a colored ring. The "Show all" affordance
 * to clear the filter lives in the greeting row above the rail (rendered by
 * MobileHomeFeed) so it sits visually next to the page title rather than
 * fighting the avatar rail for horizontal space.
 *
 * Long-press (≥500ms) on a chip navigates to that child's detail page; a
 * normal tap toggles the filter as before.
 */

import { useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Child } from '@shared/types/api';
import { ChildAvatar } from '@features/children';
import { sortChildrenWithAdultsLast } from '../lib/profile-order';
import styles from './ChildChipRow.module.css';

const LONG_PRESS_MS = 500;
const MOVE_TOLERANCE_PX = 8;

interface ChildChipRowProps {
  childrenList: Child[];
  selectedId: number | null;
  onSelect: (id: number | null) => void;
}

function ChildChipRow({ childrenList, selectedId, onSelect }: ChildChipRowProps) {
  const navigate = useNavigate();
  const timerRef = useRef<number | null>(null);
  const startRef = useRef<{ x: number; y: number } | null>(null);
  const longFiredRef = useRef(false);

  // Adults (18+) sort to the end of the chip row so kid avatars take the
  // visible left-edge real estate on first paint.
  const orderedChildren = useMemo(
    () => sortChildrenWithAdultsLast(childrenList),
    [childrenList]
  );

  if (orderedChildren.length === 0) return null;

  const clearTimer = () => {
    if (timerRef.current != null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const startLongPress = (childId: number, x: number, y: number) => {
    clearTimer();
    longFiredRef.current = false;
    startRef.current = { x, y };
    timerRef.current = window.setTimeout(() => {
      longFiredRef.current = true;
      timerRef.current = null;
      // Haptic nudge if available
      try {
        if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
          (navigator as Navigator & { vibrate: (p: number) => boolean }).vibrate(15);
        }
      } catch {
        /* no-op */
      }
      navigate(`/people/${childId}`);
    }, LONG_PRESS_MS);
  };

  const cancelIfMoved = (x: number, y: number) => {
    if (!startRef.current) return;
    const dx = Math.abs(x - startRef.current.x);
    const dy = Math.abs(y - startRef.current.y);
    if (dx > MOVE_TOLERANCE_PX || dy > MOVE_TOLERANCE_PX) {
      clearTimer();
      startRef.current = null;
    }
  };

  return (
    <div className={styles.wrap}>
      <div
        className={`${styles.row} ${orderedChildren.length > 3 ? styles.rowCentered : ''}`}
        role="tablist"
        aria-label="Filter by child"
      >
        {orderedChildren.map((child) => {
          const isActive = selectedId === child.id;
          const firstName = child.name?.split(' ')[0] || child.name;
          return (
            <button
              key={child.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              aria-label={`Show only ${firstName}. Long-press to open ${firstName}'s page.`}
              className={`${styles.cell} ${isActive ? styles.active : ''}`}
              onPointerDown={(e) => startLongPress(child.id, e.clientX, e.clientY)}
              onPointerMove={(e) => cancelIfMoved(e.clientX, e.clientY)}
              onPointerUp={() => {
                clearTimer();
                startRef.current = null;
              }}
              onPointerCancel={() => {
                clearTimer();
                startRef.current = null;
              }}
              onContextMenu={(e) => {
                // Suppress the long-press context menu on touch devices.
                if (longFiredRef.current) e.preventDefault();
              }}
              onClick={(e) => {
                // If long-press already navigated, swallow the tap.
                if (longFiredRef.current) {
                  e.preventDefault();
                  longFiredRef.current = false;
                  return;
                }
                onSelect(isActive ? null : child.id);
              }}
            >
              <span className={styles.avatarRing}>
                <ChildAvatar
                  avatar={child.avatar}
                  gender={child.gender}
                  alt=""
                  className={styles.avatar}
                />
              </span>
              <span className={styles.name}>{firstName}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default ChildChipRow;
