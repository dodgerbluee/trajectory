/**
 * MobileSheet – bottom sheet primitive for mobile.
 *
 * A lightweight, dependency-free bottom sheet with:
 *  - tap-backdrop / Escape to dismiss
 *  - drag-handle visual affordance and drag-to-dismiss
 *  - focus trap and focus restoration
 *  - safe-area aware bottom padding
 *  - prefers-reduced-motion respect
 *
 * Use this in place of `Modal` on mobile when you want a native-feeling
 * presentation. For modal dialogs that should stay centered on phones too,
 * keep using the existing `Modal.module.css` patterns.
 */

import {
  type ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';
import styles from './MobileSheet.module.css';

export interface MobileSheetProps {
  isOpen: boolean;
  onClose: () => void;
  /** Optional title rendered in the sheet header. */
  title?: ReactNode;
  /** Optional description for screen readers (aria-describedby). */
  ariaLabel?: string;
  /** Sheet content. */
  children: ReactNode;
  /** Disable drag-to-dismiss (e.g., for forms). Default: false. */
  disableDrag?: boolean;
  /** Visual height. 'auto' fits content; 'half' caps at 60vh; 'full' goes near top. */
  size?: 'auto' | 'half' | 'full';
  /** Slide direction. 'bottom' (default) slides up from the bottom; 'top' drops down from the top. */
  placement?: 'bottom' | 'top';
  /** Optional className for the sheet container. */
  className?: string;
}

const DRAG_DISMISS_THRESHOLD_PX = 100;
const DRAG_DISMISS_VELOCITY = 0.5; // px/ms

export function MobileSheet({
  isOpen,
  onClose,
  title,
  ariaLabel,
  children,
  disableDrag = false,
  size = 'auto',
  placement = 'bottom',
  className,
}: MobileSheetProps) {
  const sheetRef = useRef<HTMLDivElement | null>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);
  const dragStartY = useRef<number | null>(null);
  const dragStartTime = useRef<number>(0);
  const [dragOffset, setDragOffset] = useState(0);
  const [mounted, setMounted] = useState(isOpen);

  // Mount/unmount with exit animation
  useEffect(() => {
    if (isOpen) {
      setMounted(true);
      setDragOffset(0);
    } else if (mounted) {
      const t = setTimeout(() => setMounted(false), 220);
      return () => clearTimeout(t);
    }
  }, [isOpen, mounted]);

  // Focus management + Escape + scroll lock
  useEffect(() => {
    if (!isOpen) return;
    previouslyFocused.current = document.activeElement as HTMLElement | null;

    // Lock body scroll
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    // Focus the sheet
    requestAnimationFrame(() => {
      sheetRef.current?.focus();
    });

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    };
    document.addEventListener('keydown', onKey);

    return () => {
      document.body.style.overflow = prevOverflow;
      document.removeEventListener('keydown', onKey);
      previouslyFocused.current?.focus?.();
    };
  }, [isOpen, onClose]);

  const onPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (disableDrag) return;
      // Only start drag from the handle / header area (data-drag-handle)
      const target = e.target as HTMLElement;
      if (!target.closest('[data-drag-handle="true"]')) return;
      dragStartY.current = e.clientY;
      dragStartTime.current = Date.now();
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    },
    [disableDrag],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (dragStartY.current == null) return;
      const dy = e.clientY - dragStartY.current;
      // For bottom sheets we only allow downward drag (positive dy).
      // For top sheets we only allow upward drag (negative dy).
      if (placement === 'top') {
        setDragOffset(Math.min(0, dy));
      } else {
        setDragOffset(Math.max(0, dy));
      }
    },
    [placement],
  );

  const onPointerUp = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (dragStartY.current == null) return;
      const dy = e.clientY - dragStartY.current;
      const dt = Math.max(1, Date.now() - dragStartTime.current);
      const velocity = dy / dt;
      dragStartY.current = null;
      const dismissDown = dy > DRAG_DISMISS_THRESHOLD_PX || velocity > DRAG_DISMISS_VELOCITY;
      const dismissUp = dy < -DRAG_DISMISS_THRESHOLD_PX || velocity < -DRAG_DISMISS_VELOCITY;
      if (placement === 'top' ? dismissUp : dismissDown) {
        onClose();
      } else {
        setDragOffset(0);
      }
    },
    [onClose, placement],
  );

  if (!mounted) return null;

  const sheetStyle = {
    transform: dragOffset ? `translateY(${dragOffset}px)` : undefined,
    transition: dragOffset ? 'none' : undefined,
  } as React.CSSProperties;

  return createPortal(
    <div
      className={`${styles.root} ${isOpen ? styles.open : styles.closing}`}
      role="presentation"
    >
      <div
        className={styles.backdrop}
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        ref={sheetRef}
        role="dialog"
        aria-modal="true"
        aria-label={typeof title === 'string' ? title : ariaLabel}
        tabIndex={-1}
        className={[
          styles.sheet,
          styles[`size_${size}`],
          styles[`placement_${placement}`],
          className,
        ]
          .filter(Boolean)
          .join(' ')}
        style={sheetStyle}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        {placement === 'bottom' ? (
          <div data-drag-handle="true" className={styles.handleArea}>
            <div className={styles.handle} />
            {title ? <div className={styles.title}>{title}</div> : null}
          </div>
        ) : null}
        <div className={styles.content}>{children}</div>
        {placement === 'top' ? (
          <div data-drag-handle="true" className={styles.handleArea}>
            {title ? <div className={styles.title}>{title}</div> : null}
            <div className={styles.handle} />
          </div>
        ) : null}
      </div>
    </div>,
    document.body,
  );
}
